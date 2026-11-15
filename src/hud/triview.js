// Three-view locator: axial, coronal and sagittal sections through one point of the head model, with a crosshair
// that ties the three pictures and the 3D head together.
//
// The sections are cut from the model's own meshes (src/anatomy/section.js), so they line up with the 3D head
// exactly. The cursor is a point in head coordinates (cm; +x is the person's left, +y up, +z towards the face).
// Pictures follow the reading convention of CT and MRI: axial seen from the feet, coronal seen from the front
// (the person's left is on the right of the picture), sagittal with the face to the left.
// The jaw is shown closed, as the dataset stores it.
import * as THREE from "three";
import { R } from "../render/scene.js";
import { S } from "../settings.js";
import { $ } from "../state.js";
import { t, lang, onLanguage } from "../i18n.js";
import { labelText } from "../anatomy/terms.js";
import { sliceMesh, insideSection, surroundedBy } from "../anatomy/section.js";

import { initSectionLayout, syncSectionLayout } from "./section-layout.js";
import { sampleVolume } from "../anatomy/volume.js";
import { pinchStep } from "../anatomy/interaction.js";
import { view } from "../state.js";
import { updateFixedSection, resetFixedSection } from "./fixed-section.js";
import { loadMRI, getVolume, mriSlice } from "./mri.js";
let fixedOn=false, gestureOn=false, gestureAxis=1, pinch={active:false}, lastInteraction=-Infinity;
let imageMode = "model", textureOn = false, contrast = 1, mriStatus = "", loadingMRI = false;
async function requestMRI() {
  if (loadingMRI) return;
  loadingMRI = true; mriStatus = "mri.loading"; updateMRIStatus();
  try { await loadMRI(); mriStatus = "mri.ready"; }
  catch { mriStatus = "mri.error"; }
  finally { loadingMRI = false; updateMRIStatus(); drawAll(); }
}
function updateMRIStatus() {
  $("mri_status").textContent = mriStatus ? t(mriStatus) : "";
  $("mri_retry").hidden = mriStatus !== "mri.error";
}
const AX = { x: 0, y: 1, z: 2 };
// plane: the coordinate each view holds fixed. u, v: the coordinates across and up the picture; su = -1 flips across.
// edges: the direction letters at the left, right, top and bottom of the picture.
const VIEWS = [
  { id: "axial",    plane: AX.y, u: AX.x, v: AX.z, su: 1,  edges: "RLAP", color: "#ff9a62" },
  { id: "coronal",  plane: AX.z, u: AX.x, v: AX.y, su: 1,  edges: "RLSI", color: "#7fe08a" },
  { id: "sagittal", plane: AX.x, u: AX.z, v: AX.y, su: -1, edges: "APSI", color: "#7fd1ff" }
];
const PLANE_COLOR = [VIEWS[2].color, VIEWS[0].color, VIEWS[1].color];      // by fixed coordinate: x sagittal, y axial, z coronal
// what is drawn, back to front. tissue: the name reported when the cursor is inside; layer, only: which labels belong
// to it. hollow: the brain meshes are the grey-matter surface with nothing modelled beneath it, so the cursor counts
// as inside them wherever their outline surrounds it.
const PARTS = [
  { mesh: "skin",      fill: "rgba(111,182,255,.10)", line: "rgba(111,182,255,.85)", tissue: "other" },
  { mesh: "muscles",   fill: "rgba(255,107,94,.50)",  line: "rgba(255,107,94,.9)",   tissue: "muscle",    layer: "muscles" },
  { mesh: "cranium",   fill: "#e9e2cf",               line: "#fffaf0",               tissue: "bone",      layer: "skull" },
  { mesh: "jaw",       fill: "#e9e2cf",               line: "#fffaf0",               tissue: "bone",      layer: "skull" },
  { mesh: "cerebrum",  fill: "rgba(255,159,192,.72)", line: "#ffc2d6",               tissue: "cerebrum",  layer: "brain", only: /lobe$/, hollow: true },
  { mesh: "hindbrain", fill: "rgba(255,195,122,.78)", line: "#ffd9a8",               tissue: "hindbrain", layer: "brain", only: /^(Cerebellum|Pons|Medulla)/, hollow: true },
  { mesh: "eyes",      fill: "#fff3a8",               line: "#fffbe0",               tissue: "eye",       layer: "eyes" }
];
const DOT_COLOR = { skull: "#d9f0ff", brain: "#ffc2d6", muscles: "#ffb3aa", eyes: "#fff3a8" };
const CENTRE = [-0.3, 1, -4], HALF = 14.6;       // every view shows the same 29 cm square around this point
const NEAR_PLANE = 0.7;                          // a label within this distance of a view's plane is dotted in that view (cm)
const START = [0, 4.2, -3];                      // through the eyes, the temporal lobes and the cerebellum

const cur = START.slice();                       // the cursor, head coordinates (cm)
let box = null;                                  // the model's bounding box: [[minX, minY, minZ], [maxX, maxY, maxZ]]
let onPick = () => {};                           // called with a label key when the visitor asks about a structure
let marker = null, nearest = null;
const cache = VIEWS.map(() => ({ value: NaN, parts: [] }));        // per view: the section at the plane last drawn

const ready = () => !!(R.geos && box);

function prepare() {
  if (box || !R.geos) return;
  const pos = R.geos.skin.getAttribute("position").array, lo = [1e9, 1e9, 1e9], hi = [-1e9, -1e9, -1e9];
  for (let i = 0; i < pos.length; i++) { lo[i % 3] = Math.min(lo[i % 3], pos[i]); hi[i % 3] = Math.max(hi[i % 3], pos[i]); }
  box = [lo, hi];
  VIEWS.forEach(v => { const s = $("tri_s_" + v.id); s.min = lo[v.plane].toFixed(1); s.max = hi[v.plane].toFixed(1); });
  fillJump();
  buildMarker();
}

// ---- sections ----
function sectionFor(vi) {
  const v = VIEWS[vi], c = cache[vi];
  if (c.value === cur[v.plane]) return c.parts;
  c.value = cur[v.plane];
  c.parts = PARTS.map(part => {
    const geo = R.geos[part.mesh];
    const s = sliceMesh(geo.getAttribute("position").array, geo.getIndex().array, v.plane, c.value, v.u, v.v);
    const path = new Path2D();
    for (const l of s.loops) {
      path.moveTo(l.pts[0], l.pts[1]);
      for (let i = 2; i < l.pts.length; i += 2) path.lineTo(l.pts[i], l.pts[i + 1]);
      path.closePath();          // the skin is open at the neck; closing it there is what a picture of a section shows
    }
    return { part, segs: s.segs, path };
  });
  return c.parts;
}

// Which tissue is the cursor in? Asked of the axial section, innermost structure first.
function tissueAt() {
  const parts = sectionFor(0), v = VIEWS[0];
  for (let i = parts.length - 1; i >= 0; i--)
    if ((parts[i].part.hollow ? surroundedBy : insideSection)(parts[i].segs, cur[v.u], cur[v.v])) return parts[i].part;
  return null;
}

// The label anchor nearest the cursor, among the labels of the tissue the cursor is in (all labels when it is in none).
function nearestLabel(part) {
  let best = null;
  for (const L of R.META.labels) {
    if (part && part.layer && (L.layer !== part.layer || (part.only && !part.only.test(L.t)))) continue;
    for (const p of L.pts) {
      const d = Math.hypot(p[0] - cur[0], p[1] - cur[1], p[2] - cur[2]);
      if (!best || d < best.d) best = { key: L.t, p, d };
    }
  }
  return best;
}

// ---- drawing ----
function drawView(vi) {
  const v = VIEWS[vi], cv = $("tri_c_" + v.id), css = cv.clientWidth;
  if (!css) return;
  const dpr = Math.min(2, window.devicePixelRatio || 1), px = Math.round(css * dpr);
  if (cv.width !== px) cv.width = cv.height = px;
  const g = cv.getContext("2d"), k = css / (HALF * 2);                // CSS pixels per cm
  g.setTransform(dpr, 0, 0, dpr, 0, 0);
  g.fillStyle = "#04060b"; g.fillRect(0, 0, css, css);
  const image = imageMode !== "model" && getVolume() ? mriSlice(v,cur,CENTRE,HALF,contrast) : null;
  if (image) g.drawImage(image,0,0,css,css);
  // model coordinates straight onto the picture
  g.save();
  g.translate(css / 2, css / 2); g.scale(k * v.su, -k); g.translate(-CENTRE[v.u], -CENTRE[v.v]);
  g.lineWidth = 0.8 / k; g.lineJoin = "round";
  for (const { part, path } of sectionFor(vi)) {
    if (!image) { g.fillStyle = part.fill; g.fill(path); }                  // winding rule, as insideSection
    if (!image || imageMode === "blend") { g.strokeStyle = part.line; g.stroke(path); }
  }
  g.restore();
  const X = p => css / 2 + (p - CENTRE[v.u]) * k * v.su, Y = p => css / 2 - (p - CENTRE[v.v]) * k;
  // label anchors lying close to this plane
  for (const L of R.META.labels) for (const p of L.pts) {
    if (Math.abs(p[v.plane] - cur[v.plane]) > NEAR_PLANE) continue;
    g.fillStyle = DOT_COLOR[L.layer] || "#fff"; g.strokeStyle = "rgba(4,7,13,.9)"; g.lineWidth = 1;
    g.beginPath(); g.arc(X(p[v.u]), Y(p[v.v]), 2.4, 0, 6.3); g.fill(); g.stroke();
    if (nearest && nearest.p === p && nearest.d < 0.05) { g.strokeStyle = "#fff"; g.lineWidth = 1.5; g.beginPath(); g.arc(X(p[v.u]), Y(p[v.v]), 5.5, 0, 6.3); g.stroke(); }
  }
  // crosshair: each line is where one of the other two planes meets this picture, in that plane's colour
  const cx = X(cur[v.u]), cy = Y(cur[v.v]), gap = 7;
  g.lineWidth = 1; g.globalAlpha = 0.9;
  g.strokeStyle = PLANE_COLOR[v.u]; g.beginPath(); g.moveTo(cx, 0); g.lineTo(cx, cy - gap); g.moveTo(cx, cy + gap); g.lineTo(cx, css); g.stroke();
  g.strokeStyle = PLANE_COLOR[v.v]; g.beginPath(); g.moveTo(0, cy); g.lineTo(cx - gap, cy); g.moveTo(cx + gap, cy); g.lineTo(css, cy); g.stroke();
  g.globalAlpha = 1;
  // direction letters
  g.font = "600 11px system-ui,-apple-system,PingFang SC,Microsoft YaHei,sans-serif"; g.fillStyle = "rgba(238,241,248,.75)"; g.textBaseline = "middle";
  const [l, r, top, bottom] = [...v.edges].map(d => t("dir." + d));
  g.textAlign = "left"; g.fillText(l, 5, css / 2 + 14); g.textAlign = "right"; g.fillText(r, css - 5, css / 2 + 14);
  g.textAlign = "center"; g.fillText(top, css / 2 + 14, 9); g.fillText(bottom, css / 2 + 14, css - 8);
}

const signed = (v, pos, neg) => t("dir." + (v >= 0 ? pos : neg)) + " " + Math.abs(v).toFixed(1);
function drawAll() {
  if (!ready() || $("tri").hidden) return;
  const volume=getVolume();
  $("tri_voxel").textContent=volume ? t("voxel.read",{name:t("voxel."+sampleVolume(volume,cur,true))}) : t("voxel.pending");
  let part = tissueAt();
  nearest = nearestLabel(part);
  // The label anchors sit on the surface of their structure, where "inside or outside" is a coin toss.
  // A cursor placed exactly on an anchor is taken to be in that label's structure.
  const on = nearestLabel(null);
  if (on && on.d < 0.05) {
    nearest = on;
    const L = R.META.labels.find(l => l.t === on.key);
    part = PARTS.find(q => q.layer === L.layer && (!q.only || q.only.test(L.t))) || part;
  }
  updateTextures();
  VIEWS.forEach((v, i) => { drawView(i); $("tri_s_" + v.id).value = cur[v.plane]; });
  $("tri_pos").textContent = signed(cur[0], "L", "R") + " · " + signed(cur[1], "S", "I") + " · " + signed(cur[2], "A", "P") + " " + t("tri.cm");
  const inside = insideSection(sectionFor(0)[0].segs, cur[0], cur[2]);
  $("tri_tissue").textContent = t("tri.tissue", { name: t("tis." + (part ? part.tissue : inside ? "other" : "out")) });
  const b = $("tri_near");
  b.hidden = !nearest;
  if (nearest) b.textContent = t("tri.near", { name: labelText(nearest.key, lang, S.bilingual), d: nearest.d.toFixed(1) });
}

// ---- the cursor in the 3D head ----
function buildMarker() {
  const [lo, hi] = box, size = [0, 1, 2].map(i => hi[i] - lo[i] + 1.5);
  marker = new THREE.Group(); marker.visible = false;
  const sheet = (axis, w, h, turn) => {
    const color = new THREE.Color(PLANE_COLOR[axis]);
    const m = new THREE.Mesh(new THREE.PlaneGeometry(w, h), new THREE.MeshBasicMaterial({
      color, transparent: true, opacity: 0.1, side: THREE.DoubleSide, depthTest: false, depthWrite: false, blending: THREE.AdditiveBlending }));
    m.add(new THREE.LineSegments(new THREE.EdgesGeometry(m.geometry), new THREE.LineBasicMaterial({ color, transparent: true, opacity: 0.9, depthTest: false })));
    turn(m); m.renderOrder = 20; m.children[0].renderOrder = 21; m.frustumCulled = false;
    marker.add(m); return m;
  };
  marker.planes = [
    sheet(AX.x, size[2], size[1], m => { m.rotation.y = Math.PI / 2; }),
    sheet(AX.y, size[0], size[2], m => { m.rotation.x = -Math.PI / 2; }),
    sheet(AX.z, size[0], size[1], () => {})
  ];
  marker.dot = new THREE.Mesh(new THREE.SphereGeometry(0.28, 12, 8), new THREE.MeshBasicMaterial({ color: 0xffffff, depthTest: false, transparent: true }));
  marker.dot.renderOrder = 22; marker.add(marker.dot);
  R.headGroup.add(marker);
}
function placeMarker() {
  if (!marker) return;
  marker.visible = S.tri && !fixedOn;
  const mid = [0, 1, 2].map(i => (box[0][i] + box[1][i]) / 2);
  marker.planes.forEach((m, axis) => { m.position.fromArray(mid); m.position.setComponent(axis, cur[axis]); });
  marker.dot.position.fromArray(cur);
}

function updateTextures() {
  if (!marker) return;
  if (!marker.images) {
    marker.images = VIEWS.map(v => {
      const corners = [[-1,-1],[1,-1],[-1,1],[1,1]], pos=[];
      for (const [x,y] of corners) { const p=[0,0,0]; p[v.u]=CENTRE[v.u]+x*HALF*v.su; p[v.v]=CENTRE[v.v]+y*HALF; pos.push(...p); }
      const geo = new THREE.BufferGeometry(); geo.setAttribute('position',new THREE.Float32BufferAttribute(pos,3));
      geo.setAttribute('uv',new THREE.Float32BufferAttribute([0,0,1,0,0,1,1,1],2)); geo.setIndex([0,1,2,2,1,3]);
      const m = new THREE.Mesh(geo,new THREE.MeshBasicMaterial({side:THREE.DoubleSide,transparent:true,opacity:.85,depthTest:false,depthWrite:false}));
      m.renderOrder=19; m.visible=false; marker.add(m); return m;
    });
  }
  marker.images.forEach((mesh,i) => {
    mesh.visible = textureOn && !!getVolume();
    if (!mesh.visible) return;
    const v=VIEWS[i], canvas=mriSlice(v,cur,CENTRE,HALF,contrast);
    const key=[cur[v.plane],contrast].join(':');
    if (!mesh.material.map) { mesh.material.map=new THREE.CanvasTexture(canvas); mesh.material.map.colorSpace=THREE.SRGBColorSpace; mesh.material.alphaMap=mesh.material.map; mesh.material.alphaTest=.02; mesh.material.needsUpdate=true; }
    if (mesh.userData.key !== key) { mesh.material.map.needsUpdate=true; mesh.userData.key=key; }
    mesh.position.setComponent(v.plane,cur[v.plane]);
  });
}

// ---- moving the cursor ----
// Move the cursor to a point of the head model (head coordinates, cm). Coordinates left undefined stay as they are.
export function setCursor(p) {
  if (!ready()) return;
  for (let i = 0; i < 3; i++) if (p[i] !== undefined && Number.isFinite(p[i])) cur[i] = Math.min(box[1][i], Math.max(box[0][i], p[i]));
  placeMarker(); drawAll();
}
export const cursor = () => cur.slice();

function fillJump() {
  const sel = $("tri_jump"), keep = sel.value;
  sel.textContent = "";
  sel.add(new Option(t("tri.jump"), ""));
  for (const layer of ["skull", "brain", "muscles", "eyes"]) {
    const group = document.createElement("optgroup"); group.label = t("l." + layer);
    R.META.labels.forEach((L, i) => { if (L.layer === layer) group.appendChild(new Option(labelText(L.t, lang, S.bilingual), String(i))); });
    sel.appendChild(group);
  }
  sel.value = keep;
}

// Show or hide the panel to match the setting, and redraw it. Called whenever a control may have changed something.
export function syncTri() {
  prepare();
  const panel = $("tri"), hide = !S.tri;
  $("q_tri").classList.toggle("on", S.tri);
  if (panel.hidden !== hide) { panel.hidden = hide; window.dispatchEvent(new Event("resize")); }   // the label area moves aside
  syncSectionLayout();
  if (!ready()) return;
  placeMarker(); drawAll();
}

// pick(key): the visitor asked about a structure (clicked the "nearest label" line or chose one from the list).
export function initTriview(pick) {
  onPick = pick;
  initSectionLayout();
  $("tri_fixed").onchange=e=>{fixedOn=e.target.checked;resetFixedSection();if(fixedOn&&!getVolume())requestMRI();placeMarker();};
  $("tri_reanchor").onclick=resetFixedSection;
  $("tri_gesture").onchange=e=>{gestureOn=e.target.checked;pinch={active:false};};
  $("tri_axis").onchange=e=>{gestureAxis=Number(e.target.value);pinch={active:false};};
  $("tri_mode").onchange = e => { imageMode=e.target.value; if (imageMode!=="model" && !getVolume()) requestMRI(); drawAll(); };
  $("tri_texture").onchange = e => { textureOn=e.target.checked; if (textureOn && !getVolume()) requestMRI(); drawAll(); };
  $("tri_contrast").oninput = e => { contrast=Number(e.target.value); drawAll(); };
  $("mri_retry").onclick = requestMRI;
  VIEWS.forEach((v, vi) => {
    const cv = $("tri_c_" + v.id);
    let down = null;
    const at = e => {
      const r = cv.getBoundingClientRect(), k = r.width / (HALF * 2);
      return { px: e.clientX - r.left, py: e.clientY - r.top, k,
               u: CENTRE[v.u] + (e.clientX - r.left - r.width / 2) / k * v.su, v: CENTRE[v.v] - (e.clientY - r.top - r.height / 2) / k };
    };
    const move = e => { const a = at(e), p = []; p[v.u] = a.u; p[v.v] = a.v; setCursor(p); };
    cv.addEventListener("pointerdown", e => { cv.setPointerCapture(e.pointerId); down = { x: e.clientX, y: e.clientY }; move(e); });
    cv.addEventListener("pointermove", e => { if (down) move(e); });
    cv.addEventListener("pointerup", e => {
      if (!down) return;
      const still = Math.hypot(e.clientX - down.x, e.clientY - down.y) < 4; down = null;
      if (!still || !ready()) return;
      // a tap on (or right beside) a label dot lands exactly on that label
      const a = at(e); let best = null;
      for (const L of R.META.labels) for (const p of L.pts) {
        if (Math.abs(p[v.plane] - cur[v.plane]) > NEAR_PLANE) continue;
        const d = Math.hypot(p[v.u] - a.u, p[v.v] - a.v) * a.k;
        if (d < 9 && (!best || d < best.d)) best = { p, d };
      }
      if (best) setCursor(best.p);
    });
    cv.addEventListener("pointercancel", () => { down = null; });
    cv.addEventListener("wheel", e => { e.preventDefault(); const p = []; p[v.plane] = cur[v.plane] - Math.sign(e.deltaY) * 0.2; setCursor(p); }, { passive: false });
    $("tri_s_" + v.id).addEventListener("input", e => { const p = []; p[v.plane] = parseFloat(e.target.value); setCursor(p); });
  });
  $("tri_near").onclick = () => { if (nearest) { const key = nearest.key; setCursor(nearest.p); onPick(key); } };
  $("tri_jump").onchange = e => {
    const L = R.META.labels[Number(e.target.value)];
    if (e.target.value === "" || !L) return;
    // of a left/right pair, go to the one on the side the cursor is already on
    const p = L.pts.reduce((a, b) => (Math.abs(b[0] - cur[0]) < Math.abs(a[0] - cur[0]) ? b : a));
    setCursor(p); onPick(L.t);
    e.target.value = "";
  };
  $("tri_close").onclick = () => { $("q_tri").click(); };
  onLanguage(() => { updateMRIStatus(); if (ready()) { fillJump(); drawAll(); } });
  const sizeObserver=new ResizeObserver(drawAll);
  sizeObserver.observe($("tri"));
  VIEWS.forEach(v=>sizeObserver.observe($("tri_c_"+v.id)));
}

// Called after head pose update. Manual interaction stays available; two hands disable gesture control.
export const wantsSectionHands=()=>S.tri && gestureOn && !fixedOn;
export function updateSectionInteraction(now,hands,found){
  updateFixedSection(now,S.tri&&fixedOn,found,contrast);
  if(!S.tri || !ready() || !gestureOn || fixedOn || !found){pinch={active:false};$("tri_gesture_status").textContent="";return;}
  pinch=pinchStep(pinch,hands,cur[gestureAxis],[box[0][gestureAxis],box[1][gestureAxis]],view.W/view.H);
  $("tri_gesture_status").textContent=t(pinch.active?"play.dragging":"play.waiting");
  if(now-lastInteraction<100 || Math.abs(pinch.value-cur[gestureAxis])<.1)return;
  lastInteraction=now;const p=[];p[gestureAxis]=Math.round(pinch.value*10)/10;setCursor(p);
}

export function resetSectionInteraction(){
  fixedOn=false;gestureOn=false;pinch={active:false};resetFixedSection();
  $("tri_fixed").checked=false;$("tri_gesture").checked=false;$("tri_gesture_status").textContent="";
  placeMarker();
}
