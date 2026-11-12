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
