import test from 'node:test';
import assert from 'node:assert/strict';
import {pinchStep} from '../src/anatomy/interaction.js';
import * as THREE from 'three';
const hand=(y,gap=.01)=>Array.from({length:21},(_,i)=>({x:i===5?.4:i===17?.6:i===4?.5-gap:.5,y}));
test('pinch engages without jump, moves relatively, clamps, releases and rejects two hands',()=>{
 let s=pinchStep({},[hand(.5)],3,[-5,10]);assert.equal(s.value,3);assert.ok(s.active);
 s=pinchStep(s,[hand(.4)],3,[-5,10]);assert.ok(Math.abs(s.value-5.25)<1e-8);
 assert.equal(pinchStep(s,[hand(-1)],3,[-5,10]).value,10);
 assert.equal(pinchStep(s,[],3,[-5,10]).active,false);
 assert.equal(pinchStep(s,[hand(.4,.2)],3,[-5,10]).active,false);
 assert.equal(pinchStep(s,[hand(.4),hand(.4)],3,[-5,10]).active,false);
 assert.equal(pinchStep({},[hand(.1)],4,[-5,10]).value,4);
});
test('fixed screen plane survives projection correction and maps through inverse head motion',()=>{
 const matrix=new THREE.Matrix4().compose(new THREE.Vector3(3,5,-10),new THREE.Quaternion().setFromEuler(new THREE.Euler(.2,.4,-.1)),new THREE.Vector3(2,3,4));
 const camera=new THREE.PerspectiveCamera(63,1.5,1,10000);
 const frozen=camera.projectionMatrix.clone().multiply(matrix);
 const corrected=camera.projectionMatrix.clone().premultiply(new THREE.Matrix4().makeTranslation(.2,-.1,0));
 const compensated=corrected.clone().invert().multiply(frozen);
 const check=corrected.clone().multiply(compensated);
 check.elements.forEach((v,i)=>assert.ok(Math.abs(v-frozen.elements[i])<1e-9));
 const p=new THREE.Vector3(1,2,3), world=p.clone().applyMatrix4(matrix);
 assert.ok(world.clone().applyMatrix4(matrix.clone().invert()).distanceTo(p)<1e-10);
 const moved=new THREE.Matrix4().makeTranslation(2,0,0).multiply(matrix);
 assert.ok(world.clone().applyMatrix4(moved.clone().invert()).distanceTo(p)>.1);
});
