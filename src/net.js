// Downloads with progress, and the thin loading bar along the top of the window.
import { $ } from "./state.js";

// Fetches a file as bytes. onProgress(received, total) is called as it arrives (total is 0 when unknown).
export async function fetchBytes(url, onProgress) {
  const res = await fetch(url);
  if (!res.ok) throw new Error("HTTP " + res.status + " for " + url);
  const total = Number(res.headers.get("content-length")) || 0;
  if (!res.body || !onProgress) return new Uint8Array(await res.arrayBuffer());
  const reader = res.body.getReader(), chunks = [];
  let received = 0;
  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    chunks.push(value); received += value.length;
    onProgress(received, total);
  }
  const out = new Uint8Array(received);
  let at = 0; for (const c of chunks) { out.set(c, at); at += c.length; }
  return out;
}

// fraction 0..1 shows the bar; null hides it.
export function setProgress(fraction) {
  const bar = $("loadbar");
  if (!bar) return;
  bar.hidden = fraction === null;
  if (fraction !== null) $("loadfill").style.width = Math.round(Math.min(1, Math.max(0, fraction)) * 100) + "%";
}

// Single-file build: scripts/build-single.mjs embeds data in the page as <script id="embed-..."> blocks holding
// base64 (or JSON text). Returns the decoded bytes, or null when the page carries no such block.
export function embedded(id) {
  const el = typeof document !== "undefined" && document.getElementById("embed-" + id);
  if (!el) return null;
  const bin = atob(el.textContent.trim()), out = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
  return out;
}
export function embeddedText(id) {
  const el = typeof document !== "undefined" && document.getElementById("embed-" + id);
  return el ? el.textContent : null;
}
