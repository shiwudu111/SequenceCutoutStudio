# WebP 导入与拆帧验证记录

日期：2026-09-10。状态：开发实现与自动验证通过，待用户复测；未重新打包。

## 实现范围

- “选择视频”及拖入路径识别支持 `.webp`，不区分扩展名大小写。
- WebP 与 GIF 使用相同交互：切帧 FPS/时长置灰，完整拆成 PNG，不抽帧、不按时长截断；每次新建输出目录，静态 WebP 输出一帧。
- 共用 `runtime-tools/extract_animation.py`，使用已有 Pillow 解码合成帧后输出 RGBA PNG。GIF 继续使用原来的 `gif-timing.json`，WebP 使用 `webp-timing.json`。
- 在解码加载后读取当前帧时长，避免 WebP 的延迟加载导致时长缺失或错位。依据：[Pillow WebP 解码实现](https://pillow.readthedocs.io/en/stable/_modules/PIL/WebPImagePlugin.html)。
- 播放勾选项统一为“原始节奏”，默认勾选，可取消并改播放 FPS。重新打开包含时长清单的序列目录仍可恢复原始节奏。
- 构建脚本同步、检查通用解码器，并检查最终 Pillow WebP 支持；中文快速使用说明已同步更新。没有增加依赖、改变模型或修改 rembg / 后处理链路。

## 用户样本

文件：`huaban-6583039695.webp`，SHA-256：`b9ec8c8c2111a891135ec9f92c2b29576eca76440ed8e9f8614192813da2921f`。

- 512 × 512，共 18 帧；解码得到每帧 10ms，完整保留到时长清单。
- 18 张 PNG 的尺寸、全部 RGBA 像素、帧时长逐一与源 WebP 解码帧比对完全一致。
- 首帧透明像素 233,980，半透明像素 22,389，不透明像素 5,775；所有帧均包含半透明像素。
- 拆帧前后源文件 SHA-256 一致。没有运行去背景，也没有将透明度压成二值。
- 独立 Electron 窗口使用样本副本真实导入并拆出 18 帧，播放与棋盘/白/黑背景切换通过；检查了棋盘截图中的透明区域与半透明效果。

## 验证结果

1. `.\node_modules\.bin\tsc.cmd --noEmit`：通过。
2. `npm.cmd run build`：通过。
3. `portable-root/tools/python/python.exe scripts/verify-gif-extraction.py`：两组 GIF 回归通过。
4. `portable-root/tools/python/python.exe scripts/verify-webp-extraction.py <样本路径>`：两组 WebP 测试及用户样本逐帧比对通过。覆盖变帧时长、半透明、静态图、大小写扩展名及拒绝覆盖已有目录。
5. 现有绿色包 Python 运行 WebP 两组测试通过；`import rembg`、`import onnxruntime`、`import PIL, numpy` 通过。
6. `scripts/verify-preview-iteration.mjs`：GIF、MP4、区间输入、大图默认状态及新增 WebP 实测通过。WebP 覆盖选择过滤器、拖入路径识别、禁用参数、实际拆帧、时长扫描、播放、背景切换、重复拆分、目录重开与源文件不变。
7. PowerShell 构建脚本语法解析与隔离目录运行时同步通过，新解码器复制前后哈希一致；现有绿色包 Pillow WebP 支持检查通过。

本地产物位于 `release/preview-iteration-check/`：`webp-verification.json` 为逐帧像素/时长统计，`verification.json` 为 Electron 回归结果，`webp-user-*` 为用户样本 PNG 序列，`user-sample.WEBP-棋盘.png` 等为 GUI 截图。不提交样本和测试输出到 Git。

## 边界与待验收

- 保留素材已有透明度，不代表自动去掉不透明背景；素材原有暗边、阴影或光效颜色也会原样保留。
- 源样本每帧 10ms；清单和播放器使用该值，但实际播放还受磁盘加载和渲染耗时影响，未保证 100 FPS 实时播放性能。
- 原有 `src/main.tsx` 的 IPC 启动监听异常仍单独记录，本轮没有新增页面异常。
- 用户手工复测、新绿色包组装和干净电脑验收尚未进行；完整去背景和导出回归未重跑。
