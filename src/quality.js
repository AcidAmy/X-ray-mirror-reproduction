// Automatic render quality. The 3D layer is the expensive part on phones (two-sided, additive, lots of overdraw),
// and its cost scales with the number of pixels. So instead of guessing from the device name, watch how long
// frames really take and step the render resolution down or up to hold the target frame rate.
const LEVELS = [2, 1.5, 1.25, 1, 0.8, 0.65];      // device pixels per CSS pixel for the 3D canvas

export const quality = {
  ratio: 1,            // current pixel ratio for the renderer
  target: 30,          // frames per second we are trying to hold (the camera's rate, or 60 in the demo)
  costMs: 0            // average time spent per frame over the last second
};

let levels = [1], index = 0, floorIndex = 0;       // floorIndex: best level we are still allowed to go back up to
let costSum = 0, costN = 0, calm = 0, sinceDrop = 99;

export function initQuality() {
  const dpr = Math.min(window.devicePixelRatio || 1, 2);
  levels = LEVELS.filter(l => l <= dpr + 1e-6);
  if (!levels.length) levels = [dpr];
  // touch devices start one step down; they are the ones that struggle, and stepping up later is invisible
  const coarse = window.matchMedia && window.matchMedia("(pointer: coarse)").matches;
  index = floorIndex = 0;
  if (coarse && levels.length > 1) index = 1;
  quality.ratio = levels[index];
}

export function setTarget(fps) { quality.target = Math.max(15, Math.min(60, fps || 30)); calm = 0; }

// Call once per drawn frame with the time that frame took (milliseconds).
export function addFrameCost(ms) { costSum += ms; costN++; }

// Call once a second with the measured frame rate. Returns true when the render resolution changed
// (the caller must then resize the renderer).
export function evaluate(fps) {
  const cost = costN ? costSum / costN : 0;
  costSum = 0; costN = 0; quality.costMs = cost;
  sinceDrop++;
  const budget = 1000 / quality.target;
  // A rate below 8 means the page is in the background or throttled, not that the device is slow: ignore it.
  const slow = cost > budget * 0.9 || (fps >= 8 && fps < quality.target * 0.8);
  const easy = cost < budget * 0.45 && fps >= quality.target * 0.93;
  if (slow && index < levels.length - 1) {
    if (sinceDrop < 12) floorIndex = Math.min(levels.length - 1, index + 1);   // we only just stepped up: do not try that again
    index++; calm = 0; sinceDrop = 0;
    quality.ratio = levels[index];
    return true;
  }
  calm = easy ? calm + 1 : 0;
  if (calm >= 6 && index > floorIndex) {
    index--; calm = 0; sinceDrop = 0;
    quality.ratio = levels[index];
    return true;
  }
  return false;
}
