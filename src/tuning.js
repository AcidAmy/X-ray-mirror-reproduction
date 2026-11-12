// Every number that decides how the tracking feels lives here.
// Filters: minCutoff (Hz) = steadiness at rest, lower is steadier. beta = how fast lag disappears when moving,
// higher is snappier but lets more jitter through during movement. See src/filters.js.
// Compare settings objectively with `npm run bench`.
export const TUNE = {
  // head position, centimetres
  headPos:   { minCutoff: 2.0, beta: 1.0, dCutoff: 1 },
  // head rotation, radians
  headRot:   { minCutoff: 2.0, beta: 14, dCutoff: 1 },
  // head scale reported by the tracker (dimensionless, changes slowly)
  headScale: { minCutoff: 1.0, beta: 8, dCutoff: 1 },
  // on-screen fit: scale (dimensionless) and shift (screen half-widths)
  fitScale:  { minCutoff: 1.5, beta: 20, dCutoff: 1 },
  fitShift:  { minCutoff: 3.0, beta: 60, dCutoff: 1 },
  // jaw angle, radians
  jaw:       { minCutoff: 3.0, beta: 30, dCutoff: 1 },
  // hand joints, stage pixels
  handPoint: { minCutoff: 2.5, beta: 0.06, dCutoff: 1 },

  // eye direction, radians
  gaze:      { minCutoff: 2.5, beta: 8, dCutoff: 1 },
  // pixels-per-metre scale of a hand (changes slowly)
  handScale: { minCutoff: 1.0, beta: 0.02, dCutoff: 1 },

  // Eyes: how far the eyeballs turn when the tracker reports a full look to the side / up or down (radians).
  // If the eyes turn the wrong way sideways on a real face, set flipSides to true.
  eyes: { maxYaw: 0.5, maxPitch: 0.38, flipSides: false },

  // Jaw: the opening angle is solved from the tracked chin point.
  jawFit: {
    maxAngle: 0.55,       // widest the jaw bone may swing (radians, about 31 degrees)
    closedBelow: 0.06,    // tracker "jawOpen" score under this = mouth shut; used to learn this person's resting chin
    fallbackAngle: 0.36   // radians at a "jawOpen" score of 1, used until the resting chin is known
  },

  // A hand in front of the face hides the anatomy behind it.
  occludeHeadByHands: true,

  // Automatic head-shape fit
  autoFit: {
    maxTurn: 0.26,        // only sample when the face is within about 15 degrees of straight on (radians)
    maxJaw: 0.2,          // ...and the mouth is nearly closed (an open jaw makes the face look longer)
    quickFrames: 30,      // plain average over this many samples, then a slow running average
    min: 0.85, max: 1.2,  // never stretch the model beyond this
    resetAfterMs: 1500    // a face gone for this long counts as a new person
  }
};
