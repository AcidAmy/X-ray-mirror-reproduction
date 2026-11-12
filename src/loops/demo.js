// Demo scene (no camera): a pretend head pose and the dataset's own hand are fed through the very same
// updateHead / updateHand / renderFrame path the camera uses, so the demo exercises the real pipeline.
//   #demo          animated
//   ?still#demo    one fixed frame (for comparing pictures with the original page)
//   ?face=1.06,0.94#demo   pretend the visitor's face is 6% wider and 6% shorter than the model
//                          (tests the automatic head-shape fit: it should settle on those numbers)
//   ?dump#demo     after 1.5 s, flatten all layers into one picture laid over the page (for testing)
import * as THREE from "three";
import { R } from "../render/scene.js";
import { $, view, setStatus } from "../state.js";
import { head, fitIds, updateHead } from "../tracking/head.js";
import { renderFrame } from "../frame.js";
import { addFrameCost, setTarget } from "../quality.js";

const FINGERS = [[5, 6, 7, 8], [9, 10, 11, 12], [13, 14, 15, 16], [17, 18, 19, 20]];

// Bend the four fingers of the dataset hand (millimetres) by `angle` radians at each joint, about the knuckle line.
// This is an addition over the original, whose demo hand stood still: it shows the bones following bent fingers.
// In the demo pose the palm faces the camera and nearer-to-camera means a smaller dataset y, so closing
// fingers must move towards -y; the turn direction is picked accordingly.
function curlHand(base, angle) {
  const pts = base.map(p => new THREE.Vector3().fromArray(p));
  if (!angle) return pts;
  const axis = new THREE.Vector3().subVectors(pts[17], pts[5]).normalize();
  const finger = new THREE.Vector3().subVectors(pts[8], pts[5]);
  const dir = finger.clone().applyAxisAngle(axis, 0.3).y < finger.y ? 1 : -1;
  for (const chain of FINGERS) {
    for (let j = 0; j < 3; j++) {
      const pivot = pts[chain[j]].clone();
      for (let k = j + 1; k < 4; k++) pts[chain[k]].sub(pivot).applyAxisAngle(axis, dir * angle * (j === 0 ? 0.8 : 1)).add(pivot);
    }
  }
  return pts;
}

// Returns a function that stops the loop.
export function startDemo() {
  $("intro").hidden = true;
  setStatus("Demo scene (no camera).", "ok");
  const params = new URLSearchParams(location.search), still = params.has("still");
  const META = R.META, base = META.demoHand, cx = base[9][0], cy = base[9][1], cz = base[9][2];
  let running = true, dumped = false;
  setTarget(60);
  const face = (params.get("face") || "1,1").split(",").map(Number), faceW = face[0] || 1, faceH = face[1] || 1;
  const m = new THREE.Matrix4(), eul = new THREE.Euler(), v = new THREE.Vector3();
  function tick() {
    if (!running) return;
    if (!still) requestAnimationFrame(tick);
    const { W, H } = view;
    const now = performance.now(), t = still ? 1.2 : now / 1000;
    m.makeRotationFromEuler(eul.set(-0.06 + 0.05 * Math.sin(t * 0.7), 0.42 * Math.sin(t * 0.5 + 0.9), 0.04, "YXZ"));
    // On an upright (phone) screen the head moves to the top half and further back, with the hand below it.
    const tall = !still && W < H * 0.8;
    if (tall) m.setPosition(1.5 * Math.sin(t * 0.4), 7, -64); else m.setPosition(-5 + 2 * Math.sin(t * 0.4), 1.5, -46);
    const lms = [];
    for (const id of fitIds) { v.fromArray(META.fit[id]); v.x *= faceW; v.y *= faceH; v.applyMatrix4(m).applyMatrix4(R.baseProj); lms[id] = { x: (v.x + 1) / 2, y: (1 - v.y) / 2, z: 0 }; }
    updateHead(m.elements, lms, 0.5 + 0.5 * Math.sin(t * 1.3), now);
    // the dataset's right hand, fingers pointing up, palm to the camera, placed at the side of the picture
    const curl = still ? 0 : 0.55 * Math.max(0, Math.sin(t * 0.9));
    const k = 0.0021 * H / W * (4 / 3) * (tall ? 0.6 : 1), hx = tall ? 0.42 : 0.2, hy = tall ? 0.72 : 0.56;
    const hand = curlHand(base, curl).map(p => ({ x: hx - (p.x - cx) * k, y: hy + (p.z - cz) * k * W / H, z: (p.y - cy) * k }));
    renderFrame(now, fitIds.map(id => lms[id]), [hand], [true]);
    addFrameCost(performance.now() - now);
    if (params.has("dump") && now > 1500 && !dumped) {      // flatten the layers into one picture for testing
      dumped = true;
      const c = document.createElement("canvas"); c.width = W; c.height = H; const x = c.getContext("2d");
      x.fillStyle = "#0b1220"; x.fillRect(0, 0, W, H);
      x.save(); x.translate(W, 0); x.scale(-1, 1); x.drawImage($("shade"), 0, 0, W, H); x.drawImage($("gl"), 0, 0, W, H); x.restore();
      x.drawImage($("hud"), 0, 0);
      const img = new Image(); img.src = c.toDataURL("image/png"); img.id = "demodump";
      img.style.cssText = "position:fixed;left:0;top:0;z-index:99;width:" + W + "px;height:" + H + "px";
      document.body.appendChild(img);
      console.log("DEMO dumped", W, H, "fit", head.fitS.toFixed(3), head.fitX.toFixed(3), head.fitY.toFixed(3));
    }
  }
  tick();
  return () => { running = false; };
}
