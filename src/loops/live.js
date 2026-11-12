// Live loop: every new camera frame goes through the face and hand trackers, then one frame is drawn.
import { S } from "../settings.js";
import { $, setStatus } from "../state.js";
import { head, updateHead } from "../tracking/head.js";
import { trackers } from "../tracking/trackers.js";
import { renderFrame } from "../frame.js";

// Returns a function that stops the loop.
export function startLive() {
  const video = $("video");
  let lastTime = -1, lostAt = 0, said = "", running = true, lastStamp = 0;
  const say = (t, c) => { if (said !== t) { said = t; setStatus(t, c); } };
  function tick() {
    if (!running) return;
    requestAnimationFrame(tick);
    if (video.readyState < 2 || video.currentTime === lastTime) return;
    lastTime = video.currentTime;
    let now = performance.now();
    if (now <= lastStamp) now = lastStamp + 0.01;            // the trackers need strictly increasing timestamps
    lastStamp = now;
    let faceLms = null, hands = [], sides = [];
    try {
      const fr = trackers.face.detectForVideo(video, now);
      faceLms = fr.faceLandmarks && fr.faceLandmarks[0];
      const mat = fr.facialTransformationMatrixes && fr.facialTransformationMatrixes[0];
      if (faceLms && mat) {
        let jaw = 0;
        const bs = fr.faceBlendshapes && fr.faceBlendshapes[0];
        if (bs) for (const c of bs.categories) if (c.categoryName === "jawOpen") jaw = c.score;
        updateHead(mat.data, faceLms, jaw); lostAt = 0;
      } else { faceLms = null; if (!lostAt) lostAt = now; if (now - lostAt > 250) head.found = false; }
      if (trackers.hand && (S.hands || S.reveal === "lens" || S.showdata)) {
        const hr = trackers.hand.detectForVideo(video, now);
        hands = hr.landmarks || [];
        const hd = hr.handedness || hr.handednesses || [];
        // The tracker names hands as if the picture were mirrored; ours is not, so the names are swapped.
        sides = hands.map((h, i) => !!(hd[i] && hd[i][0] && hd[i][0].categoryName === "Left"));
      }
    } catch (e) { say("The tracker hit an error: " + e.message, "bad"); return; }
    say(head.found ? "Tracking your head." + (hands.length ? " Hand bones on." : "")
                   : hands.length ? "Hand found. Face the camera to see inside your head."
                   : "No face found. Face the camera, with light on your face.", head.found || hands.length ? "ok" : "bad");
    renderFrame(now, faceLms, hands, sides);
  }
  tick();
  return () => { running = false; };
}
