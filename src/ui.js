// Exhibit interface: quick bar, settings drawer, full screen, the "step in front of the camera" hint,
// and exhibit (kiosk) behaviour: open the page with ?kiosk to start the camera by itself, hide the settings
// from visitors, and put everything back to defaults once nobody has been there for a while.
import { $ } from "./state.js";
import { S, save, resetAll } from "./settings.js";
import { t, lang, setLanguage, onLanguage } from "./i18n.js";
import { pickLabel } from "./hud/labels.js";
import { labelInfo } from "./anatomy/terms.js";
import { initTriview, syncTri, setCursor } from "./hud/triview.js";

export const KIOSK = new URLSearchParams(location.search).has("kiosk");
const HINT_AFTER_MS = 2500;        // nobody in view for this long -> show the hint
const RESET_AFTER_MS = 20000;      // exhibit mode: nobody for this long -> back to default settings

let absentSince = 0, wasReset = true, wakeLock = null;
// "Tap a label to learn more": shown for a few seconds each time the labels are switched on, until this visitor has
// tapped one. On a personal device that is remembered; an exhibit forgets it with every reset, for the next visitor.
const TIP_KEY = "xr_tip_done";
let tipTimer = 0, tipLearned = false;
try { tipLearned = !KIOSK && localStorage.getItem(TIP_KEY) === "1"; } catch (e) {}
function showTip() { $("tip").hidden = false; clearTimeout(tipTimer); tipTimer = setTimeout(hideTip, 6000); }
function hideTip() { clearTimeout(tipTimer); $("tip").hidden = true; }

function refresh() {
  $("q_style").textContent = t(S.style === "solid" ? "q.xray" : "q.solid");  // the button names what a tap switches to
  $("q_labels").classList.toggle("on", S.labels);
  const preset = S.skull && S.brain && S.muscles ? "all" : S.skull && !S.brain && !S.muscles ? "skull"
               : S.brain && !S.skull && !S.muscles ? "brain" : S.muscles && !S.skull && !S.brain ? "muscles" : "";
  for (const b of $("quick").querySelectorAll("[data-preset]")) b.classList.toggle("on", b.dataset.preset === preset);
  $("q_settings").classList.toggle("on", !$("drawer").hidden);
  $("q_settings").setAttribute("aria-expanded", String(!$("drawer").hidden));
  $("q_full").textContent = t(document.fullscreenElement ? "q.exitfull" : "q.full");
  syncTri();
}

export function setDrawer(open) { $("drawer").hidden = !open; refresh(); }

export function initUI() {
  if (KIOSK) document.body.classList.add("kiosk");
  $("q_style").onclick = () => { for (const b of $("style").children) if (b.dataset.style !== S.style) { b.click(); break; } };
  $("q_labels").onclick = () => $("labels").click();
  $("labels").addEventListener("change", e => { if (e.target.checked && !tipLearned) showTip(); else hideTip(); });
  $("q_tri").onclick = () => { S.tri = !S.tri; save(); };
  initTriview(showInfo);
  $("q_settings").onclick = () => setDrawer($("drawer").hidden);
  $("drawerclose").onclick = () => setDrawer(false);
  const canFull = !!document.documentElement.requestFullscreen;
  $("q_full").hidden = !canFull;                                             // iPhone Safari has no page full screen
  $("q_full").onclick = () => {
    if (document.fullscreenElement) document.exitFullscreen();
    else document.documentElement.requestFullscreen().catch(() => {});
  };
  document.addEventListener("fullscreenchange", refresh);
  $("q_lang").onclick = () => setLanguage(lang === "zh" ? "en" : "zh");
  onLanguage(() => { refresh(); hideInfo(); });
  // tap a label on the picture to read a one-sentence explanation
  $("stage").addEventListener("click", e => {
    const r = $("stage").getBoundingClientRect(), hit = S.labels ? pickLabel(e.clientX - r.left, e.clientY - r.top) : null;
    if (hit) {
      showInfo(hit.key); hideTip();
      if (S.tri && hit.p) setCursor(hit.p);                 // the three views jump to the structure that was tapped
      tipLearned = true; if (!KIOSK) try { localStorage.setItem(TIP_KEY, "1"); } catch (err) {}
    } else hideInfo();
  });
  new ResizeObserver(() => window.dispatchEvent(new Event("resize"))).observe($("quick"));   // the dock changing height moves the label area
  // any control may change what the quick bar should show; refresh after the control's own handler has run
  for (const type of ["click", "change", "input"]) document.addEventListener(type, () => {
    wasReset = false;                                                        // someone touched a control: there is something to put back
    setTimeout(refresh, 0);
  });
  document.addEventListener("keydown", e => {
    if (e.target instanceof HTMLInputElement || e.target instanceof HTMLSelectElement) return;
    if (e.key === "Escape") setDrawer(false);
    if (e.key === "s" || e.key === "S") setDrawer($("drawer").hidden);      // staff shortcut, also works in exhibit mode
  });
  refresh();
}

let infoTimer = 0;
function showInfo(key) {
  const info = labelInfo(key, lang);
  if (!info) return;
  $("infotitle").textContent = info.title; $("infoother").textContent = info.other; $("infotext").textContent = info.text;
  $("info").hidden = false;
  clearTimeout(infoTimer); infoTimer = setTimeout(hideInfo, 9000);
}
function hideInfo() { clearTimeout(infoTimer); $("info").hidden = true; }

// Called on every live frame: is anybody (a face or a hand) in view?
export function setPresence(present, now) {
  if (present) { absentSince = 0; wasReset = false; $("hint").hidden = true; return; }
  if (!absentSince) absentSince = now;
  const gone = now - absentSince;
  if (gone > HINT_AFTER_MS) $("hint").hidden = false;
  if (KIOSK && !wasReset && gone > RESET_AFTER_MS) { wasReset = true; tipLearned = false; resetAll(); setDrawer(false); hideInfo(); }
}
export function clearPresence() { absentSince = 0; $("hint").hidden = true; }

// Keep the screen awake while the mirror is running (exhibits and phones would otherwise dim and lock).
export async function keepAwake(on) {
  try {
    if (on && !wakeLock && navigator.wakeLock) {
      wakeLock = await navigator.wakeLock.request("screen");
      wakeLock.addEventListener("release", () => { wakeLock = null; });
    } else if (!on && wakeLock) { await wakeLock.release(); wakeLock = null; }
  } catch (e) { wakeLock = null; }
}
