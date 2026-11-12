// Compares the original fixed blending with the One Euro filters on a simulated movement:
// 2 s at rest (measures jitter), then a fast steady sweep (measures lag), with tracker-like noise.
import { OneEuro } from "../src/filters.js";
import { TUNE } from "../src/tuning.js";

function rng(seed) { return () => { seed = (seed * 1664525 + 1013904223) >>> 0; return seed / 4294967296; }; }
function gauss(r) { return Math.sqrt(-2 * Math.log(r() + 1e-12)) * Math.cos(2 * Math.PI * r()); }

function run(make, { fps, noise, speed }) {
  const dt = 1 / fps, r = rng(7), f = make();
  let rest = [], lag = [], out = 0;
  for (let i = 0; i < fps * 4; i++) {
    const t = i * dt, truth = t < 2 ? 0 : (t - 2) * speed;
    out = f(truth + gauss(r) * noise, dt);
    if (t > 0.5 && t < 2) rest.push(out);
    if (t > 2.6) lag.push((truth - out) / speed);          // seconds behind the true position
  }
  const mean = a => a.reduce((s, v) => s + v, 0) / a.length;
  const m = mean(rest), jitter = Math.sqrt(mean(rest.map(v => (v - m) ** 2)));
  return { jitter, lagMs: mean(lag) * 1000 };
}
const lerp = k => () => { let v = null; return x => (v = v === null ? x : v + (x - v) * k); };
const euro = opts => () => { const f = new OneEuro(opts); return (x, dt) => f.filter(x, dt); };

const CASES = [
  ["head position (cm)",   { noise: 0.08,  speed: 40 },  0.6,  TUNE.headPos],
  ["head rotation (rad)",  { noise: 0.006, speed: 2.5 }, 0.55, TUNE.headRot],
  ["screen shift (ndc)",   { noise: 0.002, speed: 1.0 }, 0.7,  TUNE.fitShift],
  ["hand joint (px)",      { noise: 1.2,   speed: 800 }, 0.65, TUNE.handPoint]
];
for (const fps of [30, 60]) {
  console.log("\n" + fps + " frames per second");
  console.log("signal                 | jitter at rest: old -> new      | lag when moving: old -> new");
  for (const [name, sig, k, opts] of CASES) {
    const a = run(lerp(k), { fps, ...sig }), b = run(euro(opts), { fps, ...sig });
    const pct = v => (v >= 0 ? "+" : "") + Math.round(v * 100) + "%";
    console.log(name.padEnd(22), "|", a.jitter.toPrecision(3).padStart(8), "->", b.jitter.toPrecision(3).padEnd(8), pct(b.jitter / a.jitter - 1).padStart(6),
                "|", a.lagMs.toFixed(1).padStart(6), "ms ->", b.lagMs.toFixed(1).padStart(5), "ms", pct(b.lagMs / a.lagMs - 1).padStart(6));
  }
}
