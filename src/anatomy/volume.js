// Prepared atlas in model coordinates. Keep sampling independent of DOM/three.js for orientation tests.
export function decodeVolume(meta, bytes) {
  const n = meta.dimensions?.reduce((a,b) => a*b, 1);
  if (meta.version !== 1 || !Number.isSafeInteger(n) || n <= 0 || bytes.length !== n*2 ||
      meta.dimensions.length !== 3 || !meta.dimensions.every(v => Number.isInteger(v) && v > 1) ||
      meta.origin?.length !== 3 || !meta.origin.every(Number.isFinite) ||
      meta.spacing?.length !== 3 || !meta.spacing.every(v => Number.isFinite(v) && v > 0)) throw new Error('Invalid MRI volume');
  return { ...meta, image: bytes.subarray(0,n), labels: bytes.subarray(n) };
}
export function sampleVolume(v, p, labels = false) {
  return sample(v,p[0],p[1],p[2],labels);
}
function sample(v, px, py, pz, labels = false) {
  const x=(px-v.origin[0])/v.spacing[0], y=(py-v.origin[1])/v.spacing[1], z=(pz-v.origin[2])/v.spacing[2];
  const [nx,ny,nz]=v.dimensions, plane=nx*ny;
  if (!Number.isFinite(x+y+z) || x<0 || y<0 || z<0 || x>nx-1 || y>ny-1 || z>nz-1) return 0;
  if (labels) return v.labels[Math.round(x)+nx*Math.round(y)+plane*Math.round(z)];
  const x0=Math.floor(x), y0=Math.floor(y), z0=Math.floor(z), fx=x-x0, fy=y-y0, fz=z-z0;
  const dx=x0<nx-1?1:0, dy=y0<ny-1?nx:0, dz=z0<nz-1?plane:0, i=x0+nx*y0+plane*z0, a=v.image;
  const c00=a[i]*(1-fx)+a[i+dx]*fx, c10=a[i+dy]*(1-fx)+a[i+dy+dx]*fx;
  const c01=a[i+dz]*(1-fx)+a[i+dz+dx]*fx, c11=a[i+dz+dy]*(1-fx)+a[i+dz+dy+dx]*fx;
  return (c00*(1-fy)+c10*fy)*(1-fz)+(c01*(1-fy)+c11*fy)*fz;
}
// Every pixel samples exactly the same model point as the 6a crosshair and outlines.
export function renderSlice(v, view, position, centre, half, size, contrast = 1) {
  const rgba = new Uint8ClampedArray(size*size*4), p = position.slice();
  for (let y=0;y<size;y++) for (let x=0;x<size;x++) {
    p[view.u] = centre[view.u]+((x+.5)/size*2-1)*half*view.su;
    p[view.v] = centre[view.v]+(1-(y+.5)/size*2)*half;
    const c = Math.max(0,Math.min(255,(sample(v,p[0],p[1],p[2])-128)*contrast+128)), i=(x+y*size)*4;
    rgba[i]=rgba[i+1]=rgba[i+2]=c; rgba[i+3]=255;
  }
  return rgba;
}
