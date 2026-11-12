// Small shared helpers and the stage size every module draws against.
export const $ = id => document.getElementById(id);

// Stage size in CSS pixels. Tracker coordinates (0..1) are multiplied by these everywhere.
export const view = { W: 640, H: 480 };

export function setStatus(text, cls) {
  const el = $("status");
  el.textContent = text;
  el.className = cls || "";
}
