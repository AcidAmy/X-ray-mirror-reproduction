import { fetchBytes, embedded, embeddedText } from '../net.js';
import { decodeVolume, renderSlice } from '../anatomy/volume.js';
let volume = null, pending = null;
export const getVolume = () => volume;
export async function loadMRI() {
  if (volume) return volume;
  if (pending) return pending;
  pending = (async () => {
    const text = embeddedText('volume-meta'), bytes = text && embedded('volume');
    if (bytes) return decodeVolume(JSON.parse(text), bytes);
    const base = import.meta.env.BASE_URL+'volume/';
    const [res, bin] = await Promise.all([fetch(base+'meta.json'),fetchBytes(base+'icbm152.bin')]);
    if (!res.ok) throw new Error('MRI metadata missing');
    return decodeVolume(await res.json(), bin);
  })();
  try { volume = await pending; return volume; } finally { pending = null; }
}
const slices = new Map();
export function mriSlice(view, cur, centre, half, contrast) {
  if (!volume) return null;
  const key = [cur[view.plane],contrast].join(':');
  let s = slices.get(view.id);
  if (s?.key === key) return s.canvas;
  const size = 256, canvas = s?.canvas || document.createElement('canvas');
  canvas.width = canvas.height = size;
  canvas.getContext('2d').putImageData(new ImageData(renderSlice(volume,view,cur,centre,half,size,contrast),size,size),0,0);
  slices.set(view.id,{key,canvas});
  return canvas;
}
