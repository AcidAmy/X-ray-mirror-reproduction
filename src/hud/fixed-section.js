// A camera-aligned plane frozen in scene coordinates. Resample the moving atlas through its inverse pose.
import * as THREE from 'three';
import { R } from '../render/scene.js';
import { getVolume } from './volume-source.js';
import { sampleVolume, displayValue } from '../anatomy/volume.js';
let sheet=null, last=-Infinity;
const frozenProjection=new THREE.Matrix4();
const local=new THREE.Vector3(), world=new THREE.Vector3(), inv=new THREE.Matrix4();
export function resetFixedSection(){ if(sheet)sheet.visible=false; last=-Infinity; }
export function updateFixedSection(now,enabled,found,contrast){
  if(!enabled || !found || !getVolume()){resetFixedSection();return;}
  if(!sheet){
    const canvas=document.createElement('canvas');canvas.width=canvas.height=128;
    const texture=new THREE.CanvasTexture(canvas);texture.colorSpace=THREE.SRGBColorSpace;
    sheet=new THREE.Mesh(new THREE.PlaneGeometry(29.2,29.2),new THREE.MeshBasicMaterial({map:texture,alphaMap:texture,alphaTest:.03,transparent:true,opacity:.9,side:THREE.DoubleSide,depthTest:false,depthWrite:false}));
    sheet.add(new THREE.LineSegments(new THREE.EdgesGeometry(sheet.geometry),new THREE.LineBasicMaterial({color:0x7fe08a,depthTest:false})));
    sheet.renderOrder=30;sheet.children[0].renderOrder=31;sheet.visible=false;R.headScene.add(sheet);
  }
  R.headGroup.updateWorldMatrix(true,false);
  if(!sheet.visible){
    sheet.position.copy(R.headGroup.localToWorld(new THREE.Vector3(-.3,1,-4)));
    sheet.quaternion.copy(R.cam.quaternion);
    const scale=R.headGroup.getWorldScale(new THREE.Vector3());sheet.scale.setScalar(Math.cbrt(Math.abs(scale.x*scale.y*scale.z)));
    sheet.updateMatrix();
    frozenProjection.copy(R.cam.projectionMatrix).multiply(sheet.matrix);
    sheet.matrixAutoUpdate=false;
    sheet.visible=true;
  }
  // Face fitting alters the projection every frame. Cancel that correction for this plane.
  sheet.matrix.copy(R.cam.projectionMatrixInverse).multiply(frozenProjection);
  sheet.matrixWorldNeedsUpdate=true;
  if(now-last<120)return;last=now;
  inv.copy(R.headGroup.matrixWorld).invert();sheet.updateMatrixWorld(true);
  const canvas=sheet.material.map.image, ctx=canvas.getContext('2d'), data=ctx.createImageData(128,128), v=getVolume();
  for(let y=0;y<128;y++)for(let x=0;x<128;x++){
    world.set(((x+.5)/128-.5)*29.2,(.5-(y+.5)/128)*29.2,0).applyMatrix4(sheet.matrixWorld);
    local.copy(world).applyMatrix4(inv);
    const raw=sampleVolume(v,[local.x,local.y,local.z]);
    const c=v.modality==='CT'?displayValue(v,raw,contrast):(raw>0?displayValue(v,raw,contrast):0),i=(x+y*128)*4;
    data.data[i]=data.data[i+1]=data.data[i+2]=c;data.data[i+3]=255;
  }
  ctx.putImageData(data,0,0);sheet.material.map.needsUpdate=true;
}
