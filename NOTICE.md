# 许可、署名与声明 / Licences, credits and statements

本文件是随项目分发的声明草稿。正式对外发布前，建议由法务或所在机构审核。

## 原始页面来源与授权核查（2026-11-16）

**当前结论：来源已追溯，原始程序的改编、再分发授权仍未确认，阶段 5e 未通过。** 本记录是基于可见材料的初步核查，不是法律意见，也不表示已经认定侵权。下列数据和依赖库的许可不能代替原始 HTML、JavaScript、着色器及其他受保护表达的授权。

### 可复核的来源证据

- 原件实际位于 `original/X-Ray Mirror.html`（不是 `origin/`）。用户提供下载短链：<https://t.co/Bd35DJYIwi>。
- 短链跳转到 [Google Drive 原件](https://drive.google.com/file/d/19PFMzVAZMMdmrHQUdu8KUvfBgqViCE17/view?usp=sharing)。本次下载与仓库原件均为 2,762,056 字节，SHA-256 均为 `b5e12cd0755ac0976e655c4f9ac914c2a7a6b54474455d66549cbdfa6511dfb0`。
- [Reddit 发布帖（u/Sourcecode12）](https://www.reddit.com/r/ClaudeAI/comments/1xstews/i_built_a_webcam_xray_mirror_with_claude_fable_52/) 链接到同一 Drive 文件，说明可免费下载试用，并单独注明 BodyParts3D 数据许可；已查看内容未见明确的程序改编、再分发许可。
- [作品转载记录](https://www.whatpeoplemade.com/i/x-ray-mirror-that-tracks-your-skull-and-brain-live-085321.html) 指向 [Hashem Al-Ghaili 的 X 发布帖](https://x.com/HashemGhaili/status/2120202746121085321)；[账号索引](https://www.sotwe.com/HashemGhaili) 同时列出用户提供的短链。因此 `@HashemGhaili` 是目前最有依据的联系对象。X 原帖本次直接访问返回 403，账号对应关系及其是否拥有全部授权权利仍应由发布者确认，不能仅凭转载作最终认定。
- 原件第 149 行只声明解剖模型的 CC BY-SA 2.1 JP 许可；检索未找到单独的程序许可证。仓库是基于该原件的衍生开发，工程拆分不等于独立重写。

### 待完成的授权与分发核查

1. 联系发布者，确认原程序是否已有明确开源许可证；如无，请有权授权的人书面确认：允许修改程序、在 GitHub 发布原件及衍生源码、在 Netlify 公开托管、分发构建和单文件 HTML、参加 2027 年挑战杯及使用截图/视频/论文材料；说明已经存在的发布并请求确认其处理方式。明确署名方式、许可期限和范围；未来商业使用如有需要另行覆盖。保存可验证的回复、日期和所指文件版本。未回复不视为同意；第三方数据仍遵循各自许可。
2. 授权未明前，不把整个项目宣称为“已开源”“全部自主原创”或擅自给上游代码添加 MIT 等许可证。建议在取得明确许可前暂停扩大公开分发，并与导师/学校知识产权部门评估现有网站及仓库的访问范围。仅补署名不能替代必要授权。
3. 若无法取得许可，评估独立实现：以功能需求和独立设计为依据重新编写受影响部分，使用可追溯的合法数据和依赖，保留设计与实现记录，并核查旧代码、布局、文案和原件是否仍在交付物中。改变量名、换皮、拆文件、增加功能或让 AI 改写都不是可靠的版权隔离办法；不存在通用的“改到某个百分比即可”规则。移除当前文件也不自动解决既有发布和 Git 历史中的复制问题。
4. 核查实际发布物的许可随附情况：根目录 `NOTICE.md` 不会仅因存在于仓库而自动进入 Vite 的 `dist/`；当前单文件脚本没有嵌入完整 NOTICE、MRI 的 `SOURCE-COPYING` 或 CT 的 `SOURCE-LICENSE.txt`。页面已有部分署名与外链，仍需逐一对照各许可证，补齐必需的版权、许可文本和修改说明，覆盖网站、普通单文件和离线单文件，以及其依赖/追踪模型。此项尚未完成，不能把仓库中的许可表当作所有产物已合规的证明。

联系草稿（仅草稿，未发送）：

> Hello, did you publish the X-Ray Mirror HTML linked above, and are you authorised to license its application code? We adapted that file for an anatomy education project at Southern Medical University, adding tracking improvements, bilingual explanations and CT/MRI teaching views. The derivative is already on GitHub and Netlify, and we plan to submit our documented additions to the 2027 Challenge Cup. Is the original code available under an open-source licence? If not, would you grant written permission to modify it, publish the original and derivative source on GitHub, host the app publicly, distribute built/single-file versions, and include screenshots and videos in competition and academic materials? Please clarify whether this also covers our existing publication, your required credit and any restrictions. Third-party anatomy data and libraries will retain their own licences. We will clearly distinguish your original work from our additions.

### 挑战杯与专业审阅

- 将原始镜像方案、原版代码与模型处理，和本项目后续工程化、跟踪改进、中文教学、CT/MRI 三视图与交互分别列出；以提交记录、实验数据及成员分工支持新增贡献。取得授权只解决相应使用权限，不自动证明参赛原创性或创新性。保留 AI 辅助开发记录，按届时要求披露。
- 术语和讲解可以请解剖/影像专业老师或同学独立审阅。报告应记录对应提交版本、审阅人及专业背景、逐项意见和参考文献、修改结果、日期及复核结论，并如实区分指导、审阅与学生研究贡献；不能把外部代做的核心研究写成参赛者独立完成。
- [2023 年官方竞赛章程](https://2023.tiaozhanbei.net/media/ckeditor_uploads/44/2023/06/08/%E9%99%84%E4%BB%B62%28530%29.pdf) 对学生成果、作者贡献及学校自查有要求，这里仅作历史参考。本次未核实到南方医科大学 2027 年适用通知和最终章程，申报类别、资格、AI 披露和医疗卫生类证明要求以学校及当届通知为准。专业术语审阅不当然等同于赛事要求的专家鉴定。
- 法律参考：[《中华人民共和国著作权法》](https://www.nsfc.gov.cn/p1/2871/2872/69475.html)，特别是第 2、10、13、24、26 条。免费下载试用不能直接推定为任意改编和公开再分发许可；教育或科研目的也不是对公开部署和源码分发的普遍豁免。

## 解剖模型数据

- 来源：BodyParts3D，© The Database Center for Life Science（日本生命科学数据库中心）。
- 许可：Creative Commons Attribution-Share Alike 2.1 Japan（CC BY-SA 2.1 JP），<https://creativecommons.org/licenses/by-sa/2.1/jp/>。
- 改动：模型经过简化和重新对齐（由原始页面作者完成），本项目从原始页面逐字节提取，没有再修改数据本身。
- 适用文件：`public/anatomy/anatomy.bin`、`public/anatomy/meta.json`、`original/X-Ray Mirror.html` 中的内嵌数据。

该许可要求：

1. **署名**：在作品中注明上述来源和许可。本项目在页面"关于与隐私"面板和本文件中署名，请勿删除。
2. **相同方式共享**：如果修改这些模型数据并再分发，应按该版本许可规定的许可选项共享改编数据，不能任意改为闭源或其他不相容许可；不据此推定所有独立程序代码也适用同一许可。
3. 许可本身允许商业使用，但"相同方式共享"的义务随数据一起传递。把本项目用于商业产品或闭源发布前，请确认这一点可以接受。

版本核查提示（2026-11-16）：[LSDB 官方归档许可页](https://dbarchive.biosciencedbc.jp/en/bodyparts3d/lic.html) 目前标为 CC BY 4.0（页面更新日期 2025-02-27），而取得的 HTML 明确标为 CC BY-SA 2.1 JP。本项目继续保留取得版本的声明；尚未核实具体原始模型版本与上游改编者的贡献范围，不能直接把现有衍生网格改标为 CC BY 4.0。若以后从官方归档重新取得原始模型并独立处理，应记录下载版本、许可与处理过程。

## 第三方软件

| 组件 | 版本 | 许可 |
|---|---|---|
| three.js | 0.160.0 | MIT |
| MediaPipe Tasks Vision（含 wasm 运行时） | 0.10.14 | Apache License 2.0 |
| 人脸与手部追踪模型（face_landmarker、hand_landmarker） | float16/1 | Apache License 2.0，见各模型的 model card |
| Vite（仅构建时使用） | 5.x | MIT |

## 隐私声明

- 摄像头画面只在观众自己的浏览器内分析，用于定位人脸和手。
- 画面不会上传到任何服务器，不会录制，也不会保存。
- 本项目不含任何统计、追踪或广告代码。
- 浏览器本地只保存显示设置（`xr_settings`）和界面语言（`xr_lang`），不包含任何影像或身体特征数据。
- 首次打开时会从本站下载模型和运行时文件，并缓存在本机以便离线使用；这些请求不上传摄像头画面或追踪关键点，但服务器仍可接收到 IP 地址等常规请求信息。

如果通过第三方托管服务发布，托管方可能记录访问日志（如 IP 地址），这取决于所选服务，请在对外的隐私说明中如实说明。

## 非医疗用途声明

本项目是科普教育展项。模型展示的是人体结构通常所在的位置，来自一位成年人的数据并按比例贴合到观众头部，不是对观众本人的扫描或成像。它不是医疗器械，不能用于诊断、治疗或任何医疗决策。

## English summary

Anatomy models: BodyParts3D, © The Database Center for Life Science, licensed under CC Attribution-Share Alike 2.1 Japan; simplified and re-aligned. Keep this credit, and share modified model data under the same licence. Software: three.js (MIT), MediaPipe Tasks Vision and its models (Apache 2.0). Video is processed in the visitor's browser only and is never uploaded, recorded or stored. This is an educational exhibit, not a medical device.


## ICBM152 MRI atlas (stage 6b)

Source: McGill University, ICBM152 nonlinear 2009c symmetric T1 and CSF/GM/WM tissue probabilities.
https://nist.mni.mcgill.ca/icbm-152-nonlinear-atlases-2009/

Copyright (C) 1993–2004 Louis Collins, McConnell Brain Imaging Centre, Montreal Neurological Institute, McGill University.
Permission to use, copy, modify, and distribute this software and its documentation for any purpose and without fee is hereby granted, provided that the above copyright notice appear in all copies.
The authors and McGill University make no representations about the suitability of this software for any purpose. It is provided “as is” without express or implied warranty.
The authors are not responsible for any data loss, equipment damage, property loss, or injury to subjects or patients resulting from the use or misuse of this software package.

References requested by the atlas authors:
- Fonov et al. (2011), Unbiased average age-appropriate atlases for pediatric studies. DOI: 10.1016/j.neuroimage.2010.07.033.
- Fonov et al. (2009), Unbiased nonlinear average age-appropriate brain templates from birth to adulthood. DOI: 10.1016/S1053-8119(09)70884-5.

Changes made here: approximate affine alignment to BodyParts3D brain bounds; resampling onto a 2 mm model-coordinate grid; T1 windowing to uint8; probability argmax labels inside the brain mask. Source archive hash and transforms are retained in public/volume/meta.json. This is a population-average atlas, not a patient's scan. No clinical or local anatomical registration accuracy is claimed. The supplied probability maps are not manually delineated labels of an individual.

## CT teaching sample (stage 6d)

- Distributor: Google DeepMind, TCIA Test & Validation Radiotherapy CT Planning Scan Dataset, https://github.com/google-deepmind/tcia-ct-scan-dataset .
- Pinned revision: `2edb50947e50ef26e60b72dec89d36d71efe5549`; sample `0522c0017`, `nrrds/test/oncologist/0522c0017/CT_IMAGE.nrrd` and `segmentations/Brain.nrrd`.
- Licence of this public redistribution: Creative Commons Attribution 4.0 International, https://creativecommons.org/licenses/by/4.0/ . The distributor's full licence is retained in `public/ct/SOURCE-LICENSE.txt`.
- Attribution: Stanislav Nikolov et al., *Deep learning to achieve clinically applicable segmentation of head and neck anatomy for radiotherapy* (2018), https://arxiv.org/abs/1809.04430 . Original scan collection: Bosch, Straube, Matthews and Purdy, *Head-Neck Cetuximab*, TCIA (2015), https://doi.org/10.7937/K9/TCIA.2015.7AKGJUPZ .
- Source used here is the independently published DeepMind release, not TCIA's current restricted download service. This project does not grant access to other TCIA scans or imply their current terms are the same.
- Changes: brain-mask bounding-box affine alignment to the BodyParts3D brain/hindbrain; 2 mm model-coordinate resampling; integer HU rounding; head-bound cropping; an independent scan-coverage mask. No segmentation categories are displayed for CT. The brain mask is used only for coarse alignment.
- Files: `public/ct/head.bin`, `meta.json`, `source.json`, and the embedded CT payloads in generated single-file HTML. Source hashes, orientation, transforms, intensity provenance and dimensions are retained in metadata. Reproduction: `python3 scripts/prepare-ct.py CT_IMAGE.nrrd Brain.nrrd` (numpy and scipy).
- This is a radiotherapy patient sample, not a healthy reference atlas, not the visitor's scan, and not paired with the ICBM152 MRI. Published NRRD physical intensities are retained; original per-slice DICOM calibration metadata is not included in this redistribution. The HU display is an interpolated, resampled teaching value, not a diagnostic measurement. No local registration accuracy or CT tissue recognition is claimed.
