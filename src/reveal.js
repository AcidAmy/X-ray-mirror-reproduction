// "Reveal" modes: cutting planes (in head coordinates, cm) and the round x-ray lens (a CSS mask on the 3D layers).
import { S } from "./settings.js";
import { view } from "./state.js";

// The plane keeps everything where dot(xyz, point) >= w.
export const clipState = { on: 0, x: 1, y: 0, z: 0, w: 0 };

export function updateClip() {
  const reveal = S.reveal;
  let on = 0, x = 1, y = 0, w = 0;
  if (reveal === "left")   { on = 1; x = 1;  y = 0; w = (S.cut - 0.5) * 16; }      // your left = +x
  if (reveal === "right")  { on = 1; x = -1; y = 0; w = (S.cut - 0.5) * 16; }
  if (reveal === "top")    { on = 1; x = 0; y = 1;  w = -9 + (1 - S.cut) * 22; }
  if (reveal === "bottom") { on = 1; x = 0; y = -1; w = -(-9 + S.cut * 22); }
  clipState.on = on; clipState.x = x; clipState.y = y; clipState.z = 0; clipState.w = w;
  return clipState;
}

// The lens follows the first hand's index fingertip, else the mouse, else the nose tip, else the centre.
// Returns { mask, lens }: mask is in the canvas's own (unmirrored) pixels, lens is in on-screen (mirrored) pixels.
export function lensFor(hands, pointer, faceLms) {
  if (S.reveal !== "lens") return { mask: "none", lens: null };
  const { W, H } = view, rad = (0.07 + 0.38 * S.cut) * W;
  let cx, cy;
  if (hands[0]) { cx = hands[0][8].x * W; cy = hands[0][8].y * H; }
  else if (pointer) { cx = W - pointer.x; cy = pointer.y; }
  else if (faceLms && faceLms[1]) { cx = faceLms[1].x * W; cy = faceLms[1].y * H; }
  else { cx = W / 2; cy = H / 2; }
  const mask = "radial-gradient(circle " + rad.toFixed(1) + "px at " + cx.toFixed(1) + "px " + cy.toFixed(1) + "px, #000 " + (98 - 78 * S.feather).toFixed(0) + "%, transparent 100%)";
  return { mask, lens: { x: W - cx, y: cy, r: rad } };
}
