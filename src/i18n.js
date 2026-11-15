// Interface language: Chinese or English. Picked from ?lang=zh|en, else the saved choice, else the browser.
// Static page text carries data-i18n="key"; everything set from code goes through t().
const KEY = "xr_lang";
const UI = {
  en: {
    "mobile.all":"All", "mobile.fold":"Fold / expand", "mobile.more":"Controls / readouts",
    "voxel.read": "MRI voxel: {name}",
    "voxel.0": "unlabelled / outside coverage",
    "voxel.1": "CSF",
    "voxel.2": "grey matter",
    "voxel.3": "white matter",
    "voxel.pending": "MRI voxel: select MRI to load labels",
    "play.title": "Exhibit interaction",
    "play.fixed": "Fixed screen plane (MRI)",
    "play.anchor": "Re-anchor at current head",
    "play.hand": "Pinch to change slice",
    "play.waiting": "Use one hand; pinch thumb and index finger",
    "play.dragging": "Pinching: move up/down; release to stop",
    "play.note": "Fixed mode: move your head through the plane; hand control pauses. Tracking loss re-anchors on return. Pinch mode: use one hand, move up/down to change the selected anatomical slice. MRI tissue classes come from atlas probabilities, not diagnoses.",

    "mri.mode": "Background",
    "mri.model": "Model sections",
    "mri.image": "MRI",
    "mri.blend": "MRI + model outlines",
    "mri.texture": "MRI on 3D planes",
    "mri.contrast": "Contrast",
    "mri.loading": "Loading MRI…",
    "mri.ready": "ICBM152 · T1 MRI",
    "mri.error": "MRI unavailable; showing model sections.",
    "mri.retry": "Retry MRI",
    "mri.note": "McGill ICBM152: population-average MRI, approximately aligned to this model. Different anatomy; not your scan. Model tissue/nearest labels refer to the mesh; MRI voxels are shown separately.",

    "intro.text": "See the skull, brain and muscles inside your own head, tracked live through your camera. Hold a hand up to see its bones.",
    "intro.privacy": "Your video is processed on this device only. Nothing is uploaded or recorded.",
    "btn.start": "Start camera", "btn.demo": "Try the demo (no camera)", "btn.tocamera": "Switch to the camera",
    "hint.title": "Step in front of the camera", "hint.sub": "Face the screen and hold up a hand",
    "q.skull": "Skull", "q.brain": "Brain", "q.muscles": "Muscles", "q.all": "Everything",
    "q.solid": "Solid", "q.xray": "X-ray", "q.labels": "Labels", "q.settings": "Settings",
    "q.full": "Full screen", "q.exitfull": "Exit full screen", "q.lang": "中文",
    "drawer.title": "Settings", "drawer.close": "Close",
    "h.layers": "Layers", "h.look": "Look", "h.mixed": "Mixed reality", "h.fit": "Fit to my head", "h.about": "About and privacy",
    "l.skull": "Skull", "l.brain": "Brain", "l.muscles": "Muscles", "l.eyes": "Eyes", "l.outline": "Head outline", "l.hands": "Hand bones",
    "l.labels": "Show labels", "l.bilingual": "Labels in both languages", "l.bright": "Brightness",
    "l.real": "Real me showing through", "l.feather": "Edge feather", "l.reveal": "Reveal",
    "o.whole": "Whole head", "o.left": "Left half only", "o.right": "Right half only", "o.top": "Top of the head only",
    "o.bottom": "Lower face only", "o.lens": "X-ray lens (follows your fingertip)",
    "l.cut": "Cut position", "l.lens": "Lens size", "l.showdata": "Show tracking data",
    "l.autofit": "Auto fit to my face", "l.fs": "Overall size", "l.fw": "Width", "l.fh": "Height", "l.fd": "Depth",
    "l.fx": "Left / right", "l.fy": "Up / down", "l.fz": "Forward / back", "l.fitreset": "Reset fit",
    "tip.fit": "The sliders adjust on top of the automatic fit. Tip: pick the Solid look and set \"Real me showing through\" to about half, then line the skull up with your face.",
    "about.model": "The anatomy is a real 3D dataset of one adult, scaled and pinned to your head. It shows where structures typically sit, not a scan of you. This is an educational exhibit, not a medical device, and must not be used for diagnosis.",
    "about.privacy": "Privacy: the camera picture is analysed inside this browser and is never uploaded, recorded or stored. Only your display settings are saved, on this device.",
    "about.credit": "Anatomy models: BodyParts3D, © The Database Center for Life Science, licensed under CC Attribution-Share Alike 2.1 Japan. Models were simplified and re-aligned. MRI atlas: McGill ICBM152, © Louis Collins / McGill; resampled and approximately aligned. Tracking: MediaPipe (Apache 2.0). Rendering: three.js (MIT).",
    "fit.readout": "width {w}%, height {h}%",
    "info.tap": "Tap a label to learn more",
    "q.tri": "Sections", "tri.axial": "Axial", "tri.coronal": "Coronal", "tri.sagittal": "Sagittal", "tri.slice": "Slice position",
    "dir.L": "L", "dir.R": "R", "dir.S": "S", "dir.I": "I", "dir.A": "A", "dir.P": "P", "tri.cm": "cm",
    "tri.tissue": "Here: {name}", "tri.near": "Nearest label: {name} ({d} cm)", "tri.jump": "Jump to a structure…",
    "tis.bone": "bone", "tis.cerebrum": "cerebrum", "tis.hindbrain": "cerebellum or brainstem", "tis.muscle": "muscle", "tis.eye": "eyeball",
    "tis.other": "other tissue or a cavity", "tis.out": "outside the head",
    "tri.note": "Sections cut from the 3D model, mouth closed. The left of each picture is the person's right, as CT and MRI are read. Drag to move the crosshair.",
    "s.idle": "Click Start camera, then allow the camera.", "s.asking": "Asking for the camera…",
    "s.anatomy": "Loading the 3D anatomy…", "s.trackers": "Loading the face and hand trackers…",
    "s.demo": "Demo scene (no camera).", "s.demofail": "Demo failed: {msg}",
    "s.tracking": "Tracking your head.", "s.handson": " Hand bones on.",
    "s.handonly": "Hand found. Face the camera to see inside your head.",
    "s.noface": "No face found. Face the camera, with light on your face.",
    "s.trackerr": "The tracker hit an error: {msg}", "s.camstopped": "The camera stopped. Click Start camera to try again.",
    "e.blocked": "Camera blocked. Allow camera access for this page and click Start again.",
    "e.nocam": "No camera found. Connect one and click Start again, or try the demo.",
    "e.busy": "The camera is busy or could not start. Close other apps that use it and click Start again.",
    "e.insecure": "the camera only works on https:// pages or on localhost.",
    "e.unsupported": "this browser will not give this page a camera. Try Chrome or Edge.",
    "e.load": "Could not load the {stage}: {msg}", "stage.camera": "camera", "stage.engine": "3D engine", "stage.trackers": "trackers"
  },
  zh: {
    "mobile.all":"三视图", "mobile.fold":"收起 / 展开", "mobile.more":"设置 / 读数",
    "voxel.read": "MRI 体素：{name}",
    "voxel.0": "未标注／覆盖范围外",
    "voxel.1": "脑脊液",
    "voxel.2": "灰质",
    "voxel.3": "白质",
    "voxel.pending": "MRI 体素：选择 MRI 后加载标签",
    "play.title": "展台交互",
    "play.fixed": "固定屏幕切面（MRI）",
    "play.anchor": "在当前头部重新定位",
    "play.hand": "捏合手指换层",
    "play.waiting": "伸出一只手，捏合拇指和食指",
    "play.dragging": "已捏合：上下移动换层，松开停止",
    "play.note": "固定模式下移动头部穿过切面，手势换层暂停；追踪丢失后重新定位。手势模式用单手捏合并上下移动，控制所选解剖层面。MRI 组织类别来自图谱概率，非诊断结果。",

    "mri.mode": "底图",
    "mri.model": "模型剖面",
    "mri.image": "MRI 影像",
    "mri.blend": "MRI + 模型轮廓",
    "mri.texture": "三维切面显示 MRI",
    "mri.contrast": "对比度",
    "mri.loading": "正在加载 MRI…",
    "mri.ready": "ICBM152 · T1 MRI",
    "mri.error": "MRI 暂不可用，当前显示模型剖面。",
    "mri.retry": "重试加载 MRI",
    "mri.note": "McGill ICBM152 群体平均 MRI，与模型近似对齐；来自不同解剖数据，并非你的扫描。模型组织及最近标注指三维模型，MRI 体素单独显示。",

    "intro.text": "通过摄像头实时看到自己头部里面的颅骨、大脑和肌肉。举起一只手，还能看到手骨。",
    "intro.privacy": "视频只在本机处理，不会上传，也不会录制。",
    "btn.start": "开启摄像头", "btn.demo": "先看演示（无需摄像头）", "btn.tocamera": "切换到摄像头",
    "hint.title": "请站到镜头前", "hint.sub": "面向屏幕，举起一只手试试",
    "q.skull": "颅骨", "q.brain": "大脑", "q.muscles": "肌肉", "q.all": "全部",
    "q.solid": "实体", "q.xray": "X 光", "q.labels": "标签", "q.settings": "设置",
    "q.full": "全屏", "q.exitfull": "退出全屏", "q.lang": "EN",
    "drawer.title": "设置", "drawer.close": "关闭",
    "h.layers": "图层", "h.look": "外观", "h.mixed": "虚实融合", "h.fit": "贴合我的头部", "h.about": "关于与隐私",
    "l.skull": "颅骨", "l.brain": "大脑", "l.muscles": "肌肉", "l.eyes": "眼球", "l.outline": "头部轮廓", "l.hands": "手骨",
    "l.labels": "显示标签", "l.bilingual": "标签显示中英双语", "l.bright": "亮度",
    "l.real": "透出真实画面", "l.feather": "边缘柔化", "l.reveal": "显示范围",
    "o.whole": "整个头部", "o.left": "只显示左半", "o.right": "只显示右半", "o.top": "只显示头顶",
    "o.bottom": "只显示下半脸", "o.lens": "X 光透镜（跟随指尖）",
    "l.cut": "剖切位置", "l.lens": "透镜大小", "l.showdata": "显示追踪数据",
    "l.autofit": "自动贴合脸型", "l.fs": "整体大小", "l.fw": "宽度", "l.fh": "高度", "l.fd": "深度",
    "l.fx": "左 / 右", "l.fy": "上 / 下", "l.fz": "前 / 后", "l.fitreset": "重置贴合",
    "tip.fit": "滑块是在自动贴合结果之上的微调。小技巧：选“实体”外观，把“透出真实画面”调到一半左右，再让颅骨对齐你的脸。",
    "about.model": "解剖模型来自一位成年人的真实三维数据，按比例贴合到你的头部，展示的是各结构通常所在的位置，并不是对你本人的扫描。本展项仅用于科普教育，不是医疗器械，不能用于诊断。",
    "about.privacy": "隐私：摄像头画面只在本浏览器内分析，不会上传、录制或保存。只有你的显示设置会保存在本机。",
    "about.credit": "解剖模型：BodyParts3D，© The Database Center for Life Science，以 CC 署名-相同方式共享 2.1 日本 许可发布，模型经过简化和重新对齐。MRI 图谱：McGill ICBM152，© Louis Collins / McGill，经过重采样和近似对齐。追踪：MediaPipe（Apache 2.0）。渲染：three.js（MIT）。",
    "fit.readout": "宽 {w}%，高 {h}%",
    "info.tap": "点一下标签可以看讲解",
    "q.tri": "断层", "tri.axial": "轴位", "tri.coronal": "冠状位", "tri.sagittal": "矢状位", "tri.slice": "层面位置",
    "dir.L": "左", "dir.R": "右", "dir.S": "上", "dir.I": "下", "dir.A": "前", "dir.P": "后", "tri.cm": "厘米",
    "tri.tissue": "所在组织：{name}", "tri.near": "最近标注：{name}（{d} 厘米）", "tri.jump": "跳到结构…",
    "tis.bone": "骨", "tis.cerebrum": "大脑", "tis.hindbrain": "小脑或脑干", "tis.muscle": "肌肉", "tis.eye": "眼球",
    "tis.other": "其他组织或腔隙", "tis.out": "头部以外",
    "tri.note": "由三维模型剖切得到，为闭口姿态。图像左侧是人的右侧，与 CT、MRI 的看片习惯一致。拖动可以移动十字准星。",
    "s.idle": "点击“开启摄像头”，然后允许使用摄像头。", "s.asking": "正在请求摄像头…",
    "s.anatomy": "正在加载三维解剖模型…", "s.trackers": "正在加载人脸和手部追踪…",
    "s.demo": "演示画面（未使用摄像头）", "s.demofail": "演示启动失败：{msg}",
    "s.tracking": "正在追踪头部。", "s.handson": "手骨已显示。",
    "s.handonly": "已找到手。请面向镜头，就能看到头部内部。",
    "s.noface": "没有找到人脸。请面向镜头，并让脸部有足够光线。",
    "s.trackerr": "追踪出错：{msg}", "s.camstopped": "摄像头已停止。请点击“开启摄像头”重试。",
    "e.blocked": "摄像头被禁止。请允许本页面使用摄像头，然后再点一次开启。",
    "e.nocam": "没有找到摄像头。请接上摄像头后重试，或者先看演示。",
    "e.busy": "摄像头被占用或无法启动。请关闭其他正在使用摄像头的程序后重试。",
    "e.insecure": "摄像头只能在 https:// 页面或 localhost 上使用。",
    "e.unsupported": "这个浏览器不允许本页面使用摄像头，请换用 Chrome 或 Edge。",
    "e.load": "{stage}加载失败：{msg}", "stage.camera": "摄像头", "stage.engine": "三维引擎", "stage.trackers": "追踪模块"
  }
};

function pick() {
  const q = new URLSearchParams(location.search).get("lang");
  if (q === "zh" || q === "en") return q;
  try { const s = localStorage.getItem(KEY); if (s === "zh" || s === "en") return s; } catch (e) {}
  return (navigator.language || "").toLowerCase().startsWith("zh") ? "zh" : "en";
}
export let lang = typeof location === "undefined" ? "en" : pick();
const listeners = [];

export function t(key, vars) {
  let s = (UI[lang] && UI[lang][key]) || UI.en[key] || key;
  if (vars) for (const k in vars) s = s.replace("{" + k + "}", vars[k]);
  return s;
}

// Fill in every element that carries data-i18n (text) or data-i18n-title (tooltip).
export function applyLanguage() {
  document.documentElement.lang = lang === "zh" ? "zh-CN" : "en";
  for (const el of document.querySelectorAll("[data-i18n]")) el.textContent = t(el.dataset.i18n);
  for (const el of document.querySelectorAll("[data-i18n-title]")) el.title = t(el.dataset.i18nTitle);
  for (const fn of listeners) fn();
}
export function onLanguage(fn) { listeners.push(fn); }
export function setLanguage(next) {
  lang = next === "zh" ? "zh" : "en";
  try { localStorage.setItem(KEY, lang); } catch (e) {}
  applyLanguage();
}
export const allKeys = () => ({ en: Object.keys(UI.en), zh: Object.keys(UI.zh) });
