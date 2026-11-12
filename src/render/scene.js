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
  eyes: [],           // [left (+x), right (-x)]: { pivot } groups that turn each eyeball about its own centre
  occluder: null,     // { scene, mesh, texture }: erases the head where a hand is in front of it
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
    // pivot: a group between the head and this mesh that moves it (jaw, eyeballs); the shader needs it to cut correctly
    R.meshes[name] = { mesh, layer, fixedMode: mode, pivot: parent || null };
    return mesh;
  };
  add("veil", geos.skin, "veil", 0x04070d, 0x04070d, -10, null, 2).material.uniforms.uFade.value = 1;
  add("outline", geos.skin, "outline", 0x6fb6ff, 0x6fb6ff, 1, null, 0).material.uniforms.uFade.value = 1;
  add("muscles", geos.muscles, "muscles", 0xff6b5e, 0xb5453c, 2);
  add("cranium", geos.cranium, "skull", 0xbfe3ff, 0xe9e2cf, 3);
  const jaw = add("jaw", geos.jaw, "skull", 0xbfe3ff, 0xe9e2cf, 3, jawPivot);
  jaw.position.fromArray(META.jawPivot).multiplyScalar(-1);
  // The dataset stores both eyeballs as one mesh. Split it down the middle so each can turn about its own centre.
  R.eyes.length = 0;
  for (const [tag, geo] of Object.entries(splitLeftRight(geos.eyes))) {
    geo.computeBoundingBox();
    const centre = centroid(geo), reach = geo.boundingBox.max.z - centre.z;      // reach: centre to the front of the cornea
    const pivot = new THREE.Group(); pivot.position.copy(centre); headGroup.add(pivot);
    add("eye" + tag, geo, "eyes", 0xfff3a8, 0xf4f4ee, 4, pivot).position.copy(centre).multiplyScalar(-1);
    // The dataset eyeball has a cornea but no markings, so a turning eye would look the same as a still one.
    // A thin ring for the iris and a small disc for the pupil make the direction of gaze readable.
    const iris = add("iris" + tag, new THREE.TorusGeometry(reach * 0.36, reach * 0.035, 8, 40), "eyes", 0xfff3a8, 0x3b5368, 4, pivot);
    iris.position.z = reach * 0.93;
    const pupil = add("pupil" + tag, new THREE.CircleGeometry(reach * 0.17, 24), "eyes", 0xfff3a8, 0x0b0b0d, 4, pivot);
    pupil.position.z = reach * 1.005;
    R.eyes.push({ pivot });
  }
  add("cerebrum", geos.cerebrum, "brain", 0xff9fc0, 0xe2a39d, 5);
  add("hindbrain", geos.hindbrain, "brain", 0xffc37a, 0xd6ad84, 5);

  for (let h = 0; h < 2; h++) {
    const group = new THREE.Group(); group.visible = false; R.handScene.add(group);
    const mk = geo => { const m = new THREE.Mesh(geo, makeMat(0xd9f0ff, 0xe9e2cf)); m.material.uniforms.uOrtho.value = 1;
                        m.matrixAutoUpdate = false; m.frustumCulled = false; group.add(m); return m; };
    // each hand needs its own copy of the palm, because the palm is reshaped every frame to follow the knuckles
    R.handRigs.push({ group, palm: mk(geos.hand_palm.clone()), bones: BONES.map(([a, b]) => mk(geos["hand_b_" + a + "_" + b])),
                      pts: null, seen: 0 });
  }
  // Occluder: a screen-sized sheet carrying the hand silhouette. Drawn between the head and the hands with a blend
  // that multiplies what is already there by (1 - silhouette), it wipes the head out wherever a hand covers it.
  const texture = new THREE.Texture(); texture.minFilter = texture.magFilter = THREE.LinearFilter; texture.generateMipmaps = false;
  const sheet = new THREE.Mesh(new THREE.PlaneGeometry(1, 1), new THREE.MeshBasicMaterial({
    map: texture, transparent: true, depthTest: false, depthWrite: false, blending: THREE.CustomBlending,
    blendEquation: THREE.AddEquation, blendSrc: THREE.ZeroFactor, blendDst: THREE.OneMinusSrcAlphaFactor,
    blendSrcAlpha: THREE.ZeroFactor, blendDstAlpha: THREE.OneMinusSrcAlphaFactor }));
  sheet.frustumCulled = false;
  R.occluder = { scene: new THREE.Scene(), mesh: sheet, texture };
  R.occluder.scene.add(sheet);
  applyStyle(); resize();
}

// Splits a mesh into the part on the person's left (+x) and the part on their right (-x).
function splitLeftRight(geo) {
  const pos = geo.getAttribute("position"), idx = geo.getIndex();
  const out = {};
  for (const [tag, sign] of [["L", 1], ["R", -1]]) {
    const remap = new Map(), verts = [], tris = [];
    for (let i = 0; i < idx.count; i += 3) {
      const a = idx.getX(i), b = idx.getX(i + 1), c = idx.getX(i + 2);
      if ((pos.getX(a) + pos.getX(b) + pos.getX(c)) * sign <= 0) continue;
      for (const v of [a, b, c]) {
        if (!remap.has(v)) { remap.set(v, verts.length / 3); verts.push(pos.getX(v), pos.getY(v), pos.getZ(v)); }
        tris.push(remap.get(v));
      }
    }
    const g = new THREE.BufferGeometry();
    g.setAttribute("position", new THREE.BufferAttribute(new Float32Array(verts), 3));
    g.setIndex(new THREE.BufferAttribute(new Uint16Array(tris), 1));
    g.computeVertexNormals();
    out[tag] = g;
  }
  return out;
}
function centroid(geo) {
  const pos = geo.getAttribute("position"), c = new THREE.Vector3();
  for (let i = 0; i < pos.count; i++) { c.x += pos.getX(i); c.y += pos.getY(i); c.z += pos.getZ(i); }
  return c.divideScalar(pos.count);
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
    R.occluder.mesh.scale.set(view.W, view.H, 1); R.occluder.mesh.position.set(view.W / 2, view.H / 2, 0);
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
