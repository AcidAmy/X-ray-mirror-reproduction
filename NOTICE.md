# 许可、署名与声明 / Licences, credits and statements

本文件是随项目分发的声明草稿。正式对外发布前，建议由法务或所在机构审核。

## 解剖模型数据

- 来源：BodyParts3D，© The Database Center for Life Science（日本生命科学数据库中心）。
- 许可：Creative Commons Attribution-Share Alike 2.1 Japan（CC BY-SA 2.1 JP），<https://creativecommons.org/licenses/by-sa/2.1/jp/>。
- 改动：模型经过简化和重新对齐（由原始页面作者完成），本项目从原始页面逐字节提取，没有再修改数据本身。
- 适用文件：`public/anatomy/anatomy.bin`、`public/anatomy/meta.json`、`original/X-Ray Mirror.html` 中的内嵌数据。

该许可要求：

1. **署名**：在作品中注明上述来源和许可。本项目在页面"关于与隐私"面板和本文件中署名，请勿删除。
2. **相同方式共享**：如果修改这些模型数据并再分发，修改后的数据必须以相同或兼容的许可发布。
3. 许可本身允许商业使用，但"相同方式共享"的义务随数据一起传递。把本项目用于商业产品或闭源发布前，请确认这一点可以接受。

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
- 首次打开时会从本站下载模型和运行时文件，并缓存在本机以便离线使用；这些请求不携带个人信息。

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
