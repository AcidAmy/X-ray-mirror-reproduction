// The anatomy dataset and its decoder.
import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { createHash } from "node:crypto";
import { decodeMeshes } from "../src/anatomy/decode.js";
import { jawWeight } from "../src/anatomy/jaw.js";
import { TERMS, labelText } from "../src/anatomy/terms.js";

const META = JSON.parse(readFileSync(new URL("../public/anatomy/meta.json", import.meta.url), "utf8"));
const bin = readFileSync(new URL("../public/anatomy/anatomy.bin", import.meta.url));
const buffer = bin.buffer.slice(bin.byteOffset, bin.byteOffset + bin.byteLength);

test("anatomy.bin is the file extracted from the original page", () => {
  assert.equal(bin.length, 2032482);
  assert.equal(createHash("sha256").update(bin).digest("hex"), "9ee6b0f7311afc24e5795fdaa54a4e8f80b09cd4890fbd0b5a0b5dfa7adffb54");
});

test("every mesh decodes with the right size and stays inside its bounding box", () => {
  const geos = decodeMeshes(META, buffer);
  assert.equal(Object.keys(geos).length, 23);
  let verts = 0, tris = 0;
  for (const m of META.meshes) {
    const g = geos[m.name], pos = g.getAttribute("position");
    assert.equal(pos.count, m.nv); assert.equal(g.getIndex().count, m.ni);
    verts += m.nv; tris += m.ni / 3;
    for (let i = 0; i < pos.count; i++) for (let k = 0; k < 3; k++) {
      const v = pos.array[i * 3 + k];
      assert.ok(v >= m.min[k] - 1e-3 && v <= m.min[k] + m.size[k] + 1e-3, m.name + " vertex outside its box");
    }
    for (const i of g.getIndex().array) assert.ok(i < m.nv);
    assert.ok(g.getAttribute("normal"), m.name + " has normals");
  }
  assert.equal(verts, 113248); assert.equal(tris, 225499);
});

test("a truncated file is reported, not decoded into garbage", () => {
  assert.throws(() => decodeMeshes(META, buffer.slice(0, 100000)), /cut short/);
});

test("jaw weights: chin rides on the jaw, forehead and neck do not", () => {
  const p = META.jawPivot;
  assert.ok(jawWeight(p, 0, -9.4, 4.3) > 0.95, "chin");
  assert.ok(jawWeight(p, 2.5, -6.5, 4.0) > 0.9, "lower lip area");
  assert.equal(jawWeight(p, 0, 8, 4.4), 0, "forehead");
  assert.equal(jawWeight(p, 0, -1.1, 7.5), 0, "nose tip");
  assert.equal(jawWeight(p, 0, 5, -12), 0, "back of the head");
  assert.equal(jawWeight(p, 0, -15, 0), 0, "neck");
  for (let y = -12; y < 6; y += 0.5) { const w = jawWeight(p, 0, y, 5); assert.ok(w >= 0 && w <= 1); }
});

test("every label has a Chinese name and an explanation in both languages", () => {
  const hand = ["Distal phalanx", "Middle phalanx", "Proximal phalanx", "Metacarpal", "Carpal bones (wrist)"];
  for (const key of [...META.labels.map(l => l.t), ...hand]) {
    const term = TERMS[key];
    assert.ok(term, "no entry for " + key);
    assert.ok(term.zh && term.en && term.zhInfo, "incomplete entry for " + key);
  }
  assert.equal(labelText("Maxilla (upper jaw)", "zh", false), "上颌骨");
  assert.equal(labelText("Maxilla (upper jaw)", "zh", true), "上颌骨 Maxilla");
  assert.equal(labelText("Maxilla (upper jaw)", "en", false), "Maxilla (upper jaw)");
});
