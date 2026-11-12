// Which soft tissue moves with the lower jaw.
// The jaw bone is its own mesh and swings on a pivot at the jaw joint. Muscles and skin are single meshes covering
// the whole head, so each of their vertices gets a weight: 0 = fixed to the skull, 1 = rides on the jaw.
// The dividing line runs (seen from the side) from the jaw joint down and forward to the gap between the lips.
// Tissue just above the line stays, tissue below it follows, and the band in between stretches. That is what the
// masseter and the lips really do. Under the chin the weight fades out again so the neck stays put.
// All positions are head coordinates in centimetres: +y up, +z towards the face.
const MOUTH = { y: -4.2, z: 6.0 };          // between the lips, at the front of the face

export function jawWeight(pivot, x, y, z) {
  const py = pivot[1], pz = pivot[2];
  if (z < pz - 1.5) return 0;                                          // behind the jaw joint: skull and neck
  // signed distance below the joint-to-mouth line, in cm
  const ly = MOUTH.y - py, lz = MOUTH.z - pz, len = Math.hypot(ly, lz);
  const below = ((z - pz) * ly - (y - py) * lz) / len;
  const smooth = (a, b, v) => { const t = Math.min(1, Math.max(0, (v - a) / (b - a))); return t * t * (3 - 2 * t); };
  return smooth(-0.3, 1.4, below)                                      // the stretch band along the line
       * smooth(pz - 1.5, pz + 1.0, z)                                 // ease in just in front of the joint
       * smooth(-14.5, -11.0, y);                                      // fade out down the neck
}

// Adds the per-vertex jaw weight to a geometry as the "aJaw" attribute read by the vertex shader.
export function addJawWeights(THREE, geo, pivot) {
  const pos = geo.getAttribute("position"), w = new Float32Array(pos.count);
  for (let i = 0; i < pos.count; i++) w[i] = jawWeight(pivot, pos.getX(i), pos.getY(i), pos.getZ(i));
  geo.setAttribute("aJaw", new THREE.BufferAttribute(w, 1));
}
