// Small shared helpers and the stage size every module draws against.
import { t, onLanguage } from "./i18n.js";

export const $ = id => document.getElementById(id);

// Stage size in CSS pixels. Tracker coordinates (0..1) are multiplied by these everywhere.
// vis is the part of the stage that is actually on screen (the stage is scaled to cover the window, so its
// edges can stick out), shrunk a little further to stay clear of the top bar and the quick bar.
export const view = { W: 640, H: 480, vis: { x0: 0, y0: 0, x1: 640, y1: 480 } };

// The status line. `keys` is one translation key or a list of them (joined); it is remembered so the line can be
// re-written when the language changes.
let last = { keys: "s.idle", cls: "", vars: undefined };
function paint() {
  const el = $("status"), keys = Array.isArray(last.keys) ? last.keys : [last.keys];
  el.textContent = keys.map(k => t(k, last.vars)).join("");
  el.className = last.cls || "";
}
export function setStatus(keys, cls, vars) { last = { keys, cls, vars }; paint(); }
onLanguage(paint);
