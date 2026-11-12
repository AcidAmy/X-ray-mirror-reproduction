// User settings: defaults, localStorage persistence and the control panel bindings.
import { $ } from "./state.js";

export const DEFAULTS = { skull: true, brain: false, muscles: false, eyes: true, outline: true, hands: true,
                          style: "xray", bright: 1, real: 0.12, feather: 0.2, reveal: "whole", cut: 0.5, showdata: false,
                          fs: 1, fw: 1, fh: 1, fd: 1, fx: 0, fy: 0, fz: 0, labels: false, autofit: true };
export const LAYERS = ["skull", "brain", "muscles", "eyes", "outline", "hands"];
export const SLIDERS = ["bright", "real", "feather", "cut", "fs", "fw", "fh", "fd", "fx", "fy", "fz"];
const STYLES = ["xray", "solid"], REVEALS = ["whole", "left", "right", "top", "bottom", "lens"];
const KEY = "xr_settings";                     // same key as the original page, so saved settings carry over

export const S = Object.assign({}, DEFAULTS);

// Only accept saved values that are the right type and in range; a damaged entry must not break the page.
function load() {
  let saved = {};
  try { saved = JSON.parse(localStorage.getItem(KEY) || "{}") || {}; } catch (e) { return; }
  for (const k in DEFAULTS) {
    const v = saved[k];
    if (typeof v !== typeof DEFAULTS[k]) continue;
    if (typeof v === "number" && !Number.isFinite(v)) continue;
    if (k === "style" && !STYLES.includes(v)) continue;
    if (k === "reveal" && !REVEALS.includes(v)) continue;
    S[k] = v;
  }
}
export function save() { try { localStorage.setItem(KEY, JSON.stringify(S)); } catch (e) {} }

export function syncUI() {
  for (const k of LAYERS) $("L_" + k).checked = S[k];
  for (const b of $("style").children) b.classList.toggle("on", b.dataset.style === S.style);
  for (const k of SLIDERS) $(k).value = S[k];
  for (const k of ["fs", "fw", "fh", "fd"]) $(k + "v").textContent = Math.round(S[k] * 100) + "%";
  for (const k of ["fx", "fy", "fz"]) $(k + "v").textContent = (S[k] > 0 ? "+" : "") + S[k].toFixed(1) + " cm";
  $("featherv").textContent = Math.round(S.feather * 100) + "%";
  $("labels").checked = S.labels; $("autofit").checked = S.autofit;
  $("reveal").value = S.reveal; $("showdata").checked = S.showdata; $("data").hidden = !S.showdata;
  $("cutrow").hidden = S.reveal === "whole";
  $("cutlabel").textContent = S.reveal === "lens" ? "Lens size" : "Cut position";
}

// onStyle runs when the X-ray / Solid look changes (materials need their blending switched).
export function initSettings(onStyle) {
  load();
  for (const k of LAYERS) $("L_" + k).onchange = e => { S[k] = e.target.checked; save(); };
  for (const b of $("style").children) b.onclick = () => { S.style = b.dataset.style; save(); syncUI(); onStyle(); };
  for (const k of SLIDERS) $(k).oninput = e => { S[k] = parseFloat(e.target.value); save(); syncUI(); };
  $("labels").onchange = e => { S.labels = e.target.checked; save(); };
  $("autofit").onchange = e => { S.autofit = e.target.checked; save(); };
  $("reveal").onchange = e => { S.reveal = e.target.value; S.cut = 0.5; save(); syncUI(); };
  $("showdata").onchange = e => { S.showdata = e.target.checked; save(); syncUI(); };
  $("fitreset").onclick = () => { S.fs = S.fw = S.fh = S.fd = 1; S.fx = S.fy = S.fz = 0; save(); syncUI(); };
  for (const b of document.querySelectorAll("[data-preset]")) b.onclick = () => {
    const p = b.dataset.preset;
    S.skull = p === "skull" || p === "all"; S.brain = p === "brain" || p === "all";
    S.muscles = p === "muscles" || p === "all"; S.eyes = p !== "brain"; S.outline = true;
    save(); syncUI();
  };
  syncUI();
}
