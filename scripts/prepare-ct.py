"""Prepare the pinned DeepMind/TCIA public CT teaching sample (numpy + scipy).
Usage: python3 scripts/prepare-ct.py CT_IMAGE.nrrd Brain.nrrd
Download URLs and SHA256 checksums are retained in public/ct/meta.json.
The brain mask is used for coarse registration only, NOT tissue classification.
"""
from pathlib import Path
import sys, re, json, gzip, hashlib
import numpy as np
from scipy.ndimage import map_coordinates
ROOT=Path(__file__).resolve().parent.parent
COMMIT='2edb50947e50ef26e60b72dec89d36d71efe5549'
BASE=f'https://raw.githubusercontent.com/google-deepmind/tcia-ct-scan-dataset/{COMMIT}/nrrds/test/oncologist/0522c0017/'
def sha(data): return hashlib.sha256(data).hexdigest()
def read_nrrd(path):
    raw=path.read_bytes(); head,payload=raw.split(b'\n\n',1)
    fields={line.split(':',1)[0]:line.split(':',1)[1].strip() for line in head.decode().splitlines() if ':' in line and not line.startswith('#')}
    if fields['dimension']!='3' or fields['space']!='left-posterior-superior' or fields['encoding']!='gzip': raise ValueError('Unexpected source format')
    dtype={'double':'<f8','uint8':'u1'}[fields['type']]
    if fields.get('endian','little')!='little': raise ValueError('Unexpected endian')
    shape=tuple(map(int,fields['sizes'].split()))
    a=np.frombuffer(gzip.decompress(payload),dtype=dtype).reshape(shape,order='F')
    vectors=[list(map(float,x.split(','))) for x in re.findall(r'\(([^)]+)\)',fields['space directions'])]
    affine=np.eye(4);affine[:3,:3]=np.array(vectors).T
    affine[:3,3]=list(map(float,fields['space origin'].strip('()').split(',')))
    if not np.isfinite(a).all():raise ValueError('Non-finite source intensity')
    return a,affine,raw
image,affine,source=read_nrrd(Path(sys.argv[1]));mask,ma,mask_source=read_nrrd(Path(sys.argv[2]))
if image.shape!=mask.shape or not np.allclose(affine,ma):raise ValueError('Source grids differ')
# This released NRRD contains physical CT intensities; no per-slice DICOM transform is applied again.
# Check this specific pinned sample, so a differently encoded scan cannot silently be called HU.
expected=json.loads((ROOT/'public/ct/source.json').read_text())
if sha(source)!=expected['imageSha256'] or sha(mask_source)!=expected['brainSha256']:raise ValueError('Unexpected source checksum')
if not (-1100<float(np.median(image[:40,:40,:]))<-900 and -100<float(np.median(image[mask>0]))<100):raise ValueError('CT intensity sanity check failed')
# LPS mm -> model left/superior/anterior cm.
orient=np.array([[.1,0,0,0],[0,0,.1,0],[0,-.1,0,0],[0,0,0,1.]])
source_lsa=orient@affine
brain=np.argwhere(mask>0);world=brain@source_lsa[:3,:3].T+source_lsa[:3,3]
slo,shi=world.min(0),world.max(0)
anatomy_bytes=(ROOT/'public/anatomy/meta.json').read_bytes();meta=json.loads(anatomy_bytes)
meshes={m['name']:m for m in meta['meshes']};parts=[meshes[n] for n in ['cerebrum','hindbrain']]
tlo=np.min([m['min'] for m in parts],axis=0);thi=np.max([np.array(m['min'])+m['size'] for m in parts],axis=0)
scale=(thi-tlo)/(shi-slo);shift=tlo-scale*slo
registration=np.eye(4);registration[:3,:3]=np.diag(scale);registration[:3,3]=shift
voxel_to_model=registration@source_lsa;inverse=np.linalg.inv(voxel_to_model)
origin=np.floor(np.array(meshes['skin']['min'])/.2)*.2
upper=np.ceil((np.array(meshes['skin']['min'])+meshes['skin']['size'])/.2)*.2
shape=np.round((upper-origin)/.2).astype(int)+1
zz,yy,xx=np.indices(tuple(shape[::-1]),dtype=np.float32)
points=np.stack([origin[0]+xx.ravel()*.2,origin[1]+yy.ravel()*.2,origin[2]+zz.ravel()*.2])
coords=inverse[:3,:3]@points+inverse[:3,3,None]
valid=np.all((coords>=0)&(coords<=np.array(image.shape)[:,None]-1),axis=0)
hu=map_coordinates(image,coords,order=1,mode='constant',cval=-1024,prefilter=False)
if hu.min()<-32768 or hu.max()>32767:raise ValueError('int16 range exceeded')
payload=np.rint(hu).astype('<i2').tobytes()+valid.astype('u1').tobytes()
out=ROOT/'public/ct';(out/'head.bin').write_bytes(payload)
report={'version':2,'modality':'CT','units':'HU','name':'DeepMind TCIA head/neck CT teaching sample',
 'source':'https://github.com/google-deepmind/tcia-ct-scan-dataset','sourceCommit':COMMIT,'sample':'0522c0017',
 'download':BASE+'CT_IMAGE.nrrd','brainDownload':BASE+'segmentations/Brain.nrrd',**expected,
 'license':'CC BY 4.0 (official DeepMind redistribution)','anatomyMetaSha256':sha(anatomy_bytes),
 'dimensions':shape.tolist(),'origin':origin.tolist(),'spacing':[.2,.2,.2],
 'layout':'int16-le HU then uint8 coverage, x fastest','sha256':sha(payload),'byteLength':len(payload),
 'sourceDimensions':list(image.shape),'sourceSpacingMm':np.linalg.norm(affine[:3,:3],axis=0).tolist(),
 'sourceVoxelToLPSmm':affine.tolist(),'sourceVoxelToModelCm':voxel_to_model.tolist(),'modelCmToSourceVoxel':inverse.tolist(),
 'registration':{'method':'brain-mask bounds affine; approximate teaching alignment only','scale':scale.tolist(),'translationCm':shift.tolist(),'sourceBrainBoundsCm':[slo.tolist(),shi.tolist()],'targetBrainBoundsCm':[tlo.tolist(),thi.tolist()]},
 'intensity':{'method':'preserve released physical CT intensity; trilinear resampling then round to integer HU; no min/max normalization or extra slope/intercept',
 'sourceRange':[float(image.min()),float(image.max())],'airMedian':float(np.median(image[:40,:40,:])),'brainMedian':float(np.median(image[mask>0])),
 'evidence':'Published CT dataset and accompanying paper arXiv:1809.04430, section 4.4 (Hounsfield-unit intensities); released NRRD is already physical intensity. No original per-slice DICOM calibration metadata is distributed here.'},
 'notes':'Radiotherapy patient sample, not a healthy atlas or the visitor. No pairing with ICBM152. Mask only used for alignment; no CT tissue classification. HU readout is interpolated/resampled, not a diagnostic measurement.'}
(out/'meta.json').write_text(json.dumps(report,indent=2)+'\n')
print(json.dumps({'dimensions':shape.tolist(),'bytes':len(payload),'range':[int(hu.min()),int(hu.max())],'coverage':float(valid.mean()),'sha256':sha(payload)},indent=2))
