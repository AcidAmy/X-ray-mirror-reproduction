// Head pose: smooths the tracker's head matrix, pins the model to the face on screen, fits it to the
// person's head shape automatically, then applies the manual fit.
import * as THREE from "three";
import { R } from "../render/scene.js";
import { S } from "../settings.js";
import { view } from "../state.js";
import { OneEuro, OneEuroVec3, OneEuroQuat, stepSeconds } from "../filters.js";
import { TUNE } from "../tuning.js";

export const head = { found: false, pos: new THREE.Vector3(), quat: new THREE.Quaternion(), scl: new THREE.Vector3(1, 1, 1),
                      fitS: 1, fitX: 0, fitY: 0, jaw: 0, lms: null,
                      // where each eye looks, radians: yaw > 0 towards the person's left, pitch > 0 downwards
                      gaze: { yawL: 0, pitchL: 0, yawR: 0, pitchR: 0 },
                      // automatic head-shape fit: how much wider / taller / deeper this person's head is than the model
                      autoW: 1, autoH: 1, autoD: 1, autoN: 0 };
const tmpM = new THREE.Matrix4(), tmpP = new THREE.Vector3(), tmpQ = new THREE.Quaternion(), tmpS = new THREE.Vector3();
const tmpV = new THREE.Vector3(), fitM = new THREE.Matrix4(), corr = new THREE.Matrix4(), eul = new THREE.Euler();

const fPos = new OneEuroVec3(TUNE.headPos), fScl = new OneEuroVec3(TUNE.headScale), fRot = new OneEuroQuat(TUNE.headRot);
const fGaze = { yawL: new OneEuro(TUNE.gaze), pitchL: new OneEuro(TUNE.gaze), yawR: new OneEuro(TUNE.gaze), pitchR: new OneEuro(TUNE.gaze) };
const fFitS = new OneEuro(TUNE.fitScale), fFitX = new OneEuro(TUNE.fitShift), fFitY = new OneEuro(TUNE.fitShift), fJaw = new OneEuro(TUNE.jaw);
let lastT = 0, lastSeenT = -1e9;

// Face landmark numbers that have a known matching position on the anatomy model (eye corners, nose, chin, ...).
export const fitIds = [];
export function initHead(META) { fitIds.length = 0; for (const k of Object.keys(META.fit)) fitIds.push(Number(k)); }

export function resetHead() { head.found = false; head.lms = null; head.jaw = 0; lastSeenT = -1e9; resetAutoFit(); }
function resetAutoFit() { head.autoW = head.autoH = head.autoD = 1; head.autoN = 0; }

// Turns the tracker's eye "blendshape" scores (each 0..1) into eye angles.
// Names follow the person: eyeLookOutLeft = their left eye looking further to their left.
export function gazeFromBlendshapes(score) {
  const E = TUNE.eyes, L = E.flipSides ? "Right" : "Left", Rt = E.flipSides ? "Left" : "Right";
  const g = n => score[n] || 0;
  return { yawL: (g("eyeLookOut" + L) - g("eyeLookIn" + L)) * E.maxYaw, pitchL: (g("eyeLookDown" + L) - g("eyeLookUp" + L)) * E.maxPitch,
           yawR: (g("eyeLookIn" + Rt) - g("eyeLookOut" + Rt)) * E.maxYaw, pitchR: (g("eyeLookDown" + Rt) - g("eyeLookUp" + Rt)) * E.maxPitch };
}

// matrixData: the tracker's 4x4 head transform (cm, camera space). lms: face landmarks in 0..1 picture coordinates.
// now: timestamp of this frame in milliseconds. gaze: eye angles (see gazeFromBlendshapes) or null.
export function updateHead(matrixData, lms, jawOpen, now, gaze) {
  const { cam, baseProj, headGroup, jawPivot, META } = R;
  tmpM.fromArray(matrixData);
  const e = tmpM.elements;                               // accept either memory layout
  if (Math.abs(e[12]) + Math.abs(e[13]) + Math.abs(e[14]) < 1e-6 && Math.abs(e[3]) + Math.abs(e[7]) + Math.abs(e[11]) > 1e-3) tmpM.transpose();
  tmpM.decompose(tmpP, tmpQ, tmpS);
  const fresh = !head.found, dt = stepSeconds(now, lastT);
  if (now - lastSeenT > TUNE.autoFit.resetAfterMs) resetAutoFit();     // a new person: measure their head afresh
  lastT = lastSeenT = now;
  if (fresh) {
    head.pos.copy(tmpP); head.quat.copy(tmpQ); head.scl.copy(tmpS); head.fitS = 1; head.fitX = head.fitY = 0; head.jaw = jawOpen;
    fPos.reset(); fScl.reset(); fRot.reset(); fFitS.reset(1); fFitX.reset(0); fFitY.reset(0); fJaw.reset(jawOpen);
  } else {
    fPos.step(head.pos, tmpP, dt); fRot.step(head.quat, tmpQ, dt); fScl.step(head.scl, tmpS, dt);
    head.jaw = fJaw.filter(jawOpen, dt);
  }
  for (const k in fGaze) {
    const target = gaze ? gaze[k] : 0;
    if (fresh) { fGaze[k].reset(target); head.gaze[k] = target; } else head.gaze[k] = fGaze[k].filter(target, dt);
  }
  if (R.eyes.length === 2) {
    R.eyes[0].pivot.rotation.set(head.gaze.pitchL, head.gaze.yawL, 0);
    R.eyes[1].pivot.rotation.set(head.gaze.pitchR, head.gaze.yawR, 0);
  }
  head.found = true; head.lms = lms;
  tmpM.compose(head.pos, head.quat, head.scl);           // smoothed pose

  // Pin the model to the face on screen: compare where key face points land with where the tracker saw them.
  let pmx = 0, pmy = 0, qmx = 0, qmy = 0; const P = [], Q = [];
  for (const id of fitIds) {
    tmpV.fromArray(META.fit[id]).applyMatrix4(tmpM).applyMatrix4(baseProj);
    const q = lms[id]; if (!q) continue;
    P.push([tmpV.x, tmpV.y]); Q.push([q.x * 2 - 1, 1 - q.y * 2]);
  }
  if (P.length) {
    for (let i = 0; i < P.length; i++) { pmx += P[i][0]; pmy += P[i][1]; qmx += Q[i][0]; qmy += Q[i][1]; }
    pmx /= P.length; pmy /= P.length; qmx /= P.length; qmy /= P.length;
    let num = 0, den = 0;
    for (let i = 0; i < P.length; i++) {
      const ax = P[i][0] - pmx, ay = P[i][1] - pmy;
      num += ax * (Q[i][0] - qmx) + ay * (Q[i][1] - qmy); den += ax * ax + ay * ay;
    }
    const s = Math.max(0.6, Math.min(1.6, den > 1e-9 ? num / den : 1));
    head.fitS = fFitS.filter(s, dt);
    head.fitX = fFitX.filter(qmx - head.fitS * pmx, dt);
    head.fitY = fFitY.filter(qmy - head.fitS * pmy, dt);
    if (S.autofit) sampleHeadShape(P, Q, pmx, pmy, qmx, qmy, jawOpen); else resetAutoFit();
  }
  corr.set(head.fitS, 0, 0, head.fitX,  0, head.fitS, 0, head.fitY,  0, 0, 1, 0,  0, 0, 0, 1);
  cam.projectionMatrix.copy(baseProj).premultiply(corr);
  cam.projectionMatrixInverse.copy(cam.projectionMatrix).invert();

  // head-shape fit, then the user's manual fit on top: overall size, per-axis stretch and position
  // (local +x is your left, so the mirror view flips it)
  fitM.makeScale(S.fs * S.fw * head.autoW, S.fs * S.fh * head.autoH, S.fs * S.fd * head.autoD).setPosition(-S.fx, S.fy, S.fz);
  headGroup.matrix.copy(tmpM).multiply(fitM);
  headGroup.matrixWorldNeedsUpdate = true;          // we set the matrix by hand, so tell three.js it changed
  headGroup.visible = true;
  jawPivot.rotation.x = Math.min(1, Math.max(0, head.jaw)) * 0.36;
}

// Automatic head-shape fit. The screen fit above finds one overall scale; what is left over is how this person's
// face differs in proportion from the model's. Measure that along the head's own left-right and up-down directions:
// P = where the model's key points land, Q = where the tracker saw them (both in screen coordinates).
// Only near-frontal, mouth-closed frames are used, and the result is averaged so it settles within about a second.
function sampleHeadShape(P, Q, pmx, pmy, qmx, qmy, jawOpen) {
  const A = TUNE.autoFit;
  if (P.length < 8 || jawOpen > A.maxJaw) return;
  eul.setFromQuaternion(head.quat, "YXZ");
  if (Math.abs(eul.y) > A.maxTurn || Math.abs(eul.x) > A.maxTurn) return;
  // the head's x and y directions as they appear on screen, in pixels so both axes use the same unit
  const hw = view.W / 2, hh = view.H / 2;
  const dir = (x, y, z) => {
    tmpV.set(0, 0, 0).applyMatrix4(tmpM).applyMatrix4(R.baseProj); const ox = tmpV.x, oy = tmpV.y;
    tmpV.set(x, y, z).applyMatrix4(tmpM).applyMatrix4(R.baseProj);
    const dx = (tmpV.x - ox) * hw, dy = (tmpV.y - oy) * hh, len = Math.hypot(dx, dy) || 1;
    return [dx / len, dy / len];
  };
  const u = dir(5, 0, 0), v = dir(0, 5, 0);
  let nu = 0, du = 0, nv = 0, dv = 0;
  for (let i = 0; i < P.length; i++) {
    const px = (P[i][0] - pmx) * head.fitS * hw, py = (P[i][1] - pmy) * head.fitS * hh;
    const qx = (Q[i][0] - qmx) * hw, qy = (Q[i][1] - qmy) * hh;
    const pu = px * u[0] + py * u[1], pv = px * v[0] + py * v[1];
    nu += pu * (qx * u[0] + qy * u[1]); du += pu * pu;
    nv += pv * (qx * v[0] + qy * v[1]); dv += pv * pv;
  }
  if (du < 1e-6 || dv < 1e-6) return;
  const clamp = x => Math.min(A.max, Math.max(A.min, x));
  const w = clamp(nu / du), h = clamp(nv / dv);
  head.autoN++;
  const k = head.autoN <= A.quickFrames ? 1 / head.autoN : 1 / (A.quickFrames * 2);
  head.autoW += (w - head.autoW) * k; head.autoH += (h - head.autoH) * k;
  head.autoD = Math.sqrt(head.autoW * head.autoH);       // depth cannot be seen from the front; assume it follows
}
