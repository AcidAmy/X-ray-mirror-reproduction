// Hand bones: every bone mesh is stretched between two tracked joints; the palm block follows three of them.
import * as THREE from "three";
import { R, BONES } from "../render/scene.js";
import { S } from "../settings.js";
import { view } from "../state.js";
import { solidGain } from "../render/layers.js";

const tmpV = new THREE.Vector3(), vA = new THREE.Vector3(), vB = new THREE.Vector3(), vC = new THREE.Vector3();
const e1 = new THREE.Vector3(), e2 = new THREE.Vector3(), e3 = new THREE.Vector3(), hm = new THREE.Matrix4();

// lms: 21 hand landmarks in 0..1 picture coordinates. isRight: true for the person's right hand.
export function updateHand(rig, lms, isRight) {
  const { W, H } = view;
  // tracker coordinates -> stage pixels, with depth scaled like x (closer to the camera = larger z)
  if (!rig.pts) rig.pts = lms.map(() => new THREE.Vector3());
  const fresh = !rig.group.visible;
  lms.forEach((p, i) => { tmpV.set(p.x * W, (1 - p.y) * H, -p.z * W); if (fresh) rig.pts[i].copy(tmpV); else rig.pts[i].lerp(tmpV, 0.65); });
  const P = rig.pts, sign = isRight ? 1 : -1;
  // palm block (wrist bones + the four finger metacarpals) follows wrist, index knuckle and little-finger knuckle
  e1.subVectors(P[5], P[0]); e2.subVectors(P[17], P[0]);
  e3.crossVectors(e1, e2).normalize().multiplyScalar(sign * Math.sqrt(e1.length() * e2.length()));
  rig.palm.matrix.makeBasis(e1, e2, e3).setPosition(P[0]);
  rig.palm.matrixWorldNeedsUpdate = true;
  // every finger bone spans two tracked joints; its roll comes from the line across the knuckles
  vC.subVectors(P[17], P[5]).normalize();
  BONES.forEach(([a, b], i) => {
    vA.subVectors(P[b], P[a]);
    let len = vA.length(); if (len < 1e-6) len = 1e-6;
    vA.divideScalar(len);
    vB.copy(vC).addScaledVector(vA, -vC.dot(vA));
    if (vB.lengthSq() < 1e-6) vB.set(1, 0, 0); vB.normalize();
    e3.crossVectors(vA, vB).multiplyScalar(sign);
    const L = len * (b % 4 === 0 ? 0.8 : 1);              // fingertip points sit past the end of the bone
    hm.makeBasis(e1.copy(vA).multiplyScalar(L), e2.copy(vB).multiplyScalar(L), e3.multiplyScalar(L)).setPosition(P[a]);
    rig.bones[i].matrix.copy(hm);
    rig.bones[i].matrixWorldNeedsUpdate = true;
  });
  rig.group.visible = true;
}

export function styleHand(rig) {
  for (const m of [rig.palm, ...rig.bones]) {
    m.material.uniforms.uGain.value = S.style === "solid" ? solidGain() : S.bright * 1.15;
    m.material.uniforms.uFeather.value = S.feather * 0.75;
  }
}

// the dark "veil" that hides the real hand so the bones read clearly (drawn on the 2D layer under the 3D one)
let scratch = null;
export function drawHandVeil(g, lms, alpha) {
  const { W, H } = view;
  const px = i => lms[i].x * W, py = i => lms[i].y * H;
  const d = Math.hypot(px(5) - px(17), py(5) - py(17)) || 1;
  const path = new Path2D();
  [0, 1, 2, 5, 9, 13, 17].forEach((i, k) => k ? path.lineTo(px(i), py(i)) : path.moveTo(px(i), py(i)));
  path.closePath();
  const fingers = new Path2D();
  for (const c of [[1,2,3,4],[5,6,7,8],[9,10,11,12],[13,14,15,16],[17,18,19,20]])
    c.forEach((i, k) => k ? fingers.lineTo(px(i), py(i)) : fingers.moveTo(px(i), py(i)));
  // draw opaque on a scratch canvas first so overlapping strokes do not darken twice
  const sc = scratch || (scratch = document.createElement("canvas"));
  if (sc.width !== W || sc.height !== H) { sc.width = W; sc.height = H; }
  const s = sc.getContext("2d");
  s.clearRect(0, 0, W, H); s.fillStyle = s.strokeStyle = "#04070d"; s.lineJoin = s.lineCap = "round";
  s.lineWidth = d * 0.34; s.fill(path); s.stroke(path); s.lineWidth = d * 0.36; s.stroke(fingers);
  const blur = S.feather * d * 0.22;                     // soften the hand's dark outline by the same setting
  g.filter = blur > 0.5 ? "blur(" + blur.toFixed(1) + "px)" : "none";
  g.globalAlpha = alpha; g.drawImage(sc, 0, 0); g.globalAlpha = 1; g.filter = "none";
}
