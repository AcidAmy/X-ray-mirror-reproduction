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
import { initQuality } from "./quality.js";
import { initUI, keepAwake, KIOSK } from "./ui.js";

const video = $("video"), stage = $("stage");
let stopLoop = null;            // stops whichever loop (live or demo) is running
let mode = "intro";             // "intro" | "starting" | "live" | "demo"

initQuality();
initSettings(applyStyle);
initUI();
initPointer();
new ResizeObserver(resize).observe(stage);
// The demo has no camera to dictate a picture shape, so it takes the window's own shape and fills it exactly.
// (?still keeps the original 4:3 so its frame can be compared with the original page.)
function fitDemoToWindow() {
  if (new URLSearchParams(location.search).has("still")) return;
  const ar = Math.min(2.4, Math.max(0.45, window.innerWidth / window.innerHeight));
  stage.style.setProperty("--ar", ar.toFixed(4));
}
window.addEventListener("resize", () => {
  if (mode === "demo") fitDemoToWindow();
  resize();                                                // the stage can keep its size while the window crops it differently
});
const setRunning = on => { document.body.classList.toggle("running", on); keepAwake(on); };
let retryTimer = 0;

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
  mode = "intro"; setRunning(false);
}

async function runCamera() {
  if (mode === "starting" || mode === "live") return;
  clearTimeout(retryTimer);
  haltLoop();
  if (location.hash === "#demo") history.replaceState(null, "", location.pathname + location.search);
  mode = "starting";
  $("start").disabled = true; $("tocamera").hidden = true;
  let stageName = "camera";
  try {
    setStatus("Asking for the camera…");
    const size = await startCamera(video, () => {
      backToIntro(); setStatus("The camera stopped. Click Start camera to try again.", "bad");
      if (KIOSK) retryTimer = setTimeout(runCamera, 5000);
    });
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
    mode = "live"; setRunning(true);
  } catch (err) {
    backToIntro();                                           // also releases the camera if it was already on
    setStatus(describeStartError(err, stageName), "bad");
    if (KIOSK) retryTimer = setTimeout(runCamera, 5000);     // an unattended exhibit keeps trying by itself
  }
}

async function runDemo() {
  if (mode === "starting" || mode === "demo") return;
  clearTimeout(retryTimer);
  haltLoop(); stopCamera(video);
  stage.style.removeProperty("--ar");
  mode = "starting";
  try {
    setStatus("Loading the 3D anatomy…");
    await boot();
    fitDemoToWindow();
    resize();
    $("L_hands").disabled = false;
    stopLoop = startDemo();
    $("tocamera").hidden = false;
    mode = "demo"; setRunning(true);
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
else if (KIOSK) runCamera();                               // exhibit mode starts by itself (the camera must already be allowed)

// Read-only handle for checking the scene from the browser console.
if (import.meta.env.DEV) window.__xr = { R, trackers };
