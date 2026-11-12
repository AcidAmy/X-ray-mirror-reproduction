// Makes the app self-contained: copies the MediaPipe wasm runtime out of node_modules and downloads the two
// tracker models into public/. If a download fails the app still works: it falls back to the online copies.
import { cpSync, existsSync, mkdirSync, statSync, writeFileSync } from "node:fs";

const root = new URL("../", import.meta.url);
const wasmSrc = new URL("node_modules/@mediapipe/tasks-vision/wasm/", root);
const wasmDst = new URL("public/wasm/", root);
if (existsSync(wasmSrc)) { cpSync(wasmSrc, wasmDst, { recursive: true }); console.log("wasm runtime -> public/wasm"); }
else console.warn("wasm runtime not found in node_modules (run npm install first)");

const BASE = "https://storage.googleapis.com/mediapipe-models/";
const MODELS = {
  "face_landmarker.task": BASE + "face_landmarker/face_landmarker/float16/1/face_landmarker.task",
  "hand_landmarker.task": BASE + "hand_landmarker/hand_landmarker/float16/1/hand_landmarker.task"
};
const dir = new URL("public/models/", root);
mkdirSync(dir, { recursive: true });
for (const [name, url] of Object.entries(MODELS)) {
  const file = new URL(name, dir);
  if (existsSync(file) && statSync(file).size > 1e6) { console.log(name, "already present"); continue; }
  try {
    const r = await fetch(url);
    if (!r.ok) throw new Error("HTTP " + r.status);
    const buf = Buffer.from(await r.arrayBuffer());
    writeFileSync(file, buf);
    console.log(name, "downloaded,", buf.length, "bytes");
  } catch (e) {
    console.warn(name, "could not be downloaded (" + e.message + "); the app will load it online instead");
  }
}
