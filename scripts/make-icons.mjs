// Draws the app icon (a glowing x-ray skull on a dark tile) and writes it as PNG files in public/icons/.
// No image library: every pixel is computed from simple shapes, then packed into a PNG with Node's zlib.
import { deflateSync } from "node:zlib";
import { writeFileSync, mkdirSync } from "node:fs";

const clamp = (v, a = 0, b = 1) => Math.min(b, Math.max(a, v));
const mix = (a, b, t) => a + (b - a) * t;
// signed distances (negative = inside), coordinates in -1..1 with y pointing down
const circle = (x, y, cx, cy, r) => Math.hypot(x - cx, y - cy) - r;
const box = (x, y, cx, cy, hw, hh, r) => { const dx = Math.abs(x - cx) - hw + r, dy = Math.abs(y - cy) - hh + r; return Math.hypot(Math.max(dx, 0), Math.max(dy, 0)) + Math.min(Math.max(dx, dy), 0) - r; };

function skull(x, y) {
  let d = Math.min(circle(x, y, 0, -0.14, 0.44), box(x, y, 0, 0.26, 0.25, 0.2, 0.1));        // cranium + jaw
  d = Math.max(d, -circle(x, y, -0.17, -0.08, 0.115)); d = Math.max(d, -circle(x, y, 0.17, -0.08, 0.115));   // eye sockets
  d = Math.max(d, -box(x, y, 0, 0.12, 0.035, 0.06, 0.03));                                    // nose
  for (const tx of [-0.12, -0.04, 0.04, 0.12]) d = Math.max(d, -box(x, y, tx, 0.36, 0.012, 0.075, 0.01));   // gaps between teeth
  return d;
}

function render(size, pad) {
  const px = new Uint8Array(size * size * 4), aa = 1.5 / size, scale = 1 / (1 - pad);
  for (let j = 0; j < size; j++) for (let i = 0; i < size; i++) {
    const u = (i + 0.5) / size * 2 - 1, v = (j + 0.5) / size * 2 - 1, x = u * scale, y = v * scale;
    const g = clamp(1 - Math.hypot(u, v + 0.2) / 1.5);                                         // background glow
    let r = mix(5, 19, g), gr = mix(7, 26, g), b = mix(12, 43, g);
    const d = skull(x, y), glow = Math.exp(-Math.max(d, 0) * 9) * 0.55;                        // halo around the skull
    r += 111 * glow * 0.6; gr += 182 * glow * 0.6; b += 255 * glow * 0.6;
    const inside = clamp(0.5 - d / aa / scale), rim = clamp(1 + d / 0.09);                     // brighter towards the edge, like the x-ray look
    const cr = mix(70, 191, rim), cg = mix(120, 227, rim), cb = mix(175, 255, rim);
    r = mix(r, cr, inside); gr = mix(gr, cg, inside); b = mix(b, cb, inside);
    const o = (j * size + i) * 4;
    px[o] = clamp(r, 0, 255); px[o + 1] = clamp(gr, 0, 255); px[o + 2] = clamp(b, 0, 255); px[o + 3] = 255;
  }
  return px;
}

const CRC = new Uint32Array(256).map((_, n) => { let c = n; for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1; return c >>> 0; });
const crc = buf => { let c = 0xffffffff; for (const b of buf) c = CRC[(c ^ b) & 255] ^ (c >>> 8); return (c ^ 0xffffffff) >>> 0; };
function png(size, px) {
  const chunk = (type, data) => { const len = Buffer.alloc(4); len.writeUInt32BE(data.length); const body = Buffer.concat([Buffer.from(type), data]);
                                  const sum = Buffer.alloc(4); sum.writeUInt32BE(crc(body)); return Buffer.concat([len, body, sum]); };
  const head = Buffer.alloc(13); head.writeUInt32BE(size, 0); head.writeUInt32BE(size, 4); head[8] = 8; head[9] = 6;
  const raw = Buffer.alloc(size * (size * 4 + 1));
  for (let j = 0; j < size; j++) Buffer.from(px.buffer, j * size * 4, size * 4).copy(raw, j * (size * 4 + 1) + 1);
  return Buffer.concat([Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]), chunk("IHDR", head), chunk("IDAT", deflateSync(raw, { level: 9 })), chunk("IEND", Buffer.alloc(0))]);
}

const out = new URL("../public/icons/", import.meta.url);
mkdirSync(out, { recursive: true });
// "maskable" icons get cropped to a circle or squircle by Android, so the skull is drawn smaller inside a safe zone
for (const [name, size, pad] of [["icon-192.png", 192, 0.12], ["icon-512.png", 512, 0.12], ["icon-maskable-512.png", 512, 0.3], ["apple-touch-icon.png", 180, 0.14]]) {
  const file = png(size, render(size, pad));
  writeFileSync(new URL(name, out), file);
  console.log("public/icons/" + name, file.length, "bytes");
}
