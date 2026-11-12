// Packs the built site (dist/) into one HTML file that can be sent to someone and opened by double-clicking.
//   node scripts/build-single.mjs             share/xray-mirror.html          app + anatomy inside (about 3.5 MB);
//                                             the face/hand tracker runtime and models load from the internet
//   node scripts/build-single.mjs --offline   share/xray-mirror-offline.html  everything inside (about 32 MB);
//                                             works with no network at all
// Run `npm run build` first (the npm scripts do).
import { readFileSync, writeFileSync, mkdirSync, readdirSync } from "node:fs";

const offline = process.argv.includes("--offline");
const dist = new URL("../dist/", import.meta.url), out = new URL("../share/", import.meta.url);
const read = (p, enc) => readFileSync(new URL(p, dist), enc);
const b64 = p => read(p).toString("base64");

let html = read("index.html", "utf8");
const assets = readdirSync(new URL("assets/", dist));
const js = assets.find(f => f.endsWith(".js")), css = assets.find(f => f.endsWith(".css"));
if (!js || !css || assets.filter(f => f.endsWith(".js")).length !== 1) throw new Error("expected exactly one script and one stylesheet in dist/assets");

// style and script inline; a closing script tag inside the code would end the block early, so break it up
html = html.replace(/<link rel="stylesheet"[^>]*>/, () => "<style>\n" + read("assets/" + css, "utf8") + "</style>");
html = html.replace(/<script type="module"[^>]*src="[^"]*"><\/script>/, "");
html = html.replace(/\s*<link rel="(manifest|icon|apple-touch-icon)"[^>]*>/g, "");     // a lone file has no manifest or icon files beside it
const code = read("assets/" + js, "utf8").replace(/<\/script/gi, "<\\/script");

const blocks = [
  '<script type="application/json" id="embed-meta">' + read("anatomy/meta.json", "utf8").replace(/</g, "\\u003c") + "</script>",
  '<script type="application/octet-stream" id="embed-anatomy">' + b64("anatomy/anatomy.bin") + "</script>"
];
if (offline) blocks.push(
  '<script type="application/octet-stream" id="embed-wasm-js">' + b64("wasm/vision_wasm_internal.js") + "</script>",
  '<script type="application/octet-stream" id="embed-wasm-bin">' + b64("wasm/vision_wasm_internal.wasm") + "</script>",
  '<script type="application/octet-stream" id="embed-face">' + b64("models/face_landmarker.task") + "</script>",
  '<script type="application/octet-stream" id="embed-hand">' + b64("models/hand_landmarker.task") + "</script>");
html = html.replace("</body>", () => blocks.join("\n") + '\n<script type="module">\n' + code + "\n</script>\n</body>");
if (/<script[^>]+src=|<link[^>]+href=/.test(html)) throw new Error("the page still refers to an outside file");

mkdirSync(out, { recursive: true });
const name = offline ? "xray-mirror-offline.html" : "xray-mirror.html";
writeFileSync(new URL(name, out), html);
console.log("share/" + name + ": " + (Buffer.byteLength(html) / 1048576).toFixed(1) + " MB");
