// Cross-sections of the anatomy meshes: cut a triangle mesh with a plane x = c, y = c or z = c (head coordinates, cm).
// No rendering and no three.js in here, so it runs unchanged in the tests.
//
// A triangle that straddles the plane contributes one line segment. Every segment end lies on a mesh edge, and the
// two triangles sharing that edge compute the very same point, so ends are matched by edge (not by comparing
// coordinates) and the segments chain into outlines exactly.

// pos: flat xyz array, idx: triangle indices. axis: 0, 1 or 2, the coordinate held at `value`.
// ua, va: which coordinates become the outline's u and v.
// Returns { segs, loops }:
//   segs   Float32Array, 4 numbers per segment (u0, v0, u1, v1)
//   loops  [{ pts: Float32Array of u,v pairs, closed }], the same segments joined end to end
export function sliceMesh(pos, idx, axis, value, ua, va) {
  const nv = pos.length / 3, segs = [], keys = [];
  const cut = (i, j) => {
    if (i > j) { const s = i; i = j; j = s; }                // always interpolate from the lower index: both triangles agree
    const a = pos[i * 3 + axis], k = (value - a) / (pos[j * 3 + axis] - a);
    segs.push(pos[i * 3 + ua] + (pos[j * 3 + ua] - pos[i * 3 + ua]) * k, pos[i * 3 + va] + (pos[j * 3 + va] - pos[i * 3 + va]) * k);
    keys.push(i * nv + j);
  };
  for (let t = 0; t < idx.length; t += 3) {
    const a = idx[t], b = idx[t + 1], c = idx[t + 2];
    // a vertex lying exactly on the plane counts as above it, so no triangle is ever cut through a corner
    const sa = pos[a * 3 + axis] >= value, sb = pos[b * 3 + axis] >= value, sc = pos[c * 3 + axis] >= value;
    if (sa === sb && sb === sc) continue;
    // o: the vertex alone on its side; p, q: the other two, in the triangle's own order. Every segment is laid down
    // the same way round relative to its triangle's facing, so outlines keep the mesh's sense of inside and outside.
    let o, p, q, alone;
    if (sa !== sb && sa !== sc) { o = a; p = b; q = c; alone = sa; }
    else if (sb !== sa && sb !== sc) { o = b; p = c; q = a; alone = sb; }
    else { o = c; p = a; q = b; alone = sc; }
    if (alone) { cut(o, p); cut(o, q); } else { cut(o, q); cut(o, p); }
  }
  const S = new Float32Array(segs);
  return { segs: S, loops: chain(S, keys) };
}

function chain(segs, keys) {
  const n = keys.length / 2, ends = new Map();              // edge -> the segment ends (segment * 2 + end) that lie on it
  for (let e = 0; e < keys.length; e++) { const list = ends.get(keys[e]); if (list) list.push(e); else ends.set(keys[e], [e]); }
  const used = new Uint8Array(n), loops = [];
  const walk = (seg, from) => {                              // enter `seg` at its end `from`, then keep going
    const out = [segs[seg * 4 + from * 2], segs[seg * 4 + from * 2 + 1]], startKey = keys[seg * 2 + from];
    let closed = false;
    for (;;) {
      used[seg] = 1;
      const to = 1 - from, key = keys[seg * 2 + to];
      if (key === startKey) { closed = true; break; }
      out.push(segs[seg * 4 + to * 2], segs[seg * 4 + to * 2 + 1]);
      let next = -1;
      for (const e of ends.get(key)) if (!used[e >> 1]) { next = e; break; }
      if (next < 0) break;
      seg = next >> 1; from = next & 1;
    }
    loops.push({ pts: new Float32Array(out), closed });
  };
  // outlines with a loose end first (a mesh with a hole in it), starting from that end; everything left is a closed loop
  for (let e = 0; e < keys.length; e += 2) if (!used[e >> 1] && ends.get(keys[e]).length === 1) walk(e >> 1, 0);
  for (let s = 0; s < n; s++) if (!used[s]) walk(s, 0);
  return loops;
}

// Is the point (u, v) inside the outline? Winding rule: count the outline's turns around the point, by the segments a
// ray towards +u crosses (up counts +1, down -1). Parts of a mesh that overlap (the brain's lobes are separate closed
// surfaces pushed into each other) therefore still read as inside, and a shell inside a shell facing the other way
// (the inner and outer tables of the skull) reads as "bone between the two". Canvas fills use the same rule.
export function insideSection(segs, u, v) {
  let turns = 0;
  for (let i = 0; i < segs.length; i += 4) {
    const v0 = segs[i + 1], v1 = segs[i + 3];
    if ((v0 > v) === (v1 > v)) continue;
    if (u < segs[i] + (v - v0) / (v1 - v0) * (segs[i + 2] - segs[i])) turns += v1 > v0 ? 1 : -1;
  }
  return turns !== 0;
}

// Does the outline surround the point: is there some of it to the left, to the right, above and below?
// For a mesh that is only a surface with nothing modelled under it (the brain mesh is the grey matter; a section shows
// it as a ribbon, often open on one side), this is what "inside the organ" means: deep in a hemisphere the point is
// outside the ribbon itself, yet has cortex on every side.
export function surroundedBy(segs, u, v) {
  let left = false, right = false, above = false, below = false;
  for (let i = 0; i < segs.length; i += 4) {
    const u0 = segs[i], v0 = segs[i + 1], u1 = segs[i + 2], v1 = segs[i + 3];
    if ((v0 > v) !== (v1 > v)) { if (u0 + (v - v0) / (v1 - v0) * (u1 - u0) > u) right = true; else left = true; }
    if ((u0 > u) !== (u1 > u)) { if (v0 + (u - u0) / (u1 - u0) * (v1 - v0) > v) above = true; else below = true; }
  }
  return left && right && above && below;
}

// Area enclosed by the closed loops: the signed sum, so a hole (a loop wound the other way) subtracts.
// Exact for nested shells; where separate parts overlap, the overlap is counted once per part.
export function sectionArea(loops) {
  let sum = 0;
  for (const l of loops) {
    if (!l.closed) continue;
    const p = l.pts, n = p.length / 2;
    for (let i = 0; i < n; i++) { const j = (i + 1) % n; sum += p[i * 2] * p[j * 2 + 1] - p[j * 2] * p[i * 2 + 1]; }
  }
  return Math.abs(sum) / 2;
}
