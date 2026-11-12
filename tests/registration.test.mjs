// End-to-end check of the head fitting, without a browser: a pretend person with a known face shape and a known
// jaw opening is "tracked", and the fit must recover both. This is the number to watch when tuning: how far, in
// pixels, the model's key points land from where the tracker saw them.
import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import * as THREE from "three";
import { R } from "../src/render/scene.js";
import { view } from "../src/state.js";
import { head, fitIds, initHead, updateHead, resetHead } from "../src/tracking/head.js";

const META = JSON.parse(readFileSync(new URL("../public/anatomy/meta.json", import.meta.url), "utf8"));
view.W = 1280; view.H = 720;
R.META = META;
R.cam = new THREE.PerspectiveCamera(63, view.W / view.H, 1, 10000); R.cam.updateProjectionMatrix();
R.baseProj = R.cam.projectionMatrix.clone();
R.headGroup = new THREE.Group(); R.headGroup.matrixAutoUpdate = false;
R.jawPivot = new THREE.Group(); R.jawPivot.position.fromArray(META.jawPivot);
R.eyes = [];
initHead(META);

// A person whose face is `w` times as wide and `h` times as tall as the model, jaw swung open by `jaw` radians.
function landmarks(pose, w, h, jaw) {
  const piv = META.jawPivot, lms = [], v = new THREE.Vector3();
  for (const id of fitIds) {
    v.fromArray(META.fit[id]);
    if (id === 152 && jaw) { const y = v.y - piv[1], z = v.z - piv[2]; v.y = piv[1] + y * Math.cos(jaw) - z * Math.sin(jaw); v.z = piv[2] + y * Math.sin(jaw) + z * Math.cos(jaw); }
    v.x *= w; v.y *= h; v.applyMatrix4(pose).applyMatrix4(R.baseProj);
    lms[id] = { x: (v.x + 1) / 2, y: (1 - v.y) / 2, z: 0 };
  }
  return lms;
}
function reprojectionError(lms, skip) {            // mean distance in pixels between model points and tracked points
  const v = new THREE.Vector3(); let sum = 0, n = 0;
  for (const id of fitIds) {
    if (skip.has(id)) continue;
    v.fromArray(META.fit[id]).applyMatrix4(R.headGroup.matrix).applyMatrix4(R.cam.projectionMatrix);
    sum += Math.hypot((v.x - (lms[id].x * 2 - 1)) * view.W / 2, (v.y - (1 - lms[id].y * 2)) * view.H / 2); n++;
  }
  return sum / n;
}
const JAW_POINTS = new Set([152, 61, 291]);

test("the fit recovers a person's face shape and jaw opening", () => {
  resetHead();
  const pose = new THREE.Matrix4().makeRotationFromEuler(new THREE.Euler(-0.05, 0.1, 0.03, "YXZ")).setPosition(-4, 2, -50);
  let now = 1000, lms;
  for (let i = 0; i < 90; i++) { lms = landmarks(pose, 1.06, 0.94, 0); updateHead(pose.elements, lms, 0, now += 33, null); }   // mouth shut
  assert.ok(Math.abs(head.fitS * head.autoW - 1.06) < 0.02, "width: " + (head.fitS * head.autoW).toFixed(3));
  assert.ok(Math.abs(head.fitS * head.autoH - 0.94) < 0.02, "height: " + (head.fitS * head.autoH).toFixed(3));
  assert.ok(head.jawAngle < 0.01, "jaw stays shut: " + head.jawAngle.toFixed(3));
  const shutError = reprojectionError(lms, new Set());
  assert.ok(shutError < 3, "mean reprojection error, mouth shut: " + shutError.toFixed(2) + " px");

  const fitBefore = head.fitS;
  for (let i = 0; i < 45; i++) { lms = landmarks(pose, 1.06, 0.94, 0.3); updateHead(pose.elements, lms, 0.7, now += 33, null); }  // mouth open
  assert.ok(Math.abs(head.jawAngle - 0.3) < 0.04, "jaw angle: " + head.jawAngle.toFixed(3));
  assert.ok(Math.abs(head.fitS - fitBefore) < 0.005, "opening the mouth must not rescale the skull");
  const openError = reprojectionError(lms, JAW_POINTS);
  assert.ok(openError < 3, "mean reprojection error, mouth open: " + openError.toFixed(2) + " px");
  console.log("  reprojection error: " + shutError.toFixed(2) + " px (mouth shut), " + openError.toFixed(2) + " px (mouth open), on a 1280x720 picture");
});

test("a new person is measured afresh", () => {
  const pose = new THREE.Matrix4().setPosition(0, 0, -50);
  let now = 100000;
  head.found = false;                                                       // the previous face has left
  for (let i = 0; i < 90; i++) updateHead(pose.elements, landmarks(pose, 0.95, 1.05, 0), 0, now += 33, null);
  assert.ok(Math.abs(head.fitS * head.autoW - 0.95) < 0.02 && Math.abs(head.fitS * head.autoH - 1.05) < 0.02);
});
