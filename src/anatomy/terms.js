// Chinese names and one-sentence explanations for every label. Keys are the English label texts from the dataset
// (public/anatomy/meta.json) plus the five hand labels, so the dataset itself stays untouched.
export const TERMS = {
  // ---- skull ----
  "Frontal bone": { zh: "额骨", en: "Forms the forehead and the roof of the eye sockets, and shields the front of the brain.",
    zhInfo: "构成前额和眼眶的顶部，保护大脑的前部。" },
  "Parietal bone": { zh: "顶骨", en: "A pair of plates that make up most of the top and sides of the skull.",
    zhInfo: "左右各一块，构成颅顶和两侧的大部分。" },
  "Temporal bone": { zh: "颞骨", en: "Sits around the ear; it houses the hearing and balance organs and forms the jaw joint.",
    zhInfo: "位于耳朵周围，内藏听觉和平衡器官，并与下颌骨组成颞下颌关节。" },
  "Occipital bone": { zh: "枕骨", en: "The back and base of the skull; the spinal cord passes through the large opening in it.",
    zhInfo: "构成后脑勺和颅底，脊髓从它中央的枕骨大孔穿过。" },
  "Nasal bone": { zh: "鼻骨", en: "Two small bones that form the bridge of the nose; the rest of the nose is cartilage.",
    zhInfo: "两块小骨构成鼻梁，鼻子其余部分是软骨。" },
  "Zygomatic bone (cheekbone)": { zh: "颧骨", en: "The cheekbone: it shapes the cheek and forms the outer edge of the eye socket.",
    zhInfo: "就是颧骨（脸颊最突出的骨头），也构成眼眶的外侧缘。" },
  "Maxilla (upper jaw)": { zh: "上颌骨", en: "The upper jaw: it holds the upper teeth and forms part of the nose and eye sockets.",
    zhInfo: "承载上排牙齿，并参与构成鼻腔和眼眶。" },
  "Teeth": { zh: "牙齿", en: "Adults have up to 32 teeth; their enamel is the hardest substance in the body.",
    zhInfo: "成年人最多有 32 颗牙，表面的牙釉质是人体最坚硬的物质。" },
  "Mandible (lower jaw)": { zh: "下颌骨", en: "The lower jaw, the only skull bone that moves; it swings at the joints in front of the ears.",
    zhInfo: "颅骨中唯一能活动的骨头，以耳前的颞下颌关节为轴开合。" },
  // ---- eyes ----
  "Eyeball": { zh: "眼球", en: "About 2.4 cm across; six small muscles turn it, and the lens focuses light onto the retina.",
    zhInfo: "直径约 2.4 厘米，由六条眼外肌带动转动，晶状体把光线聚焦到视网膜上。" },
  // ---- brain ----
  "Frontal lobe": { zh: "额叶", en: "Planning, decisions, speech and voluntary movement are run from here.",
    zhInfo: "负责计划、决策、语言表达和随意运动。" },
  "Parietal lobe": { zh: "顶叶", en: "Processes touch, temperature and pain, and keeps track of where the body is in space.",
    zhInfo: "处理触觉、温度和痛觉，并感知身体在空间中的位置。" },
  "Temporal lobe": { zh: "颞叶", en: "Handles hearing and understanding language, and is central to forming memories.",
    zhInfo: "负责听觉和语言理解，也是形成记忆的关键区域。" },
  "Occipital lobe": { zh: "枕叶", en: "The visual centre: signals from the eyes are turned into what you see at the back of the head.",
    zhInfo: "视觉中枢：眼睛传来的信号在后脑勺这里变成你看到的画面。" },
  "Cerebellum": { zh: "小脑", en: "Coordinates movement and balance, making actions smooth and accurate.",
    zhInfo: "协调运动、维持平衡，让动作流畅而准确。" },
  "Pons (brainstem)": { zh: "脑桥", en: "Part of the brainstem; it relays signals between the cerebrum and cerebellum and helps control breathing and sleep.",
    zhInfo: "脑干的一部分，在大脑和小脑之间传递信号，并参与调节呼吸和睡眠。" },
  "Medulla oblongata": { zh: "延髓", en: "The lowest part of the brainstem; it automatically controls heartbeat, breathing and blood pressure.",
    zhInfo: "脑干的最下段，自动控制心跳、呼吸和血压。" },
  // ---- muscles ----
  "Frontalis": { zh: "额肌", en: "Raises the eyebrows and wrinkles the forehead.", zhInfo: "抬眉毛、皱额头都靠它。" },
  "Temporalis": { zh: "颞肌", en: "A fan-shaped chewing muscle on the temple; you can feel it bulge when you clench your teeth.",
    zhInfo: "太阳穴处的扇形咀嚼肌，咬紧牙关时能摸到它鼓起。" },
  "Orbicularis oculi": { zh: "眼轮匝肌", en: "The ring of muscle around the eye that closes the eyelids for blinking and squinting.",
    zhInfo: "环绕眼睛的环形肌肉，负责闭眼、眨眼和眯眼。" },
  "Nasalis": { zh: "鼻肌", en: "Narrows and flares the nostrils.", zhInfo: "让鼻孔收缩或张大。" },
  "Zygomaticus major": { zh: "颧大肌", en: "Pulls the corners of the mouth up and out: the main smiling muscle.",
    zhInfo: "把嘴角向上向外拉，是微笑时最主要的肌肉。" },
  "Masseter": { zh: "咬肌", en: "The strongest chewing muscle; it lifts the lower jaw to close the mouth.",
    zhInfo: "最有力的咀嚼肌，把下颌骨向上提起，闭合嘴巴。" },
  "Orbicularis oris": { zh: "口轮匝肌", en: "The ring of muscle around the mouth, used to close and purse the lips.",
    zhInfo: "环绕嘴巴的环形肌肉，负责闭嘴和噘嘴。" },
  "Depressor anguli oris": { zh: "降口角肌", en: "Pulls the corners of the mouth down, as in a frown.",
    zhInfo: "把嘴角向下拉，做出难过或不满的表情。" },
  "Mentalis": { zh: "颏肌", en: "Pushes the lower lip up and wrinkles the chin.", zhInfo: "上推下唇，让下巴皮肤起皱。" },
  // ---- hand ----
  "Distal phalanx": { zh: "远节指骨", en: "The bone at the fingertip, under the nail.", zhInfo: "指尖的那节骨头，位于指甲下方。" },
  "Middle phalanx": { zh: "中节指骨", en: "The middle finger bone; the thumb does not have one.", zhInfo: "手指中间的一节，拇指没有这节骨头。" },
  "Proximal phalanx": { zh: "近节指骨", en: "The finger bone nearest the palm; it meets a metacarpal at the knuckle.",
    zhInfo: "最靠近手掌的一节指骨，在指根关节处与掌骨相连。" },
  "Metacarpal": { zh: "掌骨", en: "Five long bones that form the palm, one leading to each finger.",
    zhInfo: "五根长骨构成手掌，每根通向一根手指。" },
  "Carpal bones (wrist)": { zh: "腕骨", en: "Eight small bones in two rows that let the wrist bend and turn.",
    zhInfo: "八块小骨排成两排，让手腕可以灵活弯曲和转动。" }
};

// What to print on the picture for a label: Chinese, English, or both.
export function labelText(key, lang, bilingual) {
  const term = TERMS[key];
  if (!term) return key;
  const en = key.replace(/\s*\(.*\)$/, "");                // "Maxilla (upper jaw)" -> "Maxilla" when shown beside the Chinese name
  if (bilingual) return lang === "zh" ? term.zh + " " + en : en + " " + term.zh;
  return lang === "zh" ? term.zh : key;
}
export function labelInfo(key, lang) {
  const term = TERMS[key];
  return term ? { title: lang === "zh" ? term.zh : key, other: lang === "zh" ? key : term.zh, text: lang === "zh" ? term.zhInfo : term.en } : null;
}
