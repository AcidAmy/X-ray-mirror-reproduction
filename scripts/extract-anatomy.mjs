// Pulls the embedded anatomy dataset out of the original single-file page, byte for byte.
//   original/X-Ray Mirror.html  ->  public/anatomy/meta.json  +  public/anatomy/anatomy.bin
import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { createHash } from "node:crypto";

const src = new URL("../original/X-Ray Mirror.html", import.meta.url);
const out = new URL("../public/anatomy/", import.meta.url);
const html = readFileSync(src, "utf8");
const grab = id => {
  const m = html.match(new RegExp('<script id="' + id + '"[^>]*>([\\s\\S]*?)</script>'));
  if (!m) throw new Error("missing <script id=" + id + ">");
  return m[1].trim();
};
const metaText = grab("meshmeta");
const meta = JSON.parse(metaText);
const bin = Buffer.from(grab("meshdata"), "base64");

// sanity checks: every mesh must sit inside the buffer, aligned for 16-bit views, with valid indices
let end = 0;
for (const m of meta.meshes) {
  if (m.offV % 2 || m.offI % 2) throw new Error(m.name + ": unaligned offset");
  for (let i = 0; i < m.ni; i++) if (bin.readUInt16LE(m.offI + i * 2) >= m.nv) throw new Error(m.name + ": index out of range");
  end = Math.max(end, m.offI + m.ni * 2);
}
if (end !== bin.length) throw new Error("buffer length " + bin.length + " does not match the mesh table (" + end + ")");

mkdirSync(out, { recursive: true });
writeFileSync(new URL("meta.json", out), metaText);
writeFileSync(new URL("anatomy.bin", out), bin);
console.log("meshes:", meta.meshes.length, "labels:", meta.labels.length);
console.log("anatomy.bin:", bin.length, "bytes, sha256", createHash("sha256").update(bin).digest("hex"));
