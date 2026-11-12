// Start-up and mode switching: intro -> camera (live) or demo.
import { $, setStatus } from "./state.js";
import { initSettings } from "./settings.js";
import { loadAnatomy } from "./anatomy/decode.js";
import { R, buildScene, applyStyle, resize, clearStage } from "./render/scene.js";
import { initHead, resetHead } from "./tracking/head.js";
import { loadTrackers, trackers } from "./tracking/trackers.js";
import { startCamera, stopCamera, describeStartError } from "./camera.js";
import { initPointer } from "./frame.js";
import { resetFps } from "./hud/data.js";
import { startLive } from "./loops/live.js";
import { startDemo } from "./loops/demo.js";

const video = $("video"), stage = $("stage");
let stopLoop = null;            // stops whichever loop (live or demo) is running
let mode = "intro";             // "intro" | "starting" | "live" | "demo"

initSettings(applyStyle);
initPointer();
new ResizeObserver(resize).observe(stage);

// Load and build the 3D anatomy once; later calls reuse it.
let booted = null;
function boot() {
  return booted || (booted = (async () => {
    const { META, geos } = await loadAnatomy(import.meta.env.BASE_URL);
    initHead(META);
    buildScene(META, geos);
  })().catch(e => { booted = null; throw e; }));
}

function haltLoop() {
  if (stopLoop) { stopLoop(); stopLoop = null; }
  resetHead(); clearStage(); resetFps();
}

function backToIntro() {
  haltLoop(); stopCamera(video);
  stage.style.removeProperty("--ar");
  $("start").disabled = false; $("intro").hidden = false; $("tocamera").hidden = true;
  mode = "intro";
}

async function runCamera() {
  if (mode === "starting" || mode === "live") return;
  haltLoop();
  if (location.hash === "#demo") history.replaceState(null, "", location.pathname + location.search);
  mode = "starting";
  $("start").disabled = true; $("tocamera").hidden = true;
  let stageName = "camera";
  try {
    setStatus("Asking for the camera…");
    const size = await startCamera(video, () => { backToIntro(); setStatus("The camera stopped. Click Start camera to try again.", "bad"); });
    if (size.width && size.height) stage.style.setProperty("--ar", (size.width / size.height).toFixed(4));
    $("intro").hidden = true;
    stageName = "3D engine";
    setStatus("Loading the 3D anatomy…");
    await boot();
    stageName = "trackers";
    setStatus("Loading the face and hand trackers (first time takes a few seconds)…");
    await loadTrackers();
    $("L_hands").disabled = !trackers.hand;
    resize();
    stopLoop = startLive();
    mode = "live";
  } catch (err) {
    backToIntro();                                           // also releases the camera if it was already on
    setStatus(describeStartError(err, stageName), "bad");
  }
}

async function runDemo() {
  if (mode === "starting" || mode === "demo") return;
  haltLoop(); stopCamera(video);
  stage.style.removeProperty("--ar");
  mode = "starting";
  try {
    setStatus("Loading the 3D anatomy…");
    await boot();
    resize();
    $("L_hands").disabled = false;
    stopLoop = startDemo();
    $("tocamera").hidden = false;
    mode = "demo";
  } catch (e) {
    backToIntro();
    setStatus("Demo failed: " + e.message, "bad");
  }
}

$("start").onclick = runCamera;
$("tocamera").onclick = runCamera;
$("trydemo").onclick = () => { if (location.hash !== "#demo") location.hash = "demo"; else runDemo(); };
window.addEventListener("hashchange", () => { if (location.hash === "#demo") runDemo(); });
window.addEventListener("pagehide", () => stopCamera(video));

if (location.hash === "#demo") runDemo();

// Read-only handle for checking the scene from the browser console.
if (import.meta.env.DEV) window.__xr = { R, trackers };
