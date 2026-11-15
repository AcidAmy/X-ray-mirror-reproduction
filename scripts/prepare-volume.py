"""Build a small, reproducible teaching volume from the official ICBM 2009c symmetric zip.
Usage: python3 scripts/prepare-volume.py /path/to/mni_icbm152_nlin_sym_09c_nifti.zip
Requires numpy and scipy. No patient data; input is a population-average atlas.
"""
from pathlib import Path
import sys, json, zipfile, gzip, struct, hashlib
import numpy as np
from scipy.ndimage import map_coordinates
ROOT = Path(__file__).resolve().parent.parent
archive = Path(sys.argv[1])
z = zipfile.ZipFile(archive)

def nifti(suffix):
    names = [n for n in z.namelist() if n.endswith(suffix + '.nii') or n.endswith(suffix + '.nii.gz')]
    if len(names) != 1: raise ValueError(f'Expected one {suffix}: {names}')
    raw = z.read(names[0])
    if names[0].endswith('.gz'): raw = gzip.decompress(raw)
    endian = '<' if struct.unpack('<i', raw[:4])[0] == 348 else '>'
    unpack = lambda fmt, at: struct.unpack_from(endian + fmt, raw, at)
    dims = unpack('8h', 40)
    if dims[0] != 3 or unpack('h', 254)[0] == 0: raise ValueError('Requires 3D NIfTI with sform')
    dtype = {2:'u1', 4:'i2', 8:'i4', 16:'f4', 64:'f8', 512:'u2'}[unpack('h', 70)[0]]
    arr = np.frombuffer(raw, dtype=endian+dtype, count=int(np.prod(dims[1:4])), offset=int(unpack('f', 108)[0])).reshape(dims[1:4], order='F').astype(np.float32)
    slope, intercept = unpack('2f', 112)
    if slope: arr = arr * slope + intercept
    affine = np.eye(4); affine[:3] = np.array(unpack('12f', 280)).reshape(3,4)
    return arr, affine, names[0]

t1, affine, name = nifti('_t1_tal_nlin_sym_09c')
mask, ma, _ = nifti('_t1_tal_nlin_sym_09c_mask')
probs = [nifti('_'+part+'_tal_nlin_sym_09c') for part in ['csf','gm','wm']]
for arr, a, _ in probs + [(mask,ma,'mask')]:
    if arr.shape != t1.shape or not np.allclose(a, affine): raise ValueError('Source grids differ')
# NIfTI world RAS mm -> model LAS (left, superior, anterior) cm.
orient = np.array([[-.1,0,0,0],[0,0,.1,0],[0,.1,0,0],[0,0,0,1.]])
source_to_lsa = orient @ affine
brain = np.argwhere(mask > .5)
world = brain @ source_to_lsa[:3,:3].T + source_to_lsa[:3,3]
slo, shi = world.min(0), world.max(0)
meta = json.loads((ROOT/'public/anatomy/meta.json').read_text())
meshes = {m['name']:m for m in meta['meshes']}
parts = [meshes[n] for n in ['cerebrum','hindbrain']]
tlo = np.min([m['min'] for m in parts],axis=0); thi = np.max([np.array(m['min'])+m['size'] for m in parts],axis=0)
# Coarse affine registration: match brain-mask bounds to the union of brain meshes.
# This preserves axis orientation but does NOT establish local anatomical correspondence.
scale = (thi-tlo)/(shi-slo); shift = tlo-scale*slo
registration = np.eye(4); registration[:3,:3] = np.diag(scale); registration[:3,3] = shift
voxel_to_model = registration @ source_to_lsa
model_to_voxel = np.linalg.inv(voxel_to_model)
origin = np.floor(np.array(meshes['skin']['min'])/.2)*.2
upper = np.ceil((np.array(meshes['skin']['min'])+meshes['skin']['size'])/.2)*.2
shape = (np.round((upper-origin)/.2).astype(int)+1)
# Output x fastest, then y, then z; keep the full head bounds even when source coverage is incomplete.
zz,yy,xx = np.indices(tuple(shape[::-1]),dtype=np.float32)
points = np.stack([origin[0]+xx.ravel()*.2,origin[1]+yy.ravel()*.2,origin[2]+zz.ravel()*.2])
coords = model_to_voxel[:3,:3] @ points + model_to_voxel[:3,3,None]
intensity = map_coordinates(t1,coords,order=1,mode='constant',cval=0)
window = float(np.percentile(t1[mask>.5],99.5))
image = np.clip(np.rint(intensity/window*255),0,255).astype('u1')
p = np.stack([map_coordinates(arr,coords,order=1,mode='constant',cval=0) for arr,_,_ in probs])
labels = (np.argmax(p,axis=0)+1).astype('u1')
labels[(p.max(axis=0)<.25) | (map_coordinates(mask,coords,order=0,mode='constant',cval=0)<.5)] = 0
out = ROOT/'public/volume'; out.mkdir(exist_ok=True)
payload = image.tobytes()+labels.tobytes(); (out/'icbm152.bin').write_bytes(payload)
report = {'version':1,'name':'ICBM152 2009c symmetric T1 MRI','source':'https://nist.mni.mcgill.ca/icbm-152-nonlinear-atlases-2009/',
 'download':'https://www.bic.mni.mcgill.ca/~vfonov/icbm/2009/mni_icbm152_nlin_sym_09c_nifti.zip',
 'anatomyMetaSha256':hashlib.sha256((ROOT/'public/anatomy/meta.json').read_bytes()).hexdigest(),
 'sourceArchiveSha256':hashlib.sha256(archive.read_bytes()).hexdigest(),'sourceFile':name,
 'dimensions':shape.tolist(),'origin':origin.tolist(),'spacing':[.2,.2,.2],'layout':'uint8 intensity then uint8 tissue, x fastest',
 'sha256':hashlib.sha256(payload).hexdigest(),'byteLength':len(payload),'labels':{'0':'unlabelled','1':'CSF','2':'grey matter','3':'white matter'},
 'sourceVoxelToRASmm':affine.tolist(),'sourceVoxelToModelCm':voxel_to_model.tolist(),'modelCmToSourceVoxel':model_to_voxel.tolist(),
 'registration':{'method':'axis-aligned brain bounding-box affine; approximate teaching alignment only','scale':scale.tolist(),'translationCm':shift.tolist(),'sourceBrainBoundsCm':[slo.tolist(),shi.tolist()],'targetBrainBoundsCm':[tlo.tolist(),thi.tolist()]},
 'intensityWindow':[0,window],'notes':'Population-average real MRI, not an individual scan. Probability argmax labels require >=0.25 within brain mask. No local registration accuracy claimed.'}
(out/'meta.json').write_text(json.dumps(report,indent=2)+'\n')
# Retain the dataset's distributed attribution/license verbatim when provided.
for n in z.namelist():
    if any(k in Path(n).name.lower() for k in ['readme','license','copying']):
        (out/('SOURCE-'+Path(n).name)).write_bytes(z.read(n))
print(json.dumps(report,indent=2))
