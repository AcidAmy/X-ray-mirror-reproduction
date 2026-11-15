// Cross-sections of the meshes (the three-view locator is drawn from these).
import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { decodeMeshes } from "../src/anatomy/decode.js";
import { sliceMesh, insideSection, surroundedBy, sectionArea } from "../src/anatomy/section.js";

// a box from (0,0,0) to (2,3,4): 8 corners, 12 triangles
const BOX_POS = new Float32Array([0,0,0, 2,0,0, 2,3,0, 0,3,0, 0,0,4, 2,0,4, 2,3,4, 0,3,4]);
const BOX_IDX = [0,2,1, 0,3,2, 4,5,6, 4,6,7, 0,1,5, 0,5,4, 2,3,7, 2,7,6, 1,2,6, 1,6,5, 3,0,4, 3,4,7];

test("a box cut across each axis gives one closed rectangle of the right size", () => {
  for (const [axis, value, ua, va, area] of [[0, 0.7, 2, 1, 12], [1, 1.5, 0, 2, 8], [2, 3.9, 0, 1, 6]]) {
    const s = sliceMesh(BOX_POS, BOX_IDX, axis, value, ua, va);
    assert.equal(s.loops.length, 1);
    assert.ok(s.loops[0].closed);
    assert.ok(Math.abs(sectionArea(s.loops) - area) < 1e-5, "area across axis " + axis);
  }
});

test("a plane that misses the mesh, or only touches a face, cuts nothing or a whole outline", () => {
  assert.equal(sliceMesh(BOX_POS, BOX_IDX, 1, 3.5, 0, 2).loops.length, 0);
  const touching = sliceMesh(BOX_POS, BOX_IDX, 1, 0, 0, 2);          // exactly on the bottom face
  assert.ok(touching.loops.every(l => l.closed));
});

test("inside and outside of a section", () => {
  const s = sliceMesh(BOX_POS, BOX_IDX, 1, 1.5, 0, 2);
  assert.ok(insideSection(s.segs, 1, 2));
  assert.ok(!insideSection(s.segs, 2.5, 2));
  assert.ok(!insideSection(s.segs, 1, -0.5));
});

test("the head model: closed outlines, and known points fall in the right tissue", () => {
  const META = JSON.parse(readFileSync(new URL("../public/anatomy/meta.json", import.meta.url), "utf8"));
  const bin = readFileSync(new URL("../public/anatomy/anatomy.bin", import.meta.url));
  const geos = decodeMeshes(META, bin.buffer.slice(bin.byteOffset, bin.byteOffset + bin.byteLength));
  const cut = (name, y) => { const g = geos[name]; return sliceMesh(g.getAttribute("position").array, g.getIndex().array, 1, y, 0, 2); };
  // axial sections at several heights: every structure's outline closes
  for (const y of [-6, -2, 1, 4.2, 8, 12]) for (const name of ["skin", "muscles", "cranium", "jaw", "cerebrum", "hindbrain", "eyes"])
    for (const l of cut(name, y).loops) assert.ok(l.closed, name + " has an open outline at y=" + y);
  const inside = (name, x, y, z) => insideSection(cut(name, y).segs, x, z);
  // the label anchors sit on the surface (the eyeball's is on the cornea), so step 1 cm back into the eye
  const [ex, ey, ez] = META.labels.find(l => l.t === "Eyeball").pts[0], eye = [ex, ey, ez - 1];
  assert.ok(inside("eyes", ...eye), "1 cm behind the cornea is inside the eyeball");
  assert.ok(inside("skin", ...eye) && !inside("cerebrum", ...eye));
  // the brain mesh is a surface with a hollow under it: deep in a hemisphere is inside its outline, not inside the mesh
  assert.ok(surroundedBy(cut("cerebrum", 8).segs, 3, -5), "a point in the middle of a hemisphere is brain");
  assert.ok(!surroundedBy(cut("cerebrum", 8).segs, 9.5, -5), "a point out in the scalp is not");
  assert.ok(!surroundedBy(cut("cerebrum", 8).segs, 3, 6.5), "nor is one in front of the forehead");
  assert.ok(!inside("cranium", 3, 8, -5), "and not bone");
  assert.ok(inside("skin", 3, 8, -5) && !inside("skin", 14, 8, -5));
  // the skull is a shell: its section area is far smaller than the area the head outline encloses
  assert.ok(sectionArea(cut("cranium", 8).loops) < 0.4 * sectionArea(cut("skin", 8).loops));
});
