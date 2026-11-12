// The 3D scene: renderer, the two cameras, the head meshes and the two hand rigs.
import * as THREE from "three";
import { makeMat } from "./shaders.js";
import { $, view } from "../state.js";
import { S } from "../settings.js";
import { quality } from "../quality.js";

// Finger bones as pairs of MediaPipe hand landmark numbers (thumb, index, middle, ring, little finger).
export const BONES = [[1,2],[2,3],[3,4],[5,6],[6,7],[7,8],[9,10],[10,11],[11,12],[13,14],[14,15],[15,16],[17,18],[18,19],[19,20]];

// Everything the other modules need from the scene.
export const R = {
  renderer: null, headScene: null, handScene: null,
  cam: null,          // perspective camera for the head (the tracker reports a metric head pose)
  ortho: null,        // pixel-space camera for the hands (the tracker reports hand points on screen)
  baseProj: null,     // the head camera's projection before the per-frame screen-fit correction
  headGroup: null, jawPivot: null,
  meshes: {},         // name -> { mesh, layer, fixedMode }
  handRigs: [],       // two hands, each: { group, palm, bones[], pts }
  META: null
};

export function buildScene(META, geos) {
  R.META = META;
  const renderer = R.renderer = new THREE.WebGLRenderer({ canvas: $("gl"), alpha: true, antialias: true });
  renderer.setClearColor(0x000000, 0);
  renderer.autoClear = false;
  R.headScene = new THREE.Scene(); R.handScene = new THREE.Scene();
  // MediaPipe places the face for a camera with a 63 degree vertical field of view.
  R.cam = new THREE.PerspectiveCamera(63, view.W / view.H, 1, 10000);
  R.ortho = new THREE.OrthographicCamera(0, view.W, view.H, 0, -5000, 5000);

  const headGroup = R.headGroup = new THREE.Group(); headGroup.matrixAutoUpdate = false; headGroup.visible = false;
  R.headScene.add(headGroup);
  const jawPivot = R.jawPivot = new THREE.Group(); jawPivot.position.fromArray(META.jawPivot); headGroup.add(jawPivot);
  const add = (name, geo, layer, xray, solid, order, parent, mode) => {
    const mesh = new THREE.Mesh(geo, makeMat(xray, solid, mode));
    mesh.renderOrder = order; mesh.frustumCulled = false;
    (parent || headGroup).add(mesh);
    R.meshes[name] = { mesh, layer, fixedMode: mode };
    return mesh;
  };
  add("veil", geos.skin, "veil", 0x04070d, 0x04070d, -10, null, 2).material.uniforms.uFade.value = 1;
  add("outline", geos.skin, "outline", 0x6fb6ff, 0x6fb6ff, 1, null, 0).material.uniforms.uFade.value = 1;
  add("muscles", geos.muscles, "muscles", 0xff6b5e, 0xb5453c, 2);
  add("cranium", geos.cranium, "skull", 0xbfe3ff, 0xe9e2cf, 3);
  const jaw = add("jaw", geos.jaw, "skull", 0xbfe3ff, 0xe9e2cf, 3, jawPivot);
  jaw.position.fromArray(META.jawPivot).multiplyScalar(-1);
  add("eyes", geos.eyes, "eyes", 0xfff3a8, 0xf4f4ee, 4);
  add("cerebrum", geos.cerebrum, "brain", 0xff9fc0, 0xe2a39d, 5);
  add("hindbrain", geos.hindbrain, "brain", 0xffc37a, 0xd6ad84, 5);

  for (let h = 0; h < 2; h++) {
    const group = new THREE.Group(); group.visible = false; R.handScene.add(group);
    const mk = geo => { const m = new THREE.Mesh(geo, makeMat(0xd9f0ff, 0xe9e2cf)); m.material.uniforms.uOrtho.value = 1;
                        m.matrixAutoUpdate = false; m.frustumCulled = false; group.add(m); return m; };
    R.handRigs.push({ group, palm: mk(geos.hand_palm), bones: BONES.map(([a, b]) => mk(geos["hand_b_" + a + "_" + b])),
                      pts: null, seen: 0 });
  }
  applyStyle(); resize();
}

function eachMat(fn) {
  for (const k in R.meshes) fn(R.meshes[k].mesh.material, R.meshes[k]);
  for (const r of R.handRigs) { fn(r.palm.material, { layer: "hands" }); for (const b of r.bones) fn(b.material, { layer: "hands" }); }
}

// X-ray adds light without depth; Solid is a normal opaque, depth-tested surface.
export function applyStyle() {
  if (!R.renderer) return;
  const solid = S.style === "solid";
  eachMat((m, info) => {
    if (info.fixedMode !== undefined) return;            // veil and outline keep their own look
    m.uniforms.uMode.value = solid ? 1 : 0;
    m.blending = solid ? THREE.NormalBlending : THREE.AdditiveBlending;
    m.depthTest = solid; m.depthWrite = solid; m.needsUpdate = true;
  });
}

export function resize() {
  const r = $("stage").getBoundingClientRect();
  view.W = Math.max(2, Math.round(r.width)); view.H = Math.max(2, Math.round(r.height));
  // the window, in stage pixels, minus room for the top bar and the quick bar
  const vw = window.innerWidth, vh = window.innerHeight, v = view.vis;
  v.x0 = Math.max(0, -r.left); v.x1 = Math.min(view.W, vw - r.left);
  v.y0 = Math.max(0, -r.top) + 52; v.y1 = Math.min(view.H, vh - r.top) - 76;
  if (v.y1 - v.y0 < 80) { v.y0 = Math.max(0, -r.top); v.y1 = Math.min(view.H, vh - r.top); }
  if (R.renderer) {
    R.renderer.setPixelRatio(quality.ratio);
    R.renderer.setSize(view.W, view.H, false);
    R.cam.aspect = view.W / view.H; R.cam.updateProjectionMatrix(); R.baseProj = R.cam.projectionMatrix.clone();
    R.ortho.right = view.W; R.ortho.top = view.H; R.ortho.updateProjectionMatrix();
  }
  for (const id of ["shade", "hud"]) { const c = $(id); c.width = view.W; c.height = view.H; }
}

// Hide every tracked object and wipe all layers (used when switching between the demo and the camera).
export function clearStage() {
  if (!R.renderer) return;
  R.headGroup.visible = false;
  for (const rig of R.handRigs) rig.group.visible = false;
  R.renderer.clear();
  for (const id of ["frame", "shade", "hud"]) { const c = $(id); c.getContext("2d").clearRect(0, 0, c.width, c.height); }
  for (const id of ["gl", "shade"]) { const st = $(id).style; st.maskImage = "none"; st.webkitMaskImage = "none"; }
}
