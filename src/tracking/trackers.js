// MediaPipe face and hand trackers. Both run in the browser (WebAssembly + WebGL).
// The runtime and models are served from this site when present (see scripts/setup-assets.mjs);
// otherwise they are loaded from the same online addresses the original page used.
import { FilesetResolver, FaceLandmarker, HandLandmarker } from "@mediapipe/tasks-vision";

const BASE = import.meta.env.BASE_URL;
const REMOTE_WASM = "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.14/wasm";
const REMOTE_MODELS = "https://storage.googleapis.com/mediapipe-models/";
const FACE_REMOTE = REMOTE_MODELS + "face_landmarker/face_landmarker/float16/1/face_landmarker.task";
const HAND_REMOTE = REMOTE_MODELS + "hand_landmarker/hand_landmarker/float16/1/hand_landmarker.task";

// Is this file really on our own server? (Dev servers answer missing files with the HTML page, so check the type.)
async function hasLocal(url) {
  try {
    const r = await fetch(url, { method: "HEAD" });
    return r.ok && !(r.headers.get("content-type") || "").includes("text/html");
  } catch (e) { return false; }
}

export const trackers = { face: null, hand: null, source: "" };
let loading = null;

export function loadTrackers() {
  return loading || (loading = load().catch(e => { loading = null; throw e; }));
}

async function load() {
  const [wasmLocal, faceLocal, handLocal] = await Promise.all([
    hasLocal(BASE + "wasm/vision_wasm_internal.wasm"), hasLocal(BASE + "models/face_landmarker.task"), hasLocal(BASE + "models/hand_landmarker.task")]);
  const files = await FilesetResolver.forVisionTasks(wasmLocal ? BASE + "wasm" : REMOTE_WASM);
  const faceModel = faceLocal ? BASE + "models/face_landmarker.task" : FACE_REMOTE;
  const handModel = handLocal ? BASE + "models/hand_landmarker.task" : HAND_REMOTE;
  trackers.source = (wasmLocal && faceLocal && handLocal) ? "local" : "online";
  const mkFace = d => FaceLandmarker.createFromOptions(files, { baseOptions: { modelAssetPath: faceModel, delegate: d },
    runningMode: "VIDEO", numFaces: 1, outputFacialTransformationMatrixes: true, outputFaceBlendshapes: true });
  const mkHand = d => HandLandmarker.createFromOptions(files, { baseOptions: { modelAssetPath: handModel, delegate: d },
    runningMode: "VIDEO", numHands: 2 });
  try { trackers.face = await mkFace("GPU"); } catch (e) { trackers.face = await mkFace("CPU"); }
  try { try { trackers.hand = await mkHand("GPU"); } catch (e) { trackers.hand = await mkHand("CPU"); } }
  catch (e) { trackers.hand = null; }                      // the head view still works without hand tracking
  return trackers;
}
