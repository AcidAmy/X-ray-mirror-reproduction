import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {decodeVolume,sampleVolume,windowHU,renderSlice,CT_WINDOWS} from '../src/anatomy/volume.js';
const meta={version:2,modality:'CT',units:'HU',layout:'int16-le HU then uint8 coverage, x fastest',dimensions:[3,3,3],origin:[-1,-1,-1],spacing:[1,1,1]};
function fixture(){
 const bytes=new Uint8Array(81), dv=new DataView(bytes.buffer);bytes.fill(1,54);
 for(let z=0;z<3;z++)for(let y=0;y<3;y++)for(let x=0;x<3;x++)dv.setInt16(2*(x+3*y+9*z),-1000+x*100+y*300+z*500,true);
 return bytes;
}
test('CT preserves signed HU, handles unaligned bytes, and rejects invalid format/coverage',()=>{
 const b=fixture(), unaligned=new Uint8Array(82);unaligned.set(b,1);
 const v=decodeVolume(meta,unaligned.subarray(1));
 assert.equal(sampleVolume(v,[-1,-1,-1]),-1000);
 assert.equal(sampleVolume(v,[0,0,0]),-100);
 assert.equal(sampleVolume(v,[.5,.5,.5]),350);
 assert.equal(v.labels,null);
 assert.throws(()=>decodeVolume({...meta,units:'arbitrary'},b));
 assert.throws(()=>decodeVolume({...meta,layout:'big endian'},b));
 assert.throws(()=>decodeVolume(meta,b.subarray(1)));
 b[54]=2;assert.throws(()=>decodeVolume(meta,b));
});
test('missing CT coverage stays distinct from real air and does not contaminate interpolation',()=>{
 const b=fixture();b[54]=0;const v=decodeVolume(meta,b);
 assert.ok(Number.isNaN(sampleVolume(v,[-1,-1,-1])));
 assert.ok(Number.isNaN(sampleVolume(v,[-.5,-.5,-.5])));
 assert.ok(Number.isNaN(sampleVolume(v,[3,0,0])));
 assert.equal(sampleVolume(v,[1,1,1]),800);
 assert.equal(sampleVolume(v,[0,0,0]),-100); // zero-weight missing neighbours don't invalidate an exact voxel
});
test('DICOM LINEAR window clips, centers, and handles width 1 without dividing by zero',()=>{
 assert.equal(windowHU(0,40,80),0);assert.equal(windowHU(79,40,80),255);
 assert.equal(windowHU(39.5,40,80),127.5);
 assert.equal(windowHU(39.5,40,1),0);assert.equal(windowHU(40,40,1),255);
 assert.equal(windowHU(NaN,40,80),0);assert.equal(windowHU(-1000,500,2000),0);
 assert.throws(()=>windowHU(40,40,0));assert.throws(()=>windowHU(40,NaN,80));
 assert.notEqual(windowHU(40,CT_WINDOWS.bone.center,CT_WINDOWS.bone.width),windowHU(40,CT_WINDOWS.brain.center,CT_WINDOWS.brain.width));
});
test('CT slice orientation and windowing agree with HU sampling on every axis',()=>{
 const v=decodeVolume(meta,fixture()), w={center:0,width:2001};
 for(const view of [{plane:1,u:0,v:2,su:1},{plane:2,u:0,v:1,su:1},{plane:0,u:2,v:1,su:-1}]){
  const rgba=renderSlice(v,view,[0,0,0],[0,0,0],1.5,3,w);
  for(let y=0;y<3;y++)for(let x=0;x<3;x++){
   const p=[0,0,0];p[view.u]=(x-1)*view.su;p[view.v]=1-y;
   assert.ok(Math.abs(rgba[(x+y*3)*4]-windowHU(sampleVolume(v,p),0,2001))<=.5);
  }
 }
});
test('distributed CT checksum, signed range, provenance and affine orientation are consistent',()=>{
 const read=p=>readFileSync(new URL('../'+p,import.meta.url));
 const m=JSON.parse(read('public/ct/meta.json')), b=read('public/ct/head.bin'),v=decodeVolume(m,b);
 assert.equal(createHash('sha256').update(b).digest('hex'),m.sha256);assert.equal(b.length,m.byteLength);
 assert.equal(createHash('sha256').update(read('public/anatomy/meta.json')).digest('hex'),m.anatomyMetaSha256);
 assert.equal(m.sourceCommit.length,40);assert.equal(m.imageSha256.length,64);
 assert.deepEqual(m.sourceSpacingMm,[.98,.98,2.5]);
 assert.ok(v.image.some(x=>x<=-1000));assert.ok(v.image.some(x=>x>1000));
 assert.ok(v.coverage.some(x=>x===1));
 // Source LPS columns: left -> +x, posterior -> -z, superior -> +y.
 assert.ok(m.sourceVoxelToModelCm[0][0]>0 && m.sourceVoxelToModelCm[2][1]<0 && m.sourceVoxelToModelCm[1][2]>0);
 for(let i=0;i<4;i++)for(let j=0;j<4;j++)assert.ok(Math.abs(m.sourceVoxelToModelCm[i].reduce((s,x,k)=>s+x*m.modelCmToSourceVoxel[k][j],0)-(i===j?1:0))<1e-8);
});
