// Live loop: every new camera frame goes through the face and hand trackers, then one frame is drawn.
// The camera frame is first copied to the #frame canvas, and the trackers read that copy. The picture on screen
// and the anatomy drawn over it therefore always come from the same instant; showing the live <video> instead
// would put the picture one detection-time ahead of the overlay, which reads as the overlay lagging behind.
import { S } from "../settings.js";
import { $, setStatus } from "../state.js";
import { head, updateHead, gazeFromBlendshapes } from "../tracking/head.js";
import { trackers } from "../tracking/trackers.js";
import { renderFrame } from "../frame.js";
import { addFrameCost, setTarget } from "../quality.js";
import { setPresence, clearPresence } from "../ui.js";

// Returns a function that stops the loop.
export function startLive() {
  const video = $("video"), frame = $("frame"), fg = frame.getContext("2d");
  let lastTime = -1, lostAt = 0, said = "", running = true, lastStamp = 0, handGap = 0;
  const track = video.srcObject && video.srcObject.getVideoTracks()[0];
  setTarget(Math.min(30, (track && track.getSettings().frameRate) || 30));
  const say = (t, c) => { if (said !== t) { said = t; setStatus(t, c); } };
  function tick() {
    if (!running) return;
    requestAnimationFrame(tick);
    if (video.readyState < 2 || video.currentTime === lastTime) return;
    lastTime = video.currentTime;
    let now = performance.now();
    if (now <= lastStamp) now = lastStamp + 0.01;            // the trackers need strictly increasing timestamps
    lastStamp = now;
    let faceLms = null, hands = [], sides = [], handsWorld = [];
    try {
      const vw = video.videoWidth, vh = video.videoHeight;
      if (frame.width !== vw || frame.height !== vh) { frame.width = vw; frame.height = vh; }
      fg.drawImage(video, 0, 0, vw, vh);
      const fr = trackers.face.detectForVideo(frame, now);
      faceLms = fr.faceLandmarks && fr.faceLandmarks[0];
      const mat = fr.facialTransformationMatrixes && fr.facialTransformationMatrixes[0];
      if (faceLms && mat) {
        const bs = fr.faceBlendshapes && fr.faceBlendshapes[0], score = {};
        if (bs) for (const c of bs.categories) score[c.categoryName] = c.score;
        updateHead(mat.data, faceLms, score.jawOpen || 0, now, bs ? gazeFromBlendshapes(score) : null); lostAt = 0;
      } else { faceLms = null; if (!lostAt) lostAt = now; if (now - lostAt > 250) head.found = false; }
      // Hand tracking costs about as much as face tracking. While no hand is in view, only look for one on
      // every third frame; as soon as one appears it is tracked on every frame again.
      if (trackers.hand && (S.hands || S.reveal === "lens" || S.showdata) && ++handGap >= 3) {
        const hr = trackers.hand.detectForVideo(frame, now);
        hands = hr.landmarks || []; handsWorld = hr.worldLandmarks || [];
        handGap = hands.length ? 3 : 0;
        const hd = hr.handedness || hr.handednesses || [];
        // The tracker names hands as if the picture were mirrored; ours is not, so the names are swapped.
        sides = hands.map((h, i) => !!(hd[i] && hd[i][0] && hd[i][0].categoryName === "Left"));
      }
    } catch (e) { say("The tracker hit an error: " + e.message, "bad"); return; }
    say(head.found ? "Tracking your head." + (hands.length ? " Hand bones on." : "")
                   : hands.length ? "Hand found. Face the camera to see inside your head."
                   : "No face found. Face the camera, with light on your face.", head.found || hands.length ? "ok" : "bad");
    renderFrame(now, faceLms, hands, sides, handsWorld);
    setPresence(head.found || hands.length > 0, now);
    addFrameCost(performance.now() - now);
  }
  tick();
  return () => { running = false; clearPresence(); };
}
