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
