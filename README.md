# X-Ray Mirror（复现与工程化版本）

在浏览器里用摄像头实时"透视"自己的头和手：颅骨、大脑、面部肌肉、眼球和手骨的真实 3D 模型被配准到你的脸和手上，随头部转动、张嘴和手指弯曲同步运动。

本项目把原始的单文件页面 `original/X-Ray Mirror.html` 拆分成了一个 Vite 工程。模型数据、几何解码、着色器、配准和标签算法都原样保留，没有用任何简化几何体或图片替代。

- 视频只在本机浏览器内处理，不会上传到任何服务器。
- 解剖模型是一位成年人的真实 3D 数据集，按比例贴合到你的头部，展示的是结构的典型位置，不是对你本人的扫描，也不是医疗工具。

## 快速开始

需要 Node.js 18 或更高版本。

```bash
npm install
npm run dev
```

打开 `http://localhost:5173`，点击 **Start camera** 并允许摄像头；没有摄像头时点击 **Try the demo (no camera)**，或直接打开 `http://localhost:5173/#demo`。

`npm install` 结束时会自动运行 `scripts/setup-assets.mjs`：把 MediaPipe 的 wasm 运行时复制到 `public/wasm/`，并把人脸、手部两个追踪模型（共约 11.6 MB）下载到 `public/models/`。下载失败不影响使用，页面会改为在线加载这些文件。之后可以用 `npm run setup` 重试。

## 技术栈

| 依赖 | 版本 | 说明 |
|---|---|---|
| three | 0.160.0 | 与原版一致 |
| @mediapipe/tasks-vision | 0.10.14 | 与原版一致 |
| vite | 5.x | 开发服务器与打包 |

## 功能

- 摄像头实时画面，镜像显示
- 人脸关键点检测，头部位置和旋转跟踪，下颌开合
- 颅骨、大脑、肌肉、眼球、头部轮廓、手骨六个图层独立开关
- 3D 模型与真人面部实时配准（姿态矩阵加 13 个关键点的屏幕对齐）
- 手部 21 个关键点驱动手掌和 15 根指骨
- X-Ray 与 Solid 两种渲染效果，亮度可调
- 左右、上下剖切，以及跟随食指指尖的 X-Ray Lens
- 整体大小、宽、高、深和三个方向位置的手动校准
- 解剖标签（头部 26 个、每只手 5 个）、追踪数据面板、FPS
- 设置保存在浏览器本地（`localStorage` 的 `xr_settings`）
- 摄像头异常处理和无摄像头的 Demo 模式

## 目录结构

```
index.html                 页面结构和操作面板
src/
  main.js                  启动流程，摄像头模式与 Demo 模式的切换
  state.js                 舞台尺寸、状态栏
  settings.js              默认值、本地保存、控件绑定、预设
  camera.js                摄像头申请、释放、异常说明
  frame.js                 一帧的绘制流程（实时和 Demo 共用）
  reveal.js                剖切平面和透镜遮罩
  anatomy/decode.js        模型数据加载与解码
  render/shaders.js        着色器和材质（X-Ray、Solid、遮罩三种模式）
  render/scene.js          渲染器、相机、网格装配、风格切换、尺寸变化
  render/layers.js         每帧的图层可见性、亮度、剖切参数
  tracking/trackers.js     MediaPipe 加载（GPU 失败回退 CPU，本地缺失回退在线）
  tracking/head.js         头部姿态平滑、屏幕配准、手动校准
  tracking/hands.js        手骨姿态和手部遮罩
  hud/labels.js            解剖标签
  hud/data.js              追踪点、数据面板、FPS
  loops/live.js            实时循环
  loops/demo.js            Demo 循环
public/anatomy/            meta.json 和 anatomy.bin（从原始 HTML 逐字节提取）
scripts/
  extract-anatomy.mjs      从原始 HTML 重新提取模型数据并校验
  setup-assets.mjs         准备 wasm 运行时和追踪模型
original/                  原始单文件页面，仅供对照
```

## 模型数据格式

`public/anatomy/anatomy.bin`（2,032,482 字节）包含 23 个网格，共 113,248 个顶点、225,499 个三角面。`meta.json` 里每个网格有一条记录：

- `offV`、`nv`：顶点数据的字节偏移和顶点数。每个坐标是 16 位无符号整数，按 `min + q / 65535 * size` 还原成厘米。
- `offI`、`ni`：索引数据的字节偏移和索引数，16 位无符号整数。
- 法线在加载时用 `computeVertexNormals` 计算。

`meta.json` 还包含标签锚点 `labels`、下颌转轴 `jawPivot`、人脸配准点 `fit` 和 Demo 用的手部关键点 `demoHand`。

运行 `npm run extract` 可以从 `original/X-Ray Mirror.html` 重新生成这两个文件。

## 相对原版的改动

渲染和算法没有改动，`?still#demo` 的静态帧与原版一致。改动只有这些：

| 改动 | 原因 |
|---|---|
| 新增 Demo 按钮和 "Switch to the camera" | 原版只能靠手动输入 `#demo` 进入 Demo |
| 状态栏常驻显示 FPS | 原版只在追踪数据面板里显示 |
| 标签列向内收，保证最宽的文字不出画面 | 原版手靠近画面边缘时标签被裁掉 |
| 启动失败或切换模式时释放摄像头 | 原版失败后摄像头仍然开着 |
| 摄像头中途断开时回到开始界面并提示 | 原版没有处理 |
| 区分"没有摄像头""摄像头被占用""非 HTTPS"三种错误 | 原版只区分"被拒绝"和"其他" |
| 读取本地设置时校验类型和取值 | 损坏的设置不应让页面出错 |
| Demo 的手指会缓慢弯曲 | 不用摄像头也能看到手骨跟随手指弯曲；`?still` 下保持原版姿态 |
| 追踪模型和 wasm 优先从本站加载 | 可离线部署，不依赖外部网站 |

## Demo 模式的测试开关

- `#demo`：动画 Demo。
- `?still#demo`：只画一帧固定姿态，用于和原版截图对比。
- `?dump#demo`：1.5 秒后把所有图层合成一张图片盖在页面上，用于测试。

## 部署

```bash
npm run build
```

产物在 `dist/`（约 33 MB，其中 wasm 约 19 MB、追踪模型约 11.6 MB、解剖模型约 2 MB），是纯静态文件，放到任何静态托管上都可以。所有路径都是相对路径，放在子目录下也能用。

部署时注意：

1. **必须用 HTTPS**（或 `localhost`），否则浏览器不允许访问摄像头。
2. 服务器要把 `.wasm` 文件按 `application/wasm` 类型返回。Nginx、Netlify、Vercel、GitHub Pages、Cloudflare Pages 默认都是这样。
3. 如果不想托管 wasm 和追踪模型，可以在构建后删掉 `dist/wasm` 和 `dist/models`，页面会自动改从 jsDelivr 和 Google 存储在线加载，这时用户的网络需要能访问这两个地址。

本地预览构建结果：

```bash
npm run preview
```

GitHub Pages：在构建环境里运行 `npm ci && npm run build`，把 `dist/` 作为发布目录。

## 浏览器要求

需要支持 WebGL2、WebAssembly 和 ES 模块的桌面或移动浏览器，推荐 Chrome 或 Edge。

## 数据来源与许可

解剖模型：BodyParts3D，© The Database Center for Life Science，以 CC Attribution-Share Alike 2.1 Japan 许可发布。模型经过简化和重新对齐。再分发 `public/anatomy/` 和 `original/` 中的数据时需要保留这段署名，并沿用相同许可。
