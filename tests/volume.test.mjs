import test from 'node:test';
import assert from 'node:assert/strict';
import { decodeVolume, sampleVolume, renderSlice } from '../src/anatomy/volume.js';
import { readFileSync, existsSync } from 'node:fs';
import { createHash } from 'node:crypto';
const meta={version:1,dimensions:[3,3,3],origin:[-1,-1,-1],spacing:[1,1,1]};
const bytes=new Uint8Array(54);
for(let z=0;z<3;z++) for(let y=0;y<3;y++) for(let x=0;x<3;x++) { const i=x+3*(y+3*z); bytes[i]=x*10+y*30+z*60; bytes[i+27]=x; }
const vol=decodeVolume(meta,bytes);
test('volume validates payload and grid; rejects truncation',()=>{
 assert.throws(()=>decodeVolume(meta,bytes.subarray(1)));
 assert.throws(()=>decodeVolume({...meta,spacing:[0,1,1]},bytes));
 assert.equal(sampleVolume(vol,[20,0,0]),0);
});
test('trilinear intensities, nearest labels and inclusive volume boundaries',()=>{
 assert.equal(sampleVolume(vol,[-.5,-.5,-.5]),50);
 assert.equal(sampleVolume(vol,[-.4,0,0],true),1);
 assert.equal(sampleVolume(vol,[1,1,1]),200);
});
test('all planes preserve left/right, superior/inferior and anterior/posterior',()=>{
 const views=[{plane:1,u:0,v:2,su:1},{plane:2,u:0,v:1,su:1},{plane:0,u:2,v:1,su:-1}];
 for(const view of views){
  const rgba=renderSlice(vol,view,[0,0,0],[0,0,0],1.5,3);
  for(let y=0;y<3;y++) for(let x=0;x<3;x++){
   const p=[0,0,0];p[view.u]=(x-1)*view.su;p[view.v]=1-y;
   assert.equal(rgba[(x+y*3)*4],sampleVolume(vol,p));
  }
 }
});
test('distributed MRI checksum, tissue labels and affine inverse are consistent',()=>{
 const path=new URL('../public/volume/meta.json',import.meta.url);
 assert.ok(existsSync(path),'MRI data must be prepared before shipping');
 const m=JSON.parse(readFileSync(path)), b=readFileSync(new URL('../public/volume/icbm152.bin',import.meta.url)), v=decodeVolume(m,b);
 assert.equal(createHash('sha256').update(b).digest('hex'),m.sha256);
 assert.equal(createHash('sha256').update(readFileSync(new URL('../public/anatomy/meta.json',import.meta.url))).digest('hex'),m.anatomyMetaSha256);
 // Source RAS +right must become model -left; +superior -> model +y; +anterior -> model +z.
 assert.ok(m.sourceVoxelToModelCm[0][0]<0 && m.sourceVoxelToModelCm[1][2]>0 && m.sourceVoxelToModelCm[2][1]>0);
 for(let i=0;i<4;i++)for(let j=0;j<4;j++) assert.ok(Math.abs(m.sourceVoxelToModelCm[i].reduce((s,x,k)=>s+x*m.modelCmToSourceVoxel[k][j],0)-(i===j?1:0))<1e-8);
 assert.deepEqual([...new Set(v.labels)].sort(),[0,1,2,3]);
 assert.ok(v.image.some(x=>x>100));
});
