// Head pose: smooths the tracker's head matrix, pins the model to the face on screen, applies the manual fit.
import * as THREE from "three";
import { R } from "../render/scene.js";
import { S } from "../settings.js";

export const head = { found: false, pos: new THREE.Vector3(), quat: new THREE.Quaternion(), scl: new THREE.Vector3(1, 1, 1),
                      fitS: 1, fitX: 0, fitY: 0, jaw: 0, lms: null };
const tmpM = new THREE.Matrix4(), tmpP = new THREE.Vector3(), tmpQ = new THREE.Quaternion(), tmpS = new THREE.Vector3();
const tmpV = new THREE.Vector3(), fitM = new THREE.Matrix4(), corr = new THREE.Matrix4();

// Face landmark numbers that have a known matching position on the anatomy model (eye corners, nose, chin, ...).
export const fitIds = [];
export function initHead(META) { fitIds.length = 0; for (const k of Object.keys(META.fit)) fitIds.push(Number(k)); }

export function resetHead() { head.found = false; head.lms = null; head.jaw = 0; }

// matrixData: the tracker's 4x4 head transform (cm, camera space). lms: face landmarks in 0..1 picture coordinates.
export function updateHead(matrixData, lms, jawOpen) {
  const { cam, baseProj, headGroup, jawPivot, META } = R;
  tmpM.fromArray(matrixData);
  const e = tmpM.elements;                               // accept either memory layout
  if (Math.abs(e[12]) + Math.abs(e[13]) + Math.abs(e[14]) < 1e-6 && Math.abs(e[3]) + Math.abs(e[7]) + Math.abs(e[11]) > 1e-3) tmpM.transpose();
  tmpM.decompose(tmpP, tmpQ, tmpS);
  if (!head.found) { head.pos.copy(tmpP); head.quat.copy(tmpQ); head.scl.copy(tmpS); head.fitS = 1; head.fitX = head.fitY = 0; }
  else { head.pos.lerp(tmpP, 0.6); head.quat.slerp(tmpQ, 0.55); head.scl.lerp(tmpS, 0.5); }
  head.found = true; head.lms = lms;
  head.jaw += (jawOpen - head.jaw) * 0.6;
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
    head.fitS += (s - head.fitS) * 0.5;
    head.fitX += (qmx - head.fitS * pmx - head.fitX) * 0.7;
    head.fitY += (qmy - head.fitS * pmy - head.fitY) * 0.7;
  }
  corr.set(head.fitS, 0, 0, head.fitX,  0, head.fitS, 0, head.fitY,  0, 0, 1, 0,  0, 0, 0, 1);
  cam.projectionMatrix.copy(baseProj).premultiply(corr);
  cam.projectionMatrixInverse.copy(cam.projectionMatrix).invert();

  // the user's manual fit: overall size, per-axis stretch and position (local +x is your left, so the mirror view flips it)
  fitM.makeScale(S.fs * S.fw, S.fs * S.fh, S.fs * S.fd).setPosition(-S.fx, S.fy, S.fz);
  headGroup.matrix.copy(tmpM).multiply(fitM);
  headGroup.matrixWorldNeedsUpdate = true;          // we set the matrix by hand, so tell three.js it changed
  headGroup.visible = true;
  jawPivot.rotation.x = Math.min(1, Math.max(0, head.jaw)) * 0.36;
}
