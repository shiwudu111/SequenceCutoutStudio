# Sequence Cutout Studio 完整开发计划

## 1. 项目定义

### 1.1 项目名称

**Sequence Cutout Studio**

中文名可暂定为：

```text
序列帧透明化工作台
```

---

### 1.2 项目目标

Sequence Cutout Studio 是一套面向游戏美术生产的本地工具，用于把视频或 PNG 序列帧快速处理成透明背景序列帧，并尽可能降低非技术人员的使用门槛。

核心流程：

```text
视频 / 序列帧
→ 自动切帧
→ AI 批量抠图
→ 边缘后处理
→ 黑底 / 棋盘格 / 游戏背景预览
→ 导出可进 TexturePacker / Cocos / Unity 的 PNG 序列帧
```

---

### 1.3 项目定位

这不是单纯的 rembg GUI，也不是简单的 FFmpeg 前端，而是一套面向游戏资源生产的 **序列帧透明化标准流程工具**。

核心价值：

```text
把视频转序列帧、AI 抠图、边缘处理、预览检查、导出规范这几个环节产品化，让非技术人员也能稳定复用。
```

---

## 2. 用户与使用场景

### 2.1 目标用户

| 用户角色 | 主要需求 |
|---|---|
| 游戏美术 | 快速把视频动作转成透明 PNG 序列帧 |
| 技术美术 TA | 建立可复制的素材处理管线 |
| 动效设计师 | 把视频动效转为可进引擎的透明序列帧 |
| 独立开发者 | 低成本处理角色动画、宠物动画、UI 动效 |
| 项目成员 / 外包人员 | 按统一标准输出透明序列帧 |

---

### 2.2 典型使用场景

#### 场景 A：AI 生成宠物动画视频入游戏

```text
AI 生成 MP4
→ 工具切成 8fps / 12fps PNG 序列帧
→ AI 抠图
→ 边缘清理
→ 导出透明 PNG
→ TexturePacker 合图
→ Cocos / Unity 播放
```

---

#### 场景 B：已有序列帧批量抠图

```text
已有 PNG 序列帧文件夹
→ 选择输入目录
→ 测试单帧参数
→ 批量抠图
→ 导出 soft 处理后的透明 PNG
```

---

#### 场景 C：同一套素材反复调边缘参数

```text
已有 general_raw 抠图结果
→ 跳过 AI 抠图
→ 只重新跑 H / I / Custom 边缘处理
→ 快速比较效果
```

---

## 3. 产品原则

### 3.1 使用者不需要懂命令行

正式工具不应要求普通用户理解：

```text
Python
pip
rembg
FFmpeg
PowerShell
ExecutionPolicy
模型路径
环境变量
```

普通用户应该只需要：

```text
打开工具
拖入素材
选择预设
点击开始
检查预览
导出结果
```

---

### 3.2 工具应自带运行环境

为了可推广，工具不能强依赖用户电脑已安装的 Python、FFmpeg、rembg。

推荐做成绿色版工具包：

```text
SequenceCutoutStudio_v0.1
├─ SequenceCutoutStudio.exe
├─ tools
│  ├─ ffmpeg
│  ├─ python
│  ├─ rembg
│  ├─ models
│  └─ postprocess
├─ presets
├─ samples
├─ docs
├─ logs
└─ projects
```

---

### 3.3 先单帧验证，再批量处理

序列帧批量处理成本较高，所以工具应优先支持：

```text
抽取关键帧
→ 生成多档参数对比
→ 用户选择合适参数
→ 再批量处理全部
```

这能显著降低反复处理整套素材的时间成本。

---

### 3.4 保持游戏资源稳定性

输出必须尽量保证：

```text
1. 每帧尺寸一致
2. 文件编号连续
3. 角色中心点不漂移
4. 透明通道正确
5. 边缘不明显闪烁
6. 可进入 TexturePacker / Cocos / Unity
```

---

## 4. 技术路线

### 4.1 推荐技术栈

```text
Electron + React + Node.js
```

原因：

```text
1. Windows 本地文件访问方便
2. 调用 FFmpeg / rembg / Python 简单
3. UI 开发效率高
4. 打包绿色版和安装包成熟
5. 后续接 TexturePacker 比较方便
```

---

### 4.2 架构分层

```text
Sequence Cutout Studio
├─ UI 层：React
│  ├─ 导入素材
│  ├─ 视频切帧
│  ├─ AI 抠图
│  ├─ 边缘处理
│  ├─ 动画预览
│  └─ 导出管理
│
├─ 应用层：Electron Main Process
│  ├─ 文件系统访问
│  ├─ 任务队列
│  ├─ 进度监听
│  ├─ 日志管理
│  └─ 配置管理
│
├─ 工具调用层：Node child_process
│  ├─ ffmpeg.exe
│  ├─ rembg.exe
│  └─ python.exe postprocess.py
│
└─ 资源层
   ├─ presets.json
   ├─ models
   ├─ sample assets
   └─ docs
```

---

### 4.3 为什么不直接调用 PowerShell 脚本

当前命令行工具使用 `.ps1` 可以满足个人使用，但正式前端不应依赖 PowerShell 脚本。

原因：

```text
1. 容易遇到 ExecutionPolicy 拦截
2. 不利于跨机器推广
3. 错误信息不友好
4. 不便于精细进度回传
```

正式 Electron 工具应直接调用：

```text
ffmpeg.exe
rembg.exe
python.exe batch_clean_cutout_soft.py
```

PowerShell 脚本只作为 TA 调试入口保留。

---

## 5. 工具包目录设计

### 5.1 开发目录结构

```text
sequence-cutout-studio
├─ app
│  ├─ main
│  │  ├─ commands
│  │  │  ├─ ffmpeg.ts
│  │  │  ├─ rembg.ts
│  │  │  └─ postprocess.ts
│  │  ├─ services
│  │  │  ├─ projectService.ts
│  │  │  ├─ fileScanService.ts
│  │  │  ├─ taskService.ts
│  │  │  ├─ previewService.ts
│  │  │  └─ logService.ts
│  │  └─ ipc
│  │     ├─ projectIpc.ts
│  │     ├─ processIpc.ts
│  │     └─ previewIpc.ts
│  │
│  ├─ renderer
│  │  ├─ pages
│  │  │  ├─ ImportPage.tsx
│  │  │  ├─ ExtractFramesPage.tsx
│  │  │  ├─ AiCutoutPage.tsx
│  │  │  ├─ EdgeProcessPage.tsx
│  │  │  ├─ PreviewPage.tsx
│  │  │  └─ ExportPage.tsx
│  │  ├─ components
│  │  │  ├─ StepSidebar.tsx
│  │  │  ├─ FileDropZone.tsx
│  │  │  ├─ FramePreview.tsx
│  │  │  ├─ CompareGrid.tsx
│  │  │  ├─ ProgressPanel.tsx
│  │  │  └─ LogPanel.tsx
│  │  └─ styles
│  │
│  └─ shared
│     ├─ types.ts
│     ├─ presets.ts
│     └─ constants.ts
│
├─ bundled-tools
│  ├─ ffmpeg
│  ├─ python
│  ├─ rembg
│  ├─ models
│  └─ postprocess
│
├─ presets
│  ├─ default.json
│  ├─ chibi-character.json
│  └─ ui-effect.json
│
├─ samples
│  ├─ sample_video.mp4
│  └─ sample_frames
│
├─ docs
│  ├─ 快速开始.md
│  ├─ 参数说明.md
│  ├─ 常见问题.md
│  └─ 技术维护文档.md
│
└─ package.json
```

---

### 5.2 绿色版交付目录

```text
SequenceCutoutStudio_v0.1
├─ SequenceCutoutStudio.exe
├─ resources
├─ tools
│  ├─ ffmpeg
│  │  └─ ffmpeg.exe
│  ├─ python
│  ├─ rembg
│  │  └─ rembg.exe
│  ├─ models
│  │  ├─ isnet-general-use.onnx
│  │  ├─ isnet-anime.onnx
│  │  └─ u2net.onnx
│  └─ postprocess
│     └─ batch_clean_cutout_soft.py
├─ presets
│  └─ default.json
├─ samples
├─ docs
├─ logs
└─ projects
```

---

## 6. 功能模块规划

## 6.1 模块一：素材导入

### 功能目标

允许用户导入视频或已有 PNG 序列帧目录，并自动完成基础检测。

### 支持输入

```text
1. MP4 / MOV / WEBM 视频文件
2. PNG 序列帧文件夹
```

### 自动检测内容

视频检测：

```text
视频路径
时长
分辨率
原始帧率
是否可读
预计输出帧数
```

序列帧检测：

```text
PNG 数量
图片尺寸
是否尺寸一致
是否有 alpha 通道
编号是否连续
文件名前缀
首帧 / 中间帧 / 末帧
```

### UI 设计

```text
拖拽区域
选择视频按钮
选择序列帧文件夹按钮
素材信息面板
问题提示区
```

### 验收标准

```text
1. 用户能拖入视频文件。
2. 用户能选择序列帧文件夹。
3. 工具能正确显示素材信息。
4. 如果图片尺寸不一致，工具给出警告。
5. 如果文件夹没有 PNG，工具给出明确提示。
```

---

## 6.2 模块二：视频切序列帧

### 功能目标

把视频按指定 FPS 和时间范围导出为 PNG 序列帧。

### 参数项

```text
输出 FPS：8 / 12 / 15 / 24 / 自定义
开始时间：默认 00:00:00
截取时长：全长 / 3 秒 / 4 秒 / 自定义
输出前缀：pet_idle
输出目录：自动生成或自定义
```

### 内置预设

| 预设 | FPS | 时长 | 说明 |
|---|---:|---:|---|
| 普通待机循环 | 12 | 3-4 秒 | 24-48 帧 |
| 完整表演动作 | 8 | 全长 | 约 72 帧 |
| 精致展示动作 | 15 | 3-4 秒 | 45-60 帧 |
| 自定义 | 用户指定 | 用户指定 | 高级用户使用 |

### 底层命令示例

```text
ffmpeg -i input.mp4 -t 4 -vf fps=12 output/pet_idle_%04d.png
```

### 验收标准

```text
1. 可按 8fps / 12fps 正确导出 PNG。
2. 可截取指定时长。
3. 输出文件编号连续。
4. UI 显示导出进度。
5. 输出完成后能打开文件夹。
```

---

## 6.3 模块三：AI 抠图

### 功能目标

调用 rembg 对 PNG 序列帧进行批量背景移除。

### 默认模型

```text
isnet-general-use
```

### 模型显示方式

普通模式不直接显示技术模型名，而是显示语义化说明：

| UI 名称 | 实际模型 | 说明 |
|---|---|---|
| 通用角色模型 - 推荐 | isnet-general-use | 主体保留稳定 |
| 卡通锐边模型 | isnet-anime | 外轮廓锐利，但可能误扣浅色区域 |
| 默认背景移除模型 | u2net | 边缘偏软 |

### 操作模式

```text
1. 测试单帧
2. 批量处理全部
3. 使用已有 raw 抠图结果
```

### 输出目录规则

输入：

```text
pet_idle_12fps_4s
```

输出：

```text
pet_idle_12fps_4s_general_raw
```

### 验收标准

```text
1. 能对单帧生成 raw 抠图。
2. 能批量处理整个文件夹。
3. 输出数量与输入数量一致。
4. 抠图过程显示进度。
5. 如果模型文件缺失，提示用户修复。
```

---

## 6.4 模块四：边缘后处理

### 功能目标

对 rembg raw 抠图进行二次边缘处理，解决白边、灰边、边缘发虚、背景残留等问题。

### 核心算法

```text
1. 读取原始 PNG 和 raw 抠图 PNG。
2. 取 raw 图 alpha 通道。
3. 清理低透明度残留。
4. 使用 MinFilter 轻微收边。
5. 混合原始 alpha 和收边 alpha，避免边缘过硬。
6. GaussianBlur 轻微柔化，保留抗锯齿。
7. 从原图角落估算背景色。
8. 对边缘做背景色去污染。
9. 输出 RGBA PNG。
```

### 预设

| Preset | 用户显示 | AlphaLow | Shrink | 用途 |
|---|---|---:|---:|---|
| H | 较强收边 | 44 | 0.72 | 边缘较干净素材 |
| I | 干净收边 | 48 | 0.78 | 当前推荐 |
| Custom | 自定义 | 用户输入 | 用户输入 | TA 微调 |

完整内部预设保留 C-I，但普通用户默认只看到：

```text
轻柔
标准
干净
自定义
```

### UI 功能

```text
1. 选择预设
2. 单帧测试
3. H / I / Custom 三档对比
4. 应用到全部
5. 跳过 AI 抠图，只重新处理边缘
```

### 验收标准

```text
1. 可生成 soft_H / soft_I 输出目录。
2. 可跳过 rembg 直接重跑边缘。
3. 输出图保持原始尺寸。
4. 黑底下白边明显减少。
5. 不出现硬剪纸边。
```

---

## 6.5 模块五：预览检查

### 功能目标

让用户在导出前直观看到抠图质量和动画播放效果。

### 单帧预览

显示：

```text
原图
AI raw 抠图
soft 后处理图
黑底预览
棋盘格预览
游戏背景预览
```

### 动画预览

支持：

```text
按 FPS 播放
循环播放
暂停
上一帧 / 下一帧
显示当前帧编号
切换背景
```

### 检查提示

界面上给用户提示：

```text
请检查耳朵边缘、尾巴尖、脚掌、脸部浅色区域。
深色背景下如果仍有明显白边，请尝试更强收边。
如果尾巴尖变薄，请降低收边强度。
```

### 验收标准

```text
1. 能预览单张透明 PNG。
2. 能切换黑底 / 棋盘格 / 自定义背景。
3. 能按指定 FPS 播放序列帧。
4. 能逐帧查看。
```

---

## 6.6 模块六：导出管理

### 功能目标

整理最终输出，并保存处理配置，便于复现和团队协作。

### 导出内容

```text
最终透明 PNG 序列帧
process-config.json
process-log.txt
可选 preview.gif / preview.mp4
```

### process-config.json 示例

```json
{
  "toolVersion": "0.1.0",
  "sourceType": "frames",
  "inputDir": "pet_idle_12fps_4s",
  "frameCount": 48,
  "frameSize": [1024, 1024],
  "model": "isnet-general-use",
  "edgePreset": "I",
  "alphaLow": 48,
  "shrink": 0.78,
  "outputDir": "pet_idle_12fps_4s_soft_I"
}
```

### 验收标准

```text
1. 每次处理都生成配置文件。
2. 配置文件记录关键参数。
3. 日志能记录每个阶段耗时和输出数量。
4. 用户可一键打开最终输出目录。
```

---

## 7. 开发阶段规划

## Phase 0：技术预研与脚本固化

### 目标

把当前命令行流程稳定下来，形成可被前端调用的核心处理逻辑。

### 任务

```text
1. 固化 batch_clean_cutout_soft.py。
2. 清理 PowerShell 流程，仅作为调试工具。
3. 确认 rembg general-use 调用稳定。
4. 确认 FFmpeg 切帧命令稳定。
5. 整理 presets.json。
6. 准备 sample_video 和 sample_frames。
```

### 交付物

```text
postprocess 脚本
默认 preset 配置
示例素材
命令行验证记录
```

### 验收标准

```text
1. 一套视频能完整处理到透明 PNG。
2. 一套已有序列帧能直接抠图并后处理。
3. H / I / Custom 参数可复用。
```

---

## Phase 1：MVP 图形化工具

### 目标

做出能给非技术用户使用的第一版 GUI。

### 功能范围

```text
1. 选择视频或序列帧目录。
2. 视频切帧。
3. rembg 批量抠图。
4. H / I / Custom 边缘处理。
5. 单帧预览。
6. 黑底 / 棋盘格预览。
7. 打开输出目录。
8. 基础日志。
```

### 不做内容

```text
1. TexturePacker 接入。
2. 多动作批量队列。
3. 自动生成 GIF / MP4。
4. 复杂项目管理。
5. 云端处理。
```

### 开发任务

#### 1. Electron 项目搭建

```text
初始化 Electron + React + Vite
建立 main / renderer / shared 结构
配置开发启动和打包命令
```

#### 2. 文件选择与拖拽

```text
支持选择视频
支持选择文件夹
支持拖拽输入
显示素材基础信息
```

#### 3. FFmpeg 调用

```text
封装 ffmpeg.ts
实现视频信息读取
实现切帧
捕获进度和错误
```

#### 4. rembg 调用

```text
封装 rembg.ts
实现单帧抠图
实现批量抠图
支持模型选择
```

#### 5. 后处理调用

```text
封装 postprocess.ts
调用 python 脚本
传入 AlphaLow / Shrink
输出 soft 目录
```

#### 6. 预览 UI

```text
显示原图 / raw / soft
支持黑底 / 棋盘格切换
支持放大查看
```

#### 7. 日志与进度

```text
任务状态：待处理 / 处理中 / 完成 / 失败
显示当前阶段
显示输出数量
保存 process-log.txt
```

### Phase 1 验收标准

```text
1. 非技术用户能通过 GUI 完成一套序列帧透明化处理。
2. 工具不要求用户手动打开 PowerShell。
3. 能正确输出 soft_I 目录。
4. 输出数量与输入数量一致。
5. 黑底预览下可判断边缘质量。
```

---

## Phase 2：参数对比与动画预览

### 目标

提升可用性，让用户能快速选择合适参数。

### 新增功能

```text
1. 自动抽取关键帧。
2. 一键生成 H / I / Custom 参数对比。
3. 三档对比预览。
4. 序列帧动画播放。
5. 自定义游戏背景预览。
6. 保存处理配置 JSON。
```

### 开发任务

#### 1. 关键帧抽取

```text
自动选择第 1 帧
自动选择中间帧
自动选择末尾帧
允许用户手动选择帧编号
```

#### 2. 多档对比

```text
同一帧同时输出 soft_H / soft_I / soft_Custom
横向对比显示
用户点击选择最终参数
```

#### 3. 动画播放器

```text
读取 PNG 序列帧
按 FPS 播放
循环播放
上一帧 / 下一帧
显示帧编号
切换背景
```

#### 4. 配置保存

```text
每次处理保存 process-config.json
支持读取历史配置
支持一键复用上次参数
```

### Phase 2 验收标准

```text
1. 用户能通过对比图选择参数，而不是理解参数。
2. 用户能播放最终序列帧检查闪边。
3. 每套输出都有可复现的配置文件。
```

---

## Phase 3：绿色版交付与团队推广

### 目标

让工具可以发给别人使用，不依赖开发环境。

### 工作内容

```text
1. 打包绿色版。
2. 内置 FFmpeg。
3. 内置 Python / rembg 运行环境。
4. 内置模型文件。
5. 内置示例素材。
6. 编写快速开始文档。
7. 编写常见问题文档。
8. 加入启动自检。
```

### 启动自检项

```text
ffmpeg 是否存在
python 是否存在
rembg 是否存在
模型是否存在
postprocess 脚本是否存在
presets 是否存在
输出目录是否可写
```

### 错误提示优化

把技术错误翻译为用户可理解的信息。

示例：

```text
FileNotFoundError
→ 没有找到输入图片，请检查文件夹是否正确。

ExecutionPolicy
→ 当前系统阻止 PowerShell 脚本运行，但 GUI 版本不依赖 PowerShell。

Out of memory
→ 图片尺寸过大或帧数过多，建议降低分辨率或分批处理。
```

### Phase 3 验收标准

```text
1. 新电脑解压后可直接运行。
2. 不需要用户手动安装 Python / FFmpeg / rembg。
3. sample_video 可以完整跑通。
4. 普通用户能按快速开始完成处理。
```

---

## Phase 4：生产管线增强

### 目标

把工具从单机小工具升级为可接入项目生产流程的 TA 管线工具。

### 可选增强功能

```text
1. 多动作队列批量处理。
2. 自动生成 GIF / MP4 预览。
3. TexturePacker 一键合图。
4. 自动复制到 Cocos / Unity 项目目录。
5. 自动生成动画配置 JSON。
6. 项目级 preset 管理。
7. 处理报告导出。
```

### TexturePacker 接入建议

支持用户配置 TexturePacker 路径：

```text
TexturePacker.exe
```

输入：

```text
soft_I PNG 序列帧目录
```

输出：

```text
atlas.png
atlas.json / plist
```

### Phase 4 验收标准

```text
1. 多套动作可排队处理。
2. 最终资源能一键进入项目资源目录。
3. 每套动作都有配置和预览文件。
```

---

## 8. 版本规划

### v0.1：MVP 可用版

目标：

```text
让非技术用户能稳定处理一套视频或序列帧。
```

包含：

```text
视频/序列帧导入
FFmpeg 切帧
rembg general-use 抠图
H / I / Custom 边缘处理
单帧预览
黑底预览
打开输出目录
基础日志
```

---

### v0.2：参数选择体验版

目标：

```text
让用户更容易选到合适边缘参数。
```

新增：

```text
关键帧抽取
多档参数对比
动画播放预览
process-config.json
复用上次参数
```

---

### v0.3：团队交付版

目标：

```text
让工具可以发给其他人使用。
```

新增：

```text
绿色版打包
内置运行环境
内置模型
启动自检
快速开始文档
示例素材
错误提示优化
```

---

### v1.0：生产管线版

目标：

```text
接入正式游戏资源生产流程。
```

新增：

```text
多动作队列
TexturePacker 接入
项目 preset 管理
自动生成预览 GIF / MP4
导出处理报告
可配置项目输出路径
```

---

## 9. 开发周期建议

### 9.1 小团队节奏

如果 1 名 TA + 1 名前端/工具开发协作：

| 阶段 | 时间 | 目标 |
|---|---:|---|
| Phase 0 | 2-3 天 | 脚本和命令行流程固化 |
| Phase 1 | 1-2 周 | MVP GUI 跑通完整流程 |
| Phase 2 | 1 周 | 参数对比和动画预览 |
| Phase 3 | 1 周 | 绿色版打包和文档 |
| Phase 4 | 2-3 周 | 生产管线增强 |

v0.1-v0.3 大约：

```text
3 到 4 周可交付团队试用版
```

---

### 9.2 单人开发节奏

如果由一个人兼顾工具开发和 TA：

| 阶段 | 时间 |
|---|---:|
| Phase 0 | 3 天 |
| Phase 1 | 2-3 周 |
| Phase 2 | 1-2 周 |
| Phase 3 | 1 周 |

v0.3 大约：

```text
5 到 7 周
```

---

## 10. 任务拆解清单

## 10.1 Phase 0 Checklist

```text
[ ] 固化 batch_clean_cutout_soft.py
[ ] 固化 default presets.json
[ ] 准备 sample_video.mp4
[ ] 准备 sample_frames
[ ] 验证 FFmpeg 切帧
[ ] 验证 rembg general-use 抠图
[ ] 验证 soft I 后处理
[ ] 记录当前参数结论
[ ] 整理命令行工具文档
```

---

## 10.2 Phase 1 Checklist

```text
[ ] 创建 Electron + React 项目
[ ] 实现主窗口布局
[ ] 实现文件拖拽导入
[ ] 实现视频文件选择
[ ] 实现序列帧文件夹选择
[ ] 实现素材信息扫描
[ ] 封装 ffmpeg 命令
[ ] 实现视频切帧 UI
[ ] 封装 rembg 命令
[ ] 实现单帧抠图
[ ] 实现批量抠图
[ ] 封装 postprocess 命令
[ ] 实现 H / I / Custom 选择
[ ] 实现单帧预览
[ ] 实现黑底 / 棋盘格背景切换
[ ] 实现日志窗口
[ ] 实现打开输出目录
```

---

## 10.3 Phase 2 Checklist

```text
[ ] 实现关键帧自动选择
[ ] 实现 H / I / Custom 一键对比
[ ] 实现对比图界面
[ ] 实现动画播放预览
[ ] 实现 FPS 播放控制
[ ] 实现逐帧查看
[ ] 支持自定义预览背景
[ ] 保存 process-config.json
[ ] 支持读取上次配置
[ ] 支持跳过 rembg 重跑边缘
```

---

## 10.4 Phase 3 Checklist

```text
[ ] 内置 FFmpeg
[ ] 内置 Python / rembg
[ ] 内置模型文件
[ ] 配置相对路径工具调用
[ ] 实现启动自检
[ ] 打包绿色版
[ ] 准备 sample 工程
[ ] 编写快速开始.md
[ ] 编写参数说明.md
[ ] 编写常见问题.md
[ ] 找 1-2 个非技术用户试用
[ ] 收集问题并修复
```

---

## 11. 风险与应对

### 11.1 运行环境体积过大

问题：

```text
Python + rembg + onnxruntime + 模型文件会让工具包变大。
```

应对：

```text
1. 第一版接受较大体积，优先保证可用。
2. 后续再考虑精简依赖。
3. 模型文件只内置默认需要的 isnet-general-use。
4. 其他模型按需下载或单独放置。
```

---

### 11.2 不同机器性能差异

问题：

```text
AI 抠图对 CPU / 内存有要求。
```

应对：

```text
1. 增加预计处理时间提示。
2. 支持单帧测试。
3. 支持分批处理。
4. 大图给出性能警告。
```

---

### 11.3 不同素材效果差异大

问题：

```text
AI 抠图不是所有素材都稳定。
```

应对：

```text
1. 提供 H / I / Custom 对比。
2. 支持模型切换。
3. 文档说明适用范围。
4. 对复杂背景提示建议重新生成透明背景源图。
```

---

### 11.4 用户误解工具能力

问题：

```text
用户可能以为所有视频都能一键完美抠图。
```

应对：

```text
1. 快速开始中明确适用素材。
2. UI 中提供质量检查提示。
3. 文档说明复杂素材仍需人工修图或重新生成。
```

---

### 11.5 文件路径中文和空格问题

问题：

```text
Windows 路径可能包含中文、空格、括号。
```

应对：

```text
1. Node 调用命令使用参数数组，不拼接字符串。
2. 所有路径都使用绝对路径。
3. 测试中文路径和空格路径。
```

---

## 12. 成功标准

### 12.1 v0.1 成功标准

```text
1. 在开发电脑上，GUI 可以完整跑通一套素材。
2. 不需要手动输入命令。
3. 输出透明 PNG 数量正确。
4. 可进行黑底预览。
5. 可打开输出目录。
```

---

### 12.2 v0.3 成功标准

```text
1. 一台未配置 Python / FFmpeg / rembg 的 Windows 电脑，解压工具后可以直接运行。
2. 用户能用 sample_video 跑通完整流程。
3. 用户能处理自己的序列帧目录。
4. 工具能生成 process-config.json。
5. 普通用户无需理解命令行。
```

---

### 12.3 v1.0 成功标准

```text
1. 工具可以处理多套动作队列。
2. 可接入 TexturePacker。
3. 可输出游戏项目需要的图集和配置。
4. 团队成员可以按文档独立使用。
5. 一套动作从视频到游戏资源的处理流程稳定可复现。
```

---

## 13. 推荐 MVP 界面草图

```text
┌──────────────────────────────────────────────────────────┐
│ Sequence Cutout Studio                                   │
├───────────────┬─────────────────────────┬────────────────┤
│ 流程           │ 当前步骤                 │ 预览            │
│               │                         │                │
│ 1 导入素材     │ 输入：pet_idle.mp4       │ 原图            │
│ 2 视频切帧     │ FPS：12                  │ raw             │
│ 3 AI 抠图      │ 时长：4s                 │ soft I          │
│ 4 边缘处理     │ 模型：通用角色模型        │ 黑底预览         │
│ 5 预览导出     │ 边缘：干净收边 I          │                │
│               │                         │                │
│               │ [测试单帧]               │ [上一帧] [下一帧] │
│               │ [生成对比]               │ [播放]          │
│               │ [批量处理]               │                │
└───────────────┴─────────────────────────┴────────────────┘
```

---

## 14. 文档体系规划

### 14.1 快速开始.md

面向普通用户。

内容：

```text
1. 打开工具
2. 拖入视频或序列帧
3. 选择推荐预设
4. 点击测试单帧
5. 点击批量处理
6. 检查黑底预览
7. 打开输出目录
```

---

### 14.2 参数说明.md

面向 TA。

内容：

```text
模型差异
H / I / Custom 参数说明
白边怎么调
吃边怎么调
边缘太硬怎么办
边缘太软怎么办
```

---

### 14.3 常见问题.md

面向所有用户。

内容：

```text
打不开工具
没有输出图片
输出数量不一致
边缘有白边
主体被吃掉
处理很慢
模型缺失
路径有中文是否支持
```

---

### 14.4 技术维护文档.md

面向开发者。

内容：

```text
项目结构
工具调用方式
依赖版本
打包方式
日志位置
模型更新方式
preset 配置方式
```

---

## 15. 当前建议的下一步

建议立即进入 Phase 0 和 Phase 1。

### 下一步 1：冻结 MVP 范围

v0.1 只做：

```text
导入素材
切帧
AI 抠图
边缘处理
单帧预览
黑底预览
输出目录
```

暂不做：

```text
TexturePacker
多任务队列
GIF/MP4 预览导出
项目资产自动复制
```

---

### 下一步 2：整理工具核心文件

确保以下文件独立可用：

```text
ffmpeg.exe
rembg.exe
python.exe
isnet-general-use.onnx
batch_clean_cutout_soft.py
presets.json
sample_video.mp4
```

---

### 下一步 3：搭建 Electron 壳

先做最小界面：

```text
选择输入目录
选择 Preset
开始处理
显示日志
打开输出目录
```

只要这个跑通，就已经从命令行脚本迈向可推广工具。

---

## 16. 一句话开发目标

Sequence Cutout Studio v0.1 的开发目标是：

```text
让一个不懂 Python、FFmpeg、rembg 的美术人员，也能把一套视频或 PNG 序列帧稳定处理成可进游戏的透明 PNG 序列帧。
```

v1.0 的目标是：

```text
形成一套可复制、可培训、可维护、可接入项目资源管线的序列帧透明化生产工具。
```

