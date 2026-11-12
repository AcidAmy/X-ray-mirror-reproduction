// Tracking read-out: the raw tracked points drawn over the picture, the text panel, and the frame rate.
import * as THREE from "three";
import { S, LAYERS } from "../settings.js";
import { $, view } from "../state.js";
import { head } from "../tracking/head.js";

let frames = 0, fps = 0, fpsAt = 0, dataAt = 0;
const HAND_CHAINS = [[0,1,2,3,4],[0,5,6,7,8],[5,9,10,11,12],[9,13,14,15,16],[13,17,18,19,20],[0,17]];
const eu = new THREE.Euler();

// Count one drawn frame; the rate is refreshed once a second and always shown beside the status line.
export function countFrame(now) {
  frames++;
  if (now - fpsAt >= 1000) {
    fps = Math.round(frames * 1000 / (now - fpsAt)); frames = 0; fpsAt = now;
    $("fps").textContent = fps + " fps";
  }
}
export function resetFps() { frames = 0; fps = 0; fpsAt = performance.now(); $("fps").textContent = ""; }

export function drawTrackingData(g, now, faceLms, hands, sides) {
  const { W, H } = view;
  if (faceLms) { g.fillStyle = "rgba(127,255,170,.85)"; for (const p of faceLms) if (p) g.fillRect((1 - p.x) * W - 1, p.y * H - 1, 2, 2); }
  g.strokeStyle = "rgba(255,183,3,.9)"; g.fillStyle = "#ffb703"; g.lineWidth = 1.5;
  for (const lms of hands) {
    for (const c of HAND_CHAINS) {
      g.beginPath(); c.forEach((i, k) => { const x = (1 - lms[i].x) * W, y = lms[i].y * H; k ? g.lineTo(x, y) : g.moveTo(x, y); }); g.stroke();
    }
    for (const p of lms) { g.beginPath(); g.arc((1 - p.x) * W, p.y * H, 3, 0, 6.3); g.fill(); }
  }
  if (now - dataAt > 120) {
    dataAt = now;
    const pad = k => (k + "                  ").slice(0, 18), rows = [];
    if (head.found) {
      eu.setFromQuaternion(head.quat, "YXZ");
      const deg = r => (r * 57.2958).toFixed(0) + "°";
      rows.push(["face", "tracked, " + (faceLms ? faceLms.length : 0) + " points"],
                ["distance", (-head.pos.z).toFixed(0) + " cm (estimate)"],
                ["turn / nod / tilt", deg(eu.y) + " / " + deg(eu.x) + " / " + deg(eu.z)],
                ["jaw open", head.jaw.toFixed(2)],
                ["screen fit", "scale " + head.fitS.toFixed(3) + ", shift " + head.fitX.toFixed(3) + ", " + head.fitY.toFixed(3)]);
    } else rows.push(["face", "not found"]);
    rows.push(["hands", hands.length ? hands.map((h, i) => sides[i] ? "right" : "left").join(" + ") : "none"]);
    if (hands[0]) rows.push(["index fingertip", (1 - hands[0][8].x).toFixed(2) + ", " + hands[0][8].y.toFixed(2)]);
    rows.push(["layers", LAYERS.filter(k => S[k]).join(", ") || "none"], ["speed", fps + " frames/s"]);
    $("data").textContent = rows.map(r => pad(r[0]) + r[1]).join("\n");
  }
}
