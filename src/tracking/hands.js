// Hand bones: every bone mesh is stretched between two tracked joints; the palm block follows the knuckles.
import * as THREE from "three";
import { R, BONES } from "../render/scene.js";
import { S } from "../settings.js";
import { view } from "../state.js";
import { solidGain } from "../render/layers.js";
import { OneEuro, OneEuroVec3, stepSeconds } from "../filters.js";
import { TUNE } from "../tuning.js";

const tmpV = new THREE.Vector3(), vA = new THREE.Vector3(), vB = new THREE.Vector3(), vC = new THREE.Vector3();
const e1 = new THREE.Vector3(), e2 = new THREE.Vector3(), e3 = new THREE.Vector3(), hm = new THREE.Matrix4(), inv = new THREE.Matrix4();
const dist = (a, b) => Math.hypot(a.x - b.x, a.y - b.y, a.z - b.z);

// ---------------------------------------------------------------------------------------------------------
// Bending palm. The palm mesh lives in its own coordinates: wrist at the origin, index knuckle at (1,0,0),
// little-finger knuckle at (0,1,0). Placing it with those three joints alone treats the palm as a stiff board,
// so the middle and ring knuckles drift off their tracked joints when the hand cups or spreads. Here every palm
// vertex also follows the middle (9) and ring (13) knuckles: the further from the wrist and the nearer to that
// finger's ray, the more it moves. The rest positions of those knuckles come from the dataset's own hand.
// ---------------------------------------------------------------------------------------------------------
let palmRest = null;      // { k9, k13: knuckle rest positions in palm coordinates, w9, w13: per-vertex weights }

function palmCoords(base, p) {               // dataset point (mm) -> palm coordinates
  const o = new THREE.Vector3().fromArray(base[0]);
  const a = new THREE.Vector3().fromArray(base[5]).sub(o), b = new THREE.Vector3().fromArray(base[17]).sub(o);
  const n = new THREE.Vector3().crossVectors(a, b).normalize().multiplyScalar(Math.sqrt(a.length() * b.length()));
  return new THREE.Vector3().fromArray(p).sub(o).applyMatrix4(new THREE.Matrix4().makeBasis(a, b, n).invert());
}

function initPalm(geo) {
  const base = R.META.demoHand, k9 = palmCoords(base, base[9]), k13 = palmCoords(base, base[13]);
  const r9 = k9.x + k9.y, t9 = k9.y / r9, r13 = k13.x + k13.y, t13 = k13.y / r13;
  const pos = geo.getAttribute("position"), w9 = new Float32Array(pos.count), w13 = new Float32Array(pos.count);
  const tent = (t, lo, mid, hi) => t <= lo || t >= hi ? 0 : t < mid ? (t - lo) / (mid - lo) : (hi - t) / (hi - mid);
  for (let i = 0; i < pos.count; i++) {
    const u = pos.getX(i), v = pos.getY(i), r = u + v;                 // r: 0 at the wrist, about 1 at the knuckles
    if (r <= 0.02) continue;
    const t = Math.min(1, Math.max(0, v / r));                         // 0 on the index ray, 1 on the little-finger ray
    w9[i] = tent(t, 0, t9, t13) * Math.pow(Math.min(1.25, r / r9), 1.6);
    w13[i] = tent(t, t9, t13, 1) * Math.pow(Math.min(1.25, r / r13), 1.6);
  }
  palmRest = { k9, k13, w9, w13 };
}

function bendPalm(rig, P) {
  const geo = rig.palm.geometry, pos = geo.getAttribute("position");
  if (!palmRest) initPalm(geo);
  if (!rig.palmBase) rig.palmBase = pos.array.slice();
  // where the tracked knuckles sit in palm coordinates, minus where the stiff board would put them
  inv.copy(rig.palm.matrix).invert();
  const c9 = vA.copy(P[9]).applyMatrix4(inv).sub(palmRest.k9), c13 = vB.copy(P[13]).applyMatrix4(inv).sub(palmRest.k13);
  if (c9.length() > 0.6) c9.setLength(0.6);                            // a bad detection must not tear the mesh apart
  if (c13.length() > 0.6) c13.setLength(0.6);
  const out = pos.array, src = rig.palmBase, { w9, w13 } = palmRest;
  for (let i = 0, j = 0; i < w9.length; i++, j += 3) {
    const a = w9[i], b = w13[i];
    out[j] = src[j] + a * c9.x + b * c13.x; out[j + 1] = src[j + 1] + a * c9.y + b * c13.y; out[j + 2] = src[j + 2] + a * c9.z + b * c13.z;
  }
  pos.needsUpdate = true;
}

// ---------------------------------------------------------------------------------------------------------
// lms: 21 hand landmarks in 0..1 picture coordinates. isRight: true for the person's right hand.
// now: timestamp of this frame in milliseconds.
// world: the same 21 joints in metres, in true 3D (optional). The picture only shows how long a bone looks, and
// a finger pointing at the camera looks short; the world joints give its real length, which keeps bone
// thickness constant instead of shrinking with the foreshortening.
export function updateHand(rig, lms, isRight, now, world) {
  const { W, H } = view;
  // tracker coordinates -> stage pixels, with depth scaled like x (closer to the camera = larger z)
  if (!rig.pts) {
    rig.pts = lms.map(() => new THREE.Vector3()); rig.filters = lms.map(() => new OneEuroVec3(TUNE.handPoint));
    rig.fScale = new OneEuro(TUNE.handScale);
  }
  const fresh = !rig.group.visible, dt = stepSeconds(now, rig.seen);
  rig.seen = now;
  lms.forEach((p, i) => {
    tmpV.set(p.x * W, (1 - p.y) * H, -p.z * W);
    if (fresh) { rig.pts[i].copy(tmpV); rig.filters[i].reset(); } else rig.filters[i].step(rig.pts[i], tmpV, dt);
  });
  const P = rig.pts, sign = isRight ? 1 : -1;

  // stage pixels per metre for this hand, from the palm (the stiffest part)
  let pxPerM = 0;
  if (world && world.length === 21) {
    let px = 0, m = 0;
    for (const [a, b] of [[0, 5], [0, 17], [5, 17], [0, 9]]) { px += dist(P[a], P[b]); m += dist(world[a], world[b]); }
    if (m > 1e-6) { if (fresh) rig.fScale.reset(px / m); pxPerM = rig.fScale.filter(px / m, dt); }
  }

  // palm block (wrist bones + the four finger metacarpals) follows wrist, index knuckle and little-finger knuckle
  e1.subVectors(P[5], P[0]); e2.subVectors(P[17], P[0]);
  const thick = pxPerM ? Math.sqrt(dist(world[0], world[5]) * dist(world[0], world[17])) * pxPerM : Math.sqrt(e1.length() * e2.length());
  e3.crossVectors(e1, e2).normalize().multiplyScalar(sign * thick);
  rig.palm.matrix.makeBasis(e1, e2, e3).setPosition(P[0]);
  rig.palm.matrixWorldNeedsUpdate = true;
  bendPalm(rig, P);                                      // ...and bends to the middle and ring knuckles
  // every finger bone spans two tracked joints; its roll comes from the line across the knuckles
  vC.subVectors(P[17], P[5]).normalize();
  BONES.forEach(([a, b], i) => {
    vA.subVectors(P[b], P[a]);
    let len = vA.length(); if (len < 1e-6) len = 1e-6;
    vA.divideScalar(len);
    vB.copy(vC).addScaledVector(vA, -vC.dot(vA));
    if (vB.lengthSq() < 1e-6) vB.set(1, 0, 0); vB.normalize();
    e3.crossVectors(vA, vB).multiplyScalar(sign);
    const tip = b % 4 === 0 ? 0.8 : 1;                    // fingertip points sit past the end of the bone
    const L = len * tip;                                  // length along the bone: what the picture shows
    const T = pxPerM ? dist(world[a], world[b]) * pxPerM * tip : L;   // thickness: from the bone's real length
    hm.makeBasis(e1.copy(vA).multiplyScalar(L), e2.copy(vB).multiplyScalar(T), e3.multiplyScalar(T)).setPosition(P[a]);
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

// ---------------------------------------------------------------------------------------------------------
// Hand silhouette: one opaque shape per hand (palm polygon plus thick strokes along the fingers), all hands on one
// half-resolution canvas. It is used twice: as the dark "veil" under the bones so they read clearly against the
// real hand, and as the mask that hides the head anatomy behind a hand held in front of the face.
// Returns { canvas, knuckleSpan } or null when there are no hands.
// ---------------------------------------------------------------------------------------------------------
let maskCanvas = null;
const FINGER_CHAINS = [[1,2,3,4],[5,6,7,8],[9,10,11,12],[13,14,15,16],[17,18,19,20]];
export function buildHandMask(hands) {
  if (!hands.length) return null;
  const { W, H } = view, k = 0.5, mw = Math.max(2, Math.round(W * k)), mh = Math.max(2, Math.round(H * k));
  const sc = maskCanvas || (maskCanvas = document.createElement("canvas"));
  if (sc.width !== mw || sc.height !== mh) { sc.width = mw; sc.height = mh; }
  const s = sc.getContext("2d");
  s.clearRect(0, 0, mw, mh); s.fillStyle = s.strokeStyle = "#04070d"; s.lineJoin = s.lineCap = "round";
  let span = 1;
  for (const lms of hands) {
    const px = i => lms[i].x * mw, py = i => lms[i].y * mh;
    const d = Math.hypot(px(5) - px(17), py(5) - py(17)) || 1;          // width across the knuckles sets every thickness
    span = Math.max(span, d / k);
    const palm = new Path2D();
    [0, 1, 2, 5, 9, 13, 17].forEach((i, n) => n ? palm.lineTo(px(i), py(i)) : palm.moveTo(px(i), py(i)));
    palm.closePath();
    const fingers = new Path2D();
    for (const c of FINGER_CHAINS) c.forEach((i, n) => n ? fingers.lineTo(px(i), py(i)) : fingers.moveTo(px(i), py(i)));
    s.lineWidth = d * 0.34; s.fill(palm); s.stroke(palm); s.lineWidth = d * 0.36; s.stroke(fingers);
  }
  return { canvas: sc, knuckleSpan: span };
}

// the dark veil that hides the real hand so the bones read clearly (drawn on the 2D layer under the 3D one)
export function drawHandVeil(g, mask, alpha) {
  const blur = S.feather * mask.knuckleSpan * 0.22;      // soften the hand's dark outline by the same setting
  g.filter = blur > 0.5 ? "blur(" + blur.toFixed(1) + "px)" : "none";
  g.globalAlpha = alpha; g.drawImage(mask.canvas, 0, 0, view.W, view.H); g.globalAlpha = 1; g.filter = "none";
}
