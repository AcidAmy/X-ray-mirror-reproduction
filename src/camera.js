// Camera capture. The video only ever goes to the <video> element and the in-browser trackers; nothing is uploaded.
import { t } from "./i18n.js";

let stream = null;

// onLost runs if the camera goes away later (unplugged, permission withdrawn).
export async function startCamera(video, onLost) {
  if (!window.isSecureContext)
    throw new Error(t("e.insecure"));
  if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia)
    throw new Error(t("e.unsupported"));
  stopCamera(video);
  stream = await navigator.mediaDevices.getUserMedia({
    video: { facingMode: "user", width: { ideal: 1280 }, height: { ideal: 720 } }, audio: false });
  const mine = stream;
  for (const t of stream.getVideoTracks()) t.addEventListener("ended", () => { if (stream === mine && onLost) onLost(); });
  video.srcObject = stream;
  await video.play();
  return { width: video.videoWidth, height: video.videoHeight };
}

// Always release the camera when we stop using it, so its light goes off and a retry starts clean.
export function stopCamera(video) {
  if (stream) { for (const t of stream.getTracks()) t.stop(); stream = null; }
  if (video) { video.pause(); video.srcObject = null; }
}

export function cameraActive() { return !!stream; }

// Turn a start-up failure into a status line a person can act on: returns [translation key, variables].
// stageName says which step failed: "camera", "engine" or "trackers".
export function describeStartError(err, stageName) {
  const name = err && err.name, msg = err && err.message ? err.message : String(err);
  if (stageName === "camera") {
    if (name === "NotAllowedError" || name === "SecurityError") return ["e.blocked"];
    if (name === "NotFoundError" || name === "OverconstrainedError") return ["e.nocam"];
    if (name === "NotReadableError" || name === "AbortError") return ["e.busy"];
  }
  return ["e.load", { stage: t("stage." + stageName), msg }];
}
