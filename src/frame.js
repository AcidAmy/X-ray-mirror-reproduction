// One drawn frame, shared by the live camera loop and the demo loop.
// Layers, back to front: <video>, #shade (2D hand veil), #gl (3D anatomy), #hud (2D labels and read-outs).
// #video, #shade and #gl are mirrored with CSS; #hud is not, so its text reads normally.
import { R } from "./render/scene.js";
import { S } from "./settings.js";
import { $, view } from "./state.js";
import { head } from "./tracking/head.js";
import { updateHand, styleHand, drawHandVeil } from "./tracking/hands.js";
import { applyLayers } from "./render/layers.js";
import { lensFor } from "./reveal.js";
import { drawLabels } from "./hud/labels.js";
import { drawTrackingData, countFrame } from "./hud/data.js";

let pointer = null;
export function initPointer() {
  const stage = $("stage");
  stage.addEventListener("pointermove", e => { const r = stage.getBoundingClientRect(); pointer = { x: e.clientX - r.left, y: e.clientY - r.top }; });
  stage.addEventListener("pointerleave", () => { pointer = null; });
}

// faceLms: face landmarks or null. hands: array of 21-landmark arrays. sides[i]: true when hands[i] is a right hand.
export function renderFrame(now, faceLms, hands, sides) {
  const { W, H } = view, { renderer, handRigs, headGroup } = R;
  // hands
  const sg = $("shade").getContext("2d"); sg.clearRect(0, 0, W, H);
  handRigs.forEach((rig, i) => {
    const lms = hands[i];
    if (lms && S.hands) {
      updateHand(rig, lms, sides[i], now);
      drawHandVeil(sg, lms, (1 - S.real) * 0.92);
      styleHand(rig);
    } else rig.group.visible = false;
  });
  if (!head.found) headGroup.visible = false;
  applyLayers();

  // x-ray lens: a round window; outside it you see the plain camera picture
  const { mask, lens } = lensFor(hands, pointer, faceLms);
  for (const id of ["gl", "shade"]) { const st = $(id).style; st.maskImage = mask; st.webkitMaskImage = mask; }

  renderer.clear();
  renderer.render(R.headScene, R.cam);
  renderer.clearDepth();
  renderer.render(R.handScene, R.ortho);

  // heads-up layer: lens ring, labels, and the tracking points when switched on
  const g = $("hud").getContext("2d"); g.clearRect(0, 0, W, H);
  if (lens) { g.strokeStyle = "rgba(127,209,255,.8)"; g.lineWidth = 2; g.beginPath(); g.arc(lens.x, lens.y, lens.r, 0, 6.3); g.stroke(); }
  if (S.labels) drawLabels(g, lens);
  if (S.showdata) drawTrackingData(g, now, faceLms, hands, sides);
  countFrame(now);
}
