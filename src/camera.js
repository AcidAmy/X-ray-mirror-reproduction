// Camera capture. The video only ever goes to the <video> element and the in-browser trackers; nothing is uploaded.
let stream = null;

// onLost runs if the camera goes away later (unplugged, permission withdrawn).
export async function startCamera(video, onLost) {
  if (!window.isSecureContext)
    throw new Error("the camera only works on https:// pages or on localhost.");
  if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia)
    throw new Error("this browser will not give this page a camera. Try Chrome or Edge.");
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

// Turn a start-up failure into a sentence a person can act on. stageName says which step failed.
export function describeStartError(err, stageName) {
  const name = err && err.name, msg = err && err.message ? err.message : String(err);
  if (stageName === "camera") {
    if (name === "NotAllowedError" || name === "SecurityError")
      return "Camera blocked. Allow camera access for this page and click Start again.";
    if (name === "NotFoundError" || name === "OverconstrainedError")
      return "No camera found. Connect one and click Start again, or try the demo.";
    if (name === "NotReadableError" || name === "AbortError")
      return "The camera is busy or could not start. Close other apps that use it and click Start again.";
  }
  return "Could not load the " + stageName + ": " + msg;
}
