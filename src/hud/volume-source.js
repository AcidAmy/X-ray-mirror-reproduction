// Lazy loading and slice cache shared by MRI and CT. No scan is fetched until requested.
import { fetchBytes, embedded, embeddedText } from '../net.js';
import { decodeVolume, renderSlice } from '../anatomy/volume.js';
const volumes=new Map(), pending=new Map(), slices=new Map();
let kind='mri';
export const setVolumeKind=value=>{kind=value;};
export const getVolumeKind=()=>kind;
export const getVolume=()=>volumes.get(kind);
export async function loadVolume(type=kind) {
  if(volumes.has(type))return volumes.get(type);
  if(pending.has(type))return pending.get(type);
  const request=(async()=>{
    const prefix=type==='ct'?'ct':'volume', text=embeddedText(prefix+'-meta'), bytes=text&&embedded(prefix);
    if(bytes)return decodeVolume(JSON.parse(text),bytes);
    const base=import.meta.env.BASE_URL+(type==='ct'?'ct/':'volume/');
    const [res,bin]=await Promise.all([fetch(base+'meta.json'),fetchBytes(base+(type==='ct'?'head.bin':'icbm152.bin'))]);
    if(!res.ok)throw new Error('Imaging metadata missing');
    return decodeVolume(await res.json(),bin);
  })();
  pending.set(type,request);
  try { const volume=await request;volumes.set(type,volume);return volume; } finally {pending.delete(type);}
}
export function sliceKey(view,cur,options){return JSON.stringify([kind,cur[view.plane],options]);}
export function imageSlice(view,cur,centre,half,options) {
  const volume=getVolume();if(!volume)return null;
  const key=JSON.stringify([sliceKey(view,cur,options),centre,half]);
  const s=slices.get(view.id);if(s?.key===key)return s.canvas;
  const size=256,canvas=s?.canvas||document.createElement('canvas');
  canvas.width=canvas.height=size;
  canvas.getContext('2d').putImageData(new ImageData(renderSlice(volume,view,cur,centre,half,size,options),size,size),0,0);
  slices.set(view.id,{key,canvas});return canvas;
}
