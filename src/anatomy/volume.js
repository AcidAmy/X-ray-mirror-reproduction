// Prepared teaching volumes in model coordinates; sampling stays independent of DOM/three.js.
export function decodeVolume(meta, bytes) {
  const n = meta.dimensions?.reduce((a,b) => a*b, 1), ct = meta.version === 2 && meta.modality === 'CT';
  if ((!ct && meta.version !== 1) || !Number.isSafeInteger(n) || n <= 0 || bytes.length !== n*(ct?3:2) ||
      meta.dimensions.length !== 3 || !meta.dimensions.every(v => Number.isInteger(v) && v > 1) ||
      meta.origin?.length !== 3 || !meta.origin.every(Number.isFinite) ||
      meta.spacing?.length !== 3 || !meta.spacing.every(v => Number.isFinite(v) && v > 0) ||
      (ct && (meta.units !== 'HU' || meta.layout !== 'int16-le HU then uint8 coverage, x fastest'))) throw new Error('Invalid imaging volume');
  if (!ct) return { ...meta, image: bytes.subarray(0,n), labels: bytes.subarray(n) };
  // Explicit endian conversion also handles unaligned embedded payloads and Node Buffers.
  const data = new DataView(bytes.buffer,bytes.byteOffset,bytes.byteLength), image = new Int16Array(n);
  for(let i=0;i<n;i++) image[i]=data.getInt16(i*2,true);
  const coverage=bytes.subarray(n*2);
  if (coverage.some(x=>x>1)) throw new Error('Invalid CT coverage');
  return {...meta,image,coverage,labels:null};
}
export const CT_WINDOWS = Object.freeze({bone:{center:500,width:2000},brain:{center:40,width:80},soft:{center:40,width:400}});
// DICOM PS3.3 C.11.2.1.2 LINEAR, applied to HU rather than already-windowed pixels.
export function windowHU(value, center, width) {
  if (!Number.isFinite(center) || !Number.isFinite(width) || width<1) throw new Error('Invalid CT window');
  if (!Number.isFinite(value) || value<=center-.5-(width-1)/2) return 0;
  if (value>center-.5+(width-1)/2) return 255;
  return ((value-(center-.5))/(width-1)+.5)*255;
}
export function displayValue(v, value, options=1) {
  return v.modality==='CT' ? windowHU(value,options.center,options.width)
    : Math.max(0,Math.min(255,(value-128)*(typeof options==='number'?options:1)+128));
}
export function sampleVolume(v, p, labels = false) { return sample(v,p[0],p[1],p[2],labels); }
function sample(v, px, py, pz, labels = false) {
  const x=(px-v.origin[0])/v.spacing[0], y=(py-v.origin[1])/v.spacing[1], z=(pz-v.origin[2])/v.spacing[2];
  const [nx,ny,nz]=v.dimensions, plane=nx*ny, outside=v.modality==='CT'?NaN:0;
  if (!Number.isFinite(x+y+z) || x<0 || y<0 || z<0 || x>nx-1 || y>ny-1 || z>nz-1) return outside;
  if (labels) return v.labels?.[Math.round(x)+nx*Math.round(y)+plane*Math.round(z)] ?? 0;
  const x0=Math.floor(x), y0=Math.floor(y), z0=Math.floor(z), fx=x-x0, fy=y-y0, fz=z-z0;
  const dx=x0<nx-1?1:0, dy=y0<ny-1?nx:0, dz=z0<nz-1?plane:0, i=x0+nx*y0+plane*z0, a=v.image;
  // Coverage is independent of air (-1000 HU); do not interpolate missing scan regions into anatomy.
  if(v.coverage) for(let k=0;k<2;k++)for(let j=0;j<2;j++)for(let h=0;h<2;h++){
    const weight=(h?fx:1-fx)*(j?fy:1-fy)*(k?fz:1-fz);
    if(weight>1e-10 && !v.coverage[i+h*dx+j*dy+k*dz]) return NaN;
  }
  const c00=a[i]*(1-fx)+a[i+dx]*fx, c10=a[i+dy]*(1-fx)+a[i+dy+dx]*fx;
  const c01=a[i+dz]*(1-fx)+a[i+dz+dx]*fx, c11=a[i+dz+dy]*(1-fx)+a[i+dz+dy+dx]*fx;
  return (c00*(1-fy)+c10*fy)*(1-fz)+(c01*(1-fy)+c11*fy)*fz;
}
export function renderSlice(v, view, position, centre, half, size, options = 1) {
  const rgba = new Uint8ClampedArray(size*size*4), p = position.slice();
  for (let y=0;y<size;y++) for (let x=0;x<size;x++) {
    p[view.u] = centre[view.u]+((x+.5)/size*2-1)*half*view.su;
    p[view.v] = centre[view.v]+(1-(y+.5)/size*2)*half;
    const c=displayValue(v,sample(v,p[0],p[1],p[2]),options), i=(x+y*size)*4;
    rgba[i]=rgba[i+1]=rgba[i+2]=c; rgba[i+3]=255;
  }
  return rgba;
}
