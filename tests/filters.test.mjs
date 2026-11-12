// The One Euro filters and the render-quality controller.
import test from "node:test";
import assert from "node:assert/strict";
import { OneEuro, OneEuroVec3, stepSeconds } from "../src/filters.js";
import { allKeys } from "../src/i18n.js";

test("a still signal settles on its value, the first sample passes straight through", () => {
  const f = new OneEuro({ minCutoff: 2, beta: 1 });
  assert.equal(f.filter(5, 1 / 30), 5);
  let v = 0; for (let i = 0; i < 200; i++) v = f.filter(7, 1 / 30);
  assert.ok(Math.abs(v - 7) < 1e-6);
});

test("faster movement means less lag", () => {
  const lagAt = speed => {
    const f = new OneEuro({ minCutoff: 2, beta: 1 }); let out = 0;
    for (let i = 0; i < 120; i++) out = f.filter(i / 30 * speed, 1 / 30);
    return (119 / 30 * speed - out) / speed;              // seconds behind
  };
  assert.ok(lagAt(40) < lagAt(2), "lag should shrink as speed grows");
  assert.ok(lagAt(40) < 0.01, "fast movement lags less than 10 ms");
});

test("noise at rest is reduced", () => {
  let seed = 3; const rnd = () => (seed = (seed * 1664525 + 1013904223) >>> 0) / 4294967296 - 0.5;
  const f = new OneEuro({ minCutoff: 2, beta: 1 }); let inVar = 0, outVar = 0;
  for (let i = 0; i < 600; i++) { const n = rnd() * 0.2, o = f.filter(n, 1 / 30); if (i > 60) { inVar += n * n; outVar += o * o; } }
  assert.ok(outVar < inVar * 0.5);
});

test("a 3D point moves straight towards its target", () => {
  const f = new OneEuroVec3({ minCutoff: 2, beta: 0.5 }), p = { x: 0, y: 0, z: 0 }, target = { x: 3, y: 4, z: 0 };
  f.step(p, target, 1 / 30);
  assert.ok(Math.abs(p.y / p.x - 4 / 3) < 1e-9 && p.x > 0 && p.x < 3);
});

test("time steps are kept in a sane range", () => {
  assert.equal(stepSeconds(100000, 0), 0.2);
  assert.equal(stepSeconds(5, 5), 1 / 240);
});

test("English and Chinese interface texts cover the same keys", () => {
  const { en, zh } = allKeys();
  assert.deepEqual([...zh].sort(), [...en].sort());
});

test("render quality steps down when frames are slow and back up when they are easy", async () => {
  globalThis.window = { devicePixelRatio: 2, matchMedia: () => ({ matches: false }) };
  const q = await import("../src/quality.js");
  q.initQuality(); q.setTarget(30);
  assert.equal(q.quality.ratio, 2);
  q.addFrameCost(40); assert.equal(q.evaluate(20), true); assert.equal(q.quality.ratio, 1.5);     // too slow -> lower
  q.addFrameCost(5); assert.equal(q.evaluate(1), false);                                          // background tab is ignored
  let raised = false; for (let i = 0; i < 20 && !raised; i++) { q.addFrameCost(5); raised = q.evaluate(30); }
  assert.ok(raised && q.quality.ratio === 2, "steps back up after a calm stretch");
  delete globalThis.window;
});
