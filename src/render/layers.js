// Per-frame material state for the head: which layers show, how bright, where they are cut, how soft the edges are.
import * as THREE from "three";
import { R } from "./scene.js";
import { S } from "../settings.js";
import { updateClip } from "../reveal.js";

// jaw mesh -> head coordinates (the jaw swings on its pivot); the labels need it too
export const jawM = new THREE.Matrix4();
const XRAY_GAIN = { outline: 0.55, muscles: 0.5, cerebrum: 0.36, hindbrain: 0.6, eyeL: 0.9, eyeR: 0.9, irisL: 1.3, irisR: 1.3, pupilL: 0.9, pupilR: 0.9 };
const pivotM = new THREE.Matrix4();

export const solidGain = () => Math.min(1.25, 0.6 + 0.4 * S.bright);

export function applyLayers() {
  const { meshes, jawPivot } = R;
  const clip = updateClip();
  jawPivot.updateMatrix(); meshes.jaw.mesh.updateMatrix();
  jawM.copy(jawPivot.matrix).multiply(meshes.jaw.mesh.matrix);
  const heavy = (S.skull ? 1 : 0) + (S.brain ? 1 : 0) + (S.muscles ? 1 : 0);
  const share = 1 / (0.4 + 0.6 * Math.max(1, heavy));        // several glowing layers at once would wash out to white
  for (const k in meshes) {
    const { mesh, layer, pivot } = meshes[k], u = mesh.material.uniforms;
    mesh.visible = layer === "veil" ? true : !!S[layer];
    // x-ray light adds up, so layers with many overlapping surfaces get a lower share
    u.uGain.value = (S.style === "solid" && k !== "outline") ? solidGain() : S.bright * (XRAY_GAIN[k] || 1) * (layer === "outline" ? 1 : share);
    u.uOpacity.value = layer === "veil" ? 1 - S.real : 1;
    u.uClipOn.value = clip.on; u.uClip.value.set(clip.x, clip.y, clip.z, clip.w);
    u.uFeather.value = S.feather * 0.75; u.uCutSoft.value = S.feather * 5;   // outline softness, and up to 5 cm of fade at a cut
    // meshes on a pivot (jaw, eyeballs) move inside the head; tell the shader where they really are, for the cuts
    if (pivot) { pivot.updateMatrix(); mesh.updateMatrix(); u.uToHead.value.copy(pivotM.copy(pivot.matrix).multiply(mesh.matrix)); }
    else u.uToHead.value.identity();
  }
}
