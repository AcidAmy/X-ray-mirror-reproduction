// Small shared helpers and the stage size every module draws against.
export const $ = id => document.getElementById(id);

// Stage size in CSS pixels. Tracker coordinates (0..1) are multiplied by these everywhere.
// vis is the part of the stage that is actually on screen (the stage is scaled to cover the window, so its
// edges can stick out), shrunk a little further to stay clear of the top bar and the quick bar.
export const view = { W: 640, H: 480, vis: { x0: 0, y0: 0, x1: 640, y1: 480 } };

export function setStatus(text, cls) {
  const el = $("status");
  el.textContent = text;
  el.className = cls || "";
}
