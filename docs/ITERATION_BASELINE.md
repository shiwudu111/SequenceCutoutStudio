# Sequence Cutout Studio 后续迭代基线

版本定位：第一版内测绿色包已通过，进入发布流程固化与下一轮功能开发准备

当前阶段：Phase 4F 处理效果增强推进中，Phase 4F-3 已完成

基线日期：2026-05-28

---

## 0. 阶段回顾规则

本文档作为后续开发的稳定基线。

每完成一个阶段后，必须先回顾并更新本文档，再确定下一个阶段目标。

阶段收口时至少回顾：

```text
1. 本阶段目标是否完成
2. 实际完成了哪些文件和能力
3. 跑过哪些验证命令
4. 是否影响绿色包、launcher、portable Python、rembg 链路
5. 是否破坏当前稳定基线
6. 下一个阶段的唯一主目标是什么
```

在没有完成阶段回顾前，不建议直接进入新的大功能开发。

---

## 1. 当前稳定项目状态

Sequence Cutout Studio 当前已经完成第一版内测交付闭环：

```text
导入视频 / 序列帧
↓
视频切帧 / 序列帧扫描
↓
rembg 单帧测试
↓
rembg 批量抠图
↓
边缘后处理
↓
Raw / Soft 预览
↓
C / F / I / Custom 参数对比
↓
配置保存 / 读取
↓
绿色版打包
↓
C# launcher 启动
↓
干净电脑 zip 验收通过
```

当前稳定结论：

```text
[x] 绿色 zip + 顶层 launcher 形态通过
[x] launcher 启动画面通过
[x] 主程序启动通过
[x] portable Python / rembg / onnxruntime / PIL / numpy import 通过
[x] 旧 .venv 未进入发布包
[x] zip 体积约 553.83 MB，属于合理范围
[x] 新 icon 已进入最终 release 包
[x] 干净电脑打开压缩包验收通过
```

当前项目已经不再处于“第一版打包收口”阶段，而是进入：

```text
稳定基线归档
↓
构建与发布流程固化
↓
启动自检增强
↓
版本号规范
↓
工程系统与专业工作流
```

---

## 2. 当前稳定发布形态

当前稳定发布形态是：

```text
绿色文件夹 zip + 顶层 C# launcher
```

最终目录结构：

```text
SequenceCutoutStudio-Internal/
├─ SequenceCutoutStudio-Internal.exe
└─ app/
   ├─ SequenceCutoutStudio.exe
   ├─ resources/
   │  └─ portable-root/
   ├─ locales/
   ├─ *.dll
   ├─ *.pak
   └─ ...
```

用户只需要双击：

```text
SequenceCutoutStudio-Internal.exe
```

不要把完整启动页逻辑重新塞回 Electron main.ts 的 BrowserWindow。Electron 主窗口可以隐藏加载，但启动前提示应由 launcher 负责。

---

## 3. 后续阶段总路线

更新后的阶段建议：

```text
Phase 3D-2：Launcher 内测绿色版收口        已完成
Phase 3D-3：自动化构建                     已完成基础闭环
Phase 3D-3B：稳定基线归档与构建文档        已完成
Phase 3D-5：版本号与发布规范                已完成
Phase 3D-4：启动体验与真实自检增强          已完成
Phase 4A：工程系统 Project System          已废弃前端入口
Phase 4B：预览体验与帧导航                  已完成
Phase 4C：任务队列与批处理稳定化            已完成
Phase 4D：导出系统                         已完成
Phase 4E：缓存系统                         已完成
Phase 4F：处理效果增强                     进行中
Phase 5：正式发布包装
```

---

# Phase 3D-2：Launcher 内测绿色版收口

状态：已完成。

已完成内容：

```text
[x] 顶层 C# launcher 作为唯一启动入口
[x] Electron 主程序放入 app/
[x] 顶层目录只保留 launcher exe 和 app 文件夹
[x] splash.bmp 编译进 launcher
[x] icon.ico 编译进 launcher
[x] 新 icon 清晰度问题已解决
[x] 内测 zip 输出
[x] sample_video 全流程验收
[x] 干净电脑 zip 验收通过
```

本阶段不再继续扩展，后续只允许修 bug，不建议重新设计 launcher 架构。

---

# Phase 3D-3：自动化构建

状态：基础闭环已完成。

已完成内容：

```text
[x] scripts/build-internal.ps1 可执行完整内部绿色包构建
[x] 自动执行 npm build
[x] 自动执行 electron-builder --win dir
[x] 自动清理旧 release/SequenceCutoutStudio-Internal
[x] 自动清理旧 .venv / tools/rembg
[x] 自动清理 sample 输出目录
[x] 自动组装 app 目录
[x] 自动编译 launcher
[x] 自动嵌入 icon.ico / splash.bmp
[x] 自动验证 Python import
[x] 自动压缩 zip
[x] 自动输出 zip 体积
```

后续补强项：

```text
[ ] 构建文档
[ ] 失败提示整理
[ ] 构建日志说明
[ ] 版本号接入
```

图标固定规则：

```text
[x] build/icon.ico 必须包含 16 / 24 / 32 / 40 / 48 / 64 / 96 / 128 / 256 全尺寸
[x] 所有 icon 尺寸必须使用 PNG 条目，避免 Explorer 使用低清 DIB 小图
[x] 128px 以下小尺寸在生成时做锐化处理，保证 Explorer 常用的 48 / 64 / 96 显示清晰
[x] launcher 构建后必须同时替换 MAINICON 和 32512 两个 icon group
[x] build-internal.ps1 必须验证最终 exe 可提取 48 / 64 / 256 图标
[x] 构建后刷新 shell icon cache；如资源管理器仍显示旧图，重启 Explorer
```

---

# Phase 3D-3B：稳定基线归档与文档

状态：已完成。

目标：把这次已经验收通过的绿色包状态固化下来，避免后续开发破坏当前稳定链路。

需要完成：

```text
[x] 提交当前稳定基线改动
[x] 记录 icon 生成来源和生成脚本
[x] 编写 docs/BUILD-INTERNAL.md
[x] 编写 docs/PORTABLE-RUNTIME.md
[x] 记录 Explorer icon cache 问题和处理方式
[x] 记录干净电脑验收结论
```

建议纳入本次基线的内容：

```text
build/icon.ico
build/icon.png
scripts/generate-icon-assets.ps1
scripts/build-internal.ps1
docs/ITERATION_BASELINE.md
docs/BUILD-INTERNAL.md
docs/PORTABLE-RUNTIME.md
AGENTS.md
```

完成标准：

```text
后续任何人都能按文档重新生成同样结构的内部绿色包，并知道不能恢复 .venv。
```

阶段回顾：

```text
目标是否完成：已完成。
实际完成：补充构建文档、portable runtime 文档、迭代基线文档，并在 AGENTS.md 中写入阶段回顾规则。
验证命令：本阶段只改文档和资源归档，不涉及运行逻辑；未重新跑 build。
稳定链路影响：不改变 Electron / launcher / portable Python / rembg 调用链路。
下个阶段唯一主目标：进入版本号与发布规范，形成 0.4.0-internal.1。
```

---

# Phase 3D-4：启动体验与真实自检增强

状态：已完成。

目标：让启动失败、运行时缺失、工具链异常时，用户能看到清楚的人话提示。

需要完成：

```text
[x] launcher 启动失败错误提示
[x] launcher 启动超时提示
[x] Electron 写启动阶段状态文件
[x] launcher 显示真实启动阶段
[x] 启动自检改为真实运行检查
[x] 检查 ffmpeg.exe
[x] 检查 python.exe
[x] 检查 rembg_runner.py
[x] 检查模型文件
[x] 检查 postprocess 脚本
```

用户可见文案应保持简单：

```text
正在准备本地处理工具...
正在检查视频处理工具...
正在检查自动去背景工具...
正在进入工作台...
```

不要在普通界面暴露 `onnxruntime`、`site-packages`、`PYTHONPATH`、`.venv` 这类技术细节。

阶段回顾：

```text
目标是否完成：已完成。
实际完成：launcher 读取 Electron 启动状态文件，增加 120 秒启动超时提示，增加主程序提前退出提示；Electron 写入启动阶段状态；启动自检项目改为更偏用户理解的标签。
验证命令：tsc --noEmit 通过；npm.cmd run build 通过；build-internal.ps1 提权后通过。
绿色包验证：rembg / onnxruntime / PIL / numpy import 通过。
产物：release/SequenceCutoutStudio-Internal-v0.4.0-internal.1-win-x64.zip，约 553.78 MB。
稳定链路影响：不改变 portable Python / rembg_runner / postprocess 链路。
下个阶段唯一主目标：Phase 4A 工程系统 Project System。
```

---

# Phase 3D-5：版本号与发布规范

状态：已完成。

已解决的问题：

```text
当前 zip 已升级为 v0.4.0-internal.1
```

建议下一个内测版本号：

```text
0.4.0-internal.1
```

需要完成：

```text
[x] 修改 package.json version
[x] 构建脚本自动读取 version
[x] zip 文件名自动带版本号
[x] 软件界面显示当前版本
[x] 日志中输出当前版本
[x] 内测反馈模板要求提供版本号
```

建议包名：

```text
SequenceCutoutStudio-Internal-v0.4.0-internal.1-win-x64.zip
```

阶段回顾：

```text
目标是否完成：已完成。
实际完成：package.json / package-lock 版本升级，构建脚本默认读取 package version，UI 和处理日志显示版本号，新增内测反馈模板。
验证命令：tsc --noEmit 通过；npm.cmd run build 通过；build-internal.ps1 提权后通过。
绿色包验证：rembg / onnxruntime / PIL / numpy import 通过。
产物：release/SequenceCutoutStudio-Internal-v0.4.0-internal.1-win-x64.zip，约 553.78 MB。
稳定链路影响：不改变 portable Python / rembg_runner / postprocess 链路。
下个阶段唯一主目标：Phase 3D-4 启动体验与真实自检增强。
```

---

# Phase 4A：工程系统 Project System

状态：已废弃前端入口。

结论：当前产品定位仍是偏功能向的本地工具，不追求大而全。工程概念会让软件显得过重，并和“打开视频 / 打开序列帧 / 保存参数”的轻量流程产生心智冲突。

已废弃内容：

```text
[x] 前端移除工程管理入口
[x] 前端移除新建工程
[x] 前端移除打开工程
[x] 前端移除保存工程
[x] 前端移除最近工程列表
[x] preload / renderer 类型不再暴露工程 API
```

当前保留：

```text
[x] 打开视频
[x] 打开序列帧
[x] 视频切帧
[x] 保存参数 / 读取参数
```

阶段回顾：

```text
目标是否完成：已重新评估并废弃前端入口。
实际完成：移除工程管理 UI；保留打开视频、打开序列帧和保存参数；避免用户把轻量工具理解成项目管理软件。
验证命令：tsc --noEmit 通过；npm.cmd run build 通过；build-internal.ps1 通过。
绿色包验证：rembg / onnxruntime / PIL / numpy import 通过。
产物：release/SequenceCutoutStudio-Internal-v0.4.0-internal.1-win-x64.zip，约 553.81 MB。
稳定链路影响：不改变 portable Python / rembg_runner / postprocess 链路。
下个阶段唯一主目标：Phase 4B 预览体验与帧导航。
```

---

# Phase 4B：预览体验与帧导航

状态：已完成并收口。

目标：让用户在不同屏幕尺寸下都能看清预览图，并能更细致地检查 Raw / Soft 差异和当前帧附近变化。

需要完成：

```text
[x] 预览框响应式优化
[x] 小窗口下预览区保持可用高度
[x] Raw / Soft 滑块对比
[x] 点击预览图弹出大预览
[x] 大预览支持滚轮缩放
[x] 大预览支持拖动画面
[x] 标尺 + 游标帧导航
[x] 当前帧高亮
[x] 拖动游标切换帧
[x] 原图 / Raw / Soft 在预览框内完整等比例显示
[x] Raw / Soft 对比图保持同坐标、同比例叠加
[x] 宽屏 / 标准窗口 / 小窗口响应式断点
[x] 日志区域限制高度并内部滚动
[x] 左侧当前阶段 / 环境自检信息上移
```

完成标准：

```text
预览窗口不会在小屏幕下被压成不可用区域；原图、Raw、Soft 都能完整等比例显示；Raw / Soft 对比使用同一坐标盒叠加，滑块只负责裁切显示范围；用户可以双击放大观察细节，并通过标尺游标快速切换帧。
```

暂缓内容：

```text
[ ] 标记问题帧
[ ] 显示失败帧
[ ] Raw / Soft 状态徽标
[ ] 缩略图时间轴
[ ] 复杂关键帧系统
```

阶段回顾：

```text
目标是否完成：已完成。
实际完成：预览区响应式布局；Raw / Soft 滑块对比；双击预览弹出大图；大图支持滚轮缩放、拖动和还原；帧导航改为标尺 + 游标，避免大量缩略图挤压界面；进一步修正不同窗口尺寸下的三列 / 两列 / 单列布局；修正原图、Raw、Soft 预览不完整显示问题；修正 Raw / Soft 对比左右比例不一致问题；压缩日志高度并改为内部滚动；左侧当前阶段和环境自检信息不再沉底。
验证命令：tsc --noEmit 通过；npm.cmd run build 通过；build-internal.ps1 提权后通过。
绿色包验证：rembg / onnxruntime / PIL / numpy import 通过。
产物：release/SequenceCutoutStudio-Internal-v0.4.0-internal.1-win-x64.zip，约 553.78 MB。
稳定链路影响：不改变 portable Python / rembg_runner / postprocess 链路。
下个阶段唯一主目标：Phase 4C 任务队列与批处理稳定化。
```

---

# Phase 4C：任务队列与批处理稳定化

状态：已完成。

目标：让批量处理更稳定、更可控，避免用户误以为软件卡死。

需要完成：

```text
[x] 批处理状态条
[x] 显示批处理阶段：准备处理 / 自动去背景 / 修边处理中 / 已完成 / 处理失败
[x] 显示输出数量 / 总数量
[x] 显示失败数量
[x] 批处理状态放在左侧栏：当前阶段、环境自检之后
[x] 日志区保持纯日志，不放大块任务面板
[x] 失败信息人话化：输入为空 / Raw 缓存不匹配 / 自动去背景失败 / 修边失败 / 数量不一致 / 未知失败
[x] 失败详情保留技术日志，放在日志详情里
[ ] 显示当前处理帧
[ ] 显示预计剩余时间，可选
[ ] 支持取消任务
[ ] 支持失败后继续处理，可选
```

当前实现边界：

```text
主进程通过 process:batch-progress 向前端发送阶段事件。
前端只显示紧凑状态条，不做完整任务队列。
当前还没有逐帧实时进度，也没有取消任务。
后续若要支持取消，需要改 runCommand 子进程生命周期和 IPC 协议。
```

阶段回顾：

```text
目标是否完成：已完成 Phase 4C 收口。
实际完成：批处理状态条；阶段状态显示；输入 / Raw / 输出 / 失败数量显示；日志区保持纯日志；失败信息按输入为空、Raw 缓存不匹配、自动去背景失败、修边失败、数量不一致、未知失败转成人话提示；技术细节保留在失败详情日志里。
本次最后一步：只完成“失败信息人话化”，没有做取消任务、逐帧进度、完整任务队列、架构调整或无关重构。
验证命令：tsc --noEmit 通过；npm.cmd run build 通过；build-internal.ps1 提权后通过。
绿色包验证：rembg / onnxruntime / PIL / numpy import 通过。
.venv 检查：release/SequenceCutoutStudio-Internal/app/resources/portable-root/tools/rembg/.venv 不存在。
产物：release/SequenceCutoutStudio-Internal-v0.4.0-internal.1-win-x64.zip，约 553.83 MB。
稳定链路影响：不改变 portable Python / rembg_runner / postprocess 调用链路，不恢复 .venv，不调用 rembg.exe。
下个阶段唯一主目标：Phase 4D 导出系统。
```

---

# Phase 4D：导出系统

状态：已完成。

目标：让处理结果更方便进入游戏开发流程。

第一阶段导出：

```text
[x] 导出透明 PNG 序列
[x] 自动创建输出目录
[x] 输出目录命名规范
[x] 输出完成后打开文件夹
[x] 导出 manifest.json 清单
[x] 按规则批量重命名导出 PNG 序列
```

Phase 4D-1 阶段回顾：

```text
目标是否完成：已完成透明 PNG 序列导出第一版。
实际完成：从当前 Soft 输出目录导出 PNG；在 Soft 目录旁自动创建 exports 目录；自动生成 素材名_transparent_png_时间戳 目录；日志记录导出目录和 PNG 数量。
验证命令：tsc --noEmit 通过；npm.cmd run build 通过。
绿色包验证：本次未重新打包，不涉及 portable Python / rembg / postprocess 链路修改。
稳定链路影响：不改变 rembg_runner / postprocess 调用链路，不恢复 .venv，不调用 rembg.exe。
下个阶段唯一主目标：Phase 4D-2 导出 manifest.json 清单。
```

Phase 4D-2 阶段回顾：

```text
目标是否完成：已完成。
实际完成：透明 PNG 序列导出时同步生成 manifest.json；清单记录导出类型、导出时间、来源目录、导出目录、帧数量、首尾帧和逐帧文件名；前端日志显示导出清单路径。
本阶段边界：没有做 Sprite Sheet 拼图，没有做 TexturePacker 专用格式，没有做视频导出。
验证命令：tsc --noEmit 通过；npm.cmd run build 通过。
绿色包验证：本次未重新打包，不涉及 portable Python / rembg / postprocess 链路修改。
稳定链路影响：不改变 rembg_runner / postprocess 调用链路，不恢复 .venv，不调用 rembg.exe。
下个阶段唯一主目标：Phase 4D-3 按规则批量重命名导出 PNG 序列。
```

Phase 4D-3 阶段回顾：

```text
目标是否完成：已完成最小命名规则导出。
实际完成：导出透明 PNG 序列时可设置命名前缀、起始编号和补零位数；导出文件按规则重命名，例如 frame_0001.png；manifest.json 记录原始文件名和导出文件名映射；前端当前阶段显示更新为 Phase 4D。
本阶段边界：只做 PNG 序列重命名底座，没有做 Sprite Sheet 拼图，没有做 TexturePacker JSON，没有做 Cocos plist，没有做引擎专用目录。
验证命令：tsc --noEmit 通过；npm.cmd run build 通过。
绿色包验证：本次未重新打包，不涉及 portable Python / rembg / postprocess 链路修改。
稳定链路影响：不改变 rembg_runner / postprocess 调用链路，不恢复 .venv，不调用 rembg.exe。
下个阶段唯一主目标：Phase 4D 暂停高级导出扩展，正式版后再做 Sprite Sheet / Cocos plist / TexturePacker 兼容格式。
```

导出目录规则：

```text
导出 PNG 序列不再弹出 Windows 原生目录选择框。
原因：packaged 环境下，在原生目录选择框中新建文件夹并立即选择，可能导致应用崩溃。
当前策略：软件自动在 Soft 目录旁创建 exports/素材名_transparent_png_时间戳。
```

Phase 4D 最终收口：

```text
目标是否完成：已完成。
实际完成：透明 PNG 序列导出；自动创建 exports 导出目录；命名前缀 / 起始编号 / 补零位数；manifest.json 记录导出映射；规避 Windows 原生目录选择框新建文件夹闪崩。
最终边界：正式版前不继续扩展 Sprite Sheet / TexturePacker JSON / Cocos plist / Unity 目录；这些作为正式版后的高级导出迭代。
验证命令：tsc --noEmit 通过；npm.cmd run build 通过；build-internal.ps1 通过。
绿色包验证：rembg / onnxruntime / PIL / numpy import 通过。
.venv 检查：release/SequenceCutoutStudio-Internal/app/resources/portable-root/tools/rembg/.venv 不存在。
产物：release/SequenceCutoutStudio-Internal-v0.4.0-internal.1-win-x64.zip，约 553.83 MB。
稳定链路影响：不改变 portable Python / rembg_runner / postprocess 调用链路，不恢复 .venv，不调用 rembg.exe。
下个阶段唯一主目标：Phase 4E 缓存系统。
```

后续可扩展导出：

```text
[ ] 导出命名模板扩展
[ ] Sprite Sheet
[ ] TexturePacker 友好格式
[ ] WebM alpha
[ ] MOV ProRes 4444
[ ] GIF / APNG
[ ] Cocos 可用资源目录
[ ] Unity 可用资源目录
```

---

# Phase 4E：缓存系统

状态：已完成。

目标：减少重复处理，提高处理效率。

缓存思路：

```text
source + model + params -> cache key
```

需要完成：

```text
[x] 缓存状态识别
[x] 缓存状态提示
[x] 原始素材 hash
[x] 参数 hash
[x] Raw 缓存管理规则
[x] Soft 缓存管理规则
[x] 缓存命中提示
[ ] 清理缓存功能（正式版后评估）
[x] 缓存占用大小显示
```

Phase 4E-1 建议目标：

```text
只做缓存状态识别与提示，不改变处理链路。
目标：识别当前输入目录旁是否已有可用 Raw 缓存和 Soft 输出，并在界面/日志里清楚提示。
不做：自动跳过处理、不做缓存清理、不做 hash 命中、不改 rembg / postprocess 调用链路。
验收：tsc --noEmit；npm.cmd run build。
```

Phase 4E-1 阶段回顾：

```text
目标是否完成：已完成。
实际完成：扫描序列帧或切换 preset 后，只读检查当前输入目录旁的 Raw 缓存和 Soft 输出；日志提示 Raw 缓存是否可用、Soft 输出是否完整。
本阶段边界：没有自动跳过处理，没有做缓存清理，没有做 hash 命中，没有改 rembg / postprocess 调用链路。
验证命令：tsc --noEmit 通过；npm.cmd run build 通过。
绿色包验证：本次未重新打包，不涉及 portable Python / rembg / postprocess 链路修改。
稳定链路影响：不改变 portable Python / rembg_runner / postprocess 调用链路，不恢复 .venv，不调用 rembg.exe。
下个阶段唯一主目标：Phase 4E-2 原始素材 hash 与参数 hash 设计，不先接入自动命中。
```

Phase 4E-2 阶段回顾：

```text
目标是否完成：已完成 hash 底座。
实际完成：缓存状态检查时计算 sourceHash、paramsHash 和 cacheKey；sourceHash 基于输入 PNG 文件名、文件大小、修改时间和数量；paramsHash 基于 preset、AlphaLow、Shrink 和模型名。
本阶段边界：没有自动缓存命中，没有跳过 rembg / postprocess，没有清理缓存，没有改变处理链路；缓存状态只通过日志提示，不在左侧栏新增卡片。
验证命令：tsc --noEmit 通过；npm.cmd run build 通过。
绿色包验证：本次未重新打包，不涉及 portable Python / rembg / postprocess 链路修改。
稳定链路影响：不改变 portable Python / rembg_runner / postprocess 调用链路，不恢复 .venv，不调用 rembg.exe。
下个阶段唯一主目标：Phase 4E-3 缓存命中提示设计，只提示不自动跳过。
```

Phase 4E-3 阶段回顾：

```text
目标是否完成：已完成。
实际完成：缓存状态检查返回 cacheHitStatus 和 cacheHitMessage；日志提示完整缓存、仅 Raw 可用、仅 Soft 可用或无可复用缓存；提示用户可预览、导出或手动只重跑边缘。
本阶段边界：没有自动跳过批量处理，没有自动只重跑边缘，没有清理缓存，没有改变 rembg / postprocess 调用链路。
验证命令：tsc --noEmit 通过；npm.cmd run build 通过。
绿色包验证：本次未重新打包，不涉及 portable Python / rembg / postprocess 链路修改。
稳定链路影响：不改变 portable Python / rembg_runner / postprocess 调用链路，不恢复 .venv，不调用 rembg.exe。
下个阶段唯一主目标：Phase 4E-4 Raw / Soft 缓存管理方案设计，先不做清理功能。
```

Phase 4E-4 阶段回顾：

```text
目标是否完成：已完成缓存管理规则底座。
实际完成：缓存状态检查返回 cacheManagement；Raw / Soft 分别标记 dir、manageable、reason；明确 cleanupAllowed=false 和 cleanupReason，禁止当前阶段清理缓存。
Raw 管理规则：仅识别当前输入目录旁的 素材名_general_raw；目录存在且有 PNG 时可作为后续缓存管理对象；manifest 不匹配只代表不能复用，不代表可以自动删除。
Soft 管理规则：仅识别当前输入目录旁的 素材名_soft_当前Preset；目录存在且有 PNG 时可作为后续缓存管理对象；数量不完整只提示，不自动删除。
绝不清理：用户选择的输入目录、原始视频、portable-root/tools、release、exports、非当前命名规则目录。
本阶段边界：没有增加清理按钮，没有删除文件，没有自动缓存命中，没有改变 rembg / postprocess 调用链路。
验证命令：tsc --noEmit 通过；npm.cmd run build 通过。
绿色包验证：本次未重新打包，不涉及 portable Python / rembg / postprocess 链路修改。
稳定链路影响：不改变 portable Python / rembg_runner / postprocess 调用链路，不恢复 .venv，不调用 rembg.exe。
下个阶段唯一主目标：Phase 4E-5 缓存占用大小显示，只读统计，不清理。
```

Phase 4E-5 阶段回顾：

```text
目标是否完成：已完成。
实际完成：缓存状态检查返回 rawBytes、softBytes、totalBytes 及 Raw / Soft / 合计的人话大小；扫描、切换 preset、批处理完成后的日志显示缓存占用。
本阶段边界：只读统计 PNG 文件大小；没有清理按钮，没有删除文件，没有自动缓存命中，没有改变 rembg / postprocess 调用链路。
验证命令：tsc --noEmit 通过；npm.cmd run build 通过。
绿色包验证：本次未重新打包，不涉及 portable Python / rembg / postprocess 链路修改。
稳定链路影响：不改变 portable Python / rembg_runner / postprocess 调用链路，不恢复 .venv，不调用 rembg.exe。
下个阶段唯一主目标：Phase 4E 收口评估，决定是否后置清理缓存功能。
```

Phase 4E 最终收口：

```text
目标是否完成：已完成当前内测阶段需要的缓存只读识别与提示。
实际完成：Raw / Soft 状态识别；缓存状态日志提示；sourceHash、paramsHash 和 cacheKey 底座；cacheHitStatus / cacheHitMessage；cacheManagement 只读管理规则；缓存占用大小统计。
最终边界：清理缓存功能后置到正式版后评估；不做删除、不做自动跳过、不做自动复用、不改变处理链路。
验证命令：tsc --noEmit 通过；npm.cmd run build 通过。
绿色包验证：本阶段未重新打包，不涉及 portable Python / rembg / postprocess 链路修改。
稳定链路影响：不改变 portable Python / rembg_runner / postprocess 调用链路，不恢复 .venv，不调用 rembg.exe。
下个阶段唯一主目标：Phase 4F-1 参数命名与预设文案优化，只改用户可见命名，不改算法参数。
```

---

# Phase 4F：处理效果增强

状态：进行中，Phase 4F-3 已完成。

目标：提升输出质量，让边缘更干净、更稳定，更适合游戏资源使用。

可优化方向：

```text
[ ] 更细的边缘参数
[ ] 去白边 / 去黑边
[ ] 边缘颜色修正
[ ] 半透明区域优化
[ ] 毛发 / 尾巴 / 细节边缘优化
[ ] 帧间闪动检查
[ ] 同一序列帧参数一致性优化
```

参数命名优化方向：

```text
C：柔和边缘
F：标准边缘
I：干净收边
Custom：自定义
```

Phase 4F-1 建议目标：

```text
只做参数命名与预设文案优化，不改变处理算法。
目标：把 C / F / I 的用户可见文案统一为柔和边缘、标准边缘、干净收边；让日志、按钮附近说明和 preset 显示更适合美术用户理解。
不做：不改 alphaLow / shrink 默认值，不改 postprocess 脚本，不改 rembg / portable Python / launcher / 打包链路。
验收：tsc --noEmit；npm.cmd run build。
```

Phase 4F-1 阶段回顾：

```text
目标是否完成：已完成。
实际完成：预设按钮显示 C / F / I 代号和柔和边缘、标准边缘、干净收边的人话名称；Custom 显示为自定义；单帧测试、批量处理、读取参数、对比生成和应用对比参数的日志统一显示边缘阈值 / 收边力度。
本阶段边界：只改用户可见命名和文案；不改 alphaLow / shrink 默认值；不改 postprocess 脚本；不改 rembg / portable Python / launcher / 打包链路；不改变 soft_C / soft_F / soft_I 目录命名。
验证命令：tsc --noEmit 通过；npm.cmd run build 通过。
绿色包验证：本次未重新打包，不涉及 portable Python / rembg / postprocess 链路修改。
稳定链路影响：不改变 portable Python / rembg_runner / postprocess 调用链路，不恢复 .venv，不调用 rembg.exe。
下个阶段唯一主目标：Phase 4F-2 处理效果增强方案拆分，先决定是否从去白边 / 去黑边或边缘颜色修正开始，不直接改算法。
```

Phase 4F-2 方案拆分：

```text
只做方案拆分与下一步选择，不直接改处理算法。

当前 postprocess 现状：
1. alphaLow 负责低透明区域置零。
2. shrink 负责轻微腐蚀收边。
3. 脚本会从原图四角估算背景色，并尝试对半透明边缘做去底色。

效果增强拆分：
1. 源码落点：把 postprocess 脚本源码纳入 runtime-tools/postprocess，后续从源码同步到 portable-root，避免只改本地运行时。
2. 边缘颜色修正：优先处理白边 / 黑边 / 背景色污染，目标是改善半透明边缘颜色，不先增加复杂 UI。
3. 去白边 / 去黑边：作为边缘颜色修正的可选策略或 preset 内部策略，不单独先做独立主流程。
4. 更细参数：后置，等默认效果稳定后再决定是否暴露给用户。
5. 帧间一致性：后置，需要先有稳定单帧效果和样例对比。

本阶段结论：
下一步不直接改算法，先做 Phase 4F-3：postprocess 源码落点与构建同步检查。
随后再做 Phase 4F-4：边缘颜色修正的最小可回退实现。
```

Phase 4F-2 阶段回顾：

```text
目标是否完成：已完成。
实际完成：确认处理效果增强优先级；选择先补 postprocess 源码落点，再做边缘颜色修正；将去白边 / 去黑边纳入边缘颜色修正策略，而不是先做独立 UI 功能。
本阶段边界：只更新阶段计划；不改 postprocess 脚本；不改 rembg / portable Python / launcher / 打包链路；不改变 C / F / I 参数值。
验证命令：未运行，文档规划变更不涉及编译产物。
绿色包验证：本次未重新打包，不涉及 portable Python / rembg / postprocess 链路修改。
稳定链路影响：不改变 portable Python / rembg_runner / postprocess 调用链路，不恢复 .venv，不调用 rembg.exe。
下个阶段唯一主目标：Phase 4F-3 postprocess 源码落点与构建同步检查，不改算法效果。
```

Phase 4F-3 阶段回顾：

```text
目标是否完成：已完成。
实际完成：新增 runtime-tools/postprocess/batch_clean_cutout_soft.py 作为可追踪 postprocess 源码；build-internal.ps1 打包前同步 runtime-tools/rembg_runner.py 和 runtime-tools/postprocess/batch_clean_cutout_soft.py 到 portable-root/tools；最终包必需文件检查新增 tools/postprocess/batch_clean_cutout_soft.py；BUILD-INTERNAL.md 和 PORTABLE-RUNTIME.md 记录源码落点与同步规则。
本阶段边界：只建立源码落点和构建同步；不改 postprocess 算法效果；不改 rembg / portable Python / launcher 运行链路；不恢复 .venv；不改变 C / F / I 参数值。
验证命令：tsc --noEmit 通过；npm.cmd run build 通过；build-internal.ps1 通过；Python import rembg / onnxruntime / PIL,numpy 通过；最终包无 tools/rembg/.venv；zip 大小已记录。
绿色包验证：本阶段重新打包用于验证构建同步，不做手工完整业务流验收。
稳定链路影响：仍通过 tools/python/python.exe 调用 tools/rembg_runner.py 和 tools/postprocess/batch_clean_cutout_soft.py，不调用 rembg.exe。
下个阶段唯一主目标：Phase 4F-4 边缘颜色修正的最小可回退实现。
```

---

# Phase 5：正式发布包装

状态：远期阶段。

建议路线：

```text
内测阶段：绿色 zip + launcher
稳定后：考虑 Setup 安装包
不建议：继续使用单文件 portable exe 作为主发布形式
```

原因：当前项目包含 Python、模型、FFmpeg 和大量运行时文件，单文件 exe 对启动体验、排查问题和后续维护都不友好。

---

## 4. 推荐近期执行计划

### 最近一个小版本：0.4.0-internal.1

```text
[x] 提交当前稳定基线
[x] 补 docs/BUILD-INTERNAL.md
[x] 补 docs/PORTABLE-RUNTIME.md
[x] package.json version 改为 0.4.0-internal.1
[x] build-internal.ps1 使用 version 生成 zip 名
[x] 软件界面显示版本号
[x] 重新打包并验证 Python import
```

目标：形成第一个有版本号、可追踪、可复现的内部绿色包。

### 下一个小版本：0.4.0-internal.2

```text
[x] 启动阶段状态文件
[x] launcher 显示真实启动状态
[x] 启动失败 / 超时提示
[x] 启动自检升级为真实运行检查
```

目标：减少测试人员反馈里的“打不开”“卡住了”“没反应”这类模糊问题。

### 再下一个阶段

```text
[ ] Project System
[ ] 最近工程
[ ] 工程内参数保存
[ ] 工程内输出记录
```

目标：正式进入长期可用的素材处理工作流。

---

## 5. 当前不可破坏的稳定链路

后续任何开发都不能破坏这条链路：

```text
Electron main.ts
↓
tools/python/python.exe
↓
tools/rembg_runner.py
↓
tools/Lib/site-packages/rembg
↓
Raw 输出
↓
postprocess
↓
Soft 输出
```

禁止恢复或依赖：

```text
tools/rembg/.venv
.venv/Scripts/python.exe
.venv/Scripts/rembg.exe
rembg.exe
python -m rembg
```

涉及绿色包、运行时、rembg、Python、postprocess、打包的修改，必须额外验证：

```powershell
.\release\SequenceCutoutStudio-Internal\app\resources\portable-root\tools\python\python.exe -c "import rembg; print('rembg ok')"
.\release\SequenceCutoutStudio-Internal\app\resources\portable-root\tools\python\python.exe -c "import onnxruntime; print('onnxruntime ok')"
.\release\SequenceCutoutStudio-Internal\app\resources\portable-root\tools\python\python.exe -c "import PIL, numpy; print('postprocess deps ok')"
```

---

## 6. 当前结论

当前项目已经完成：

```text
第一版内测绿色包交付
干净电脑验收
新 icon 修复
自动化构建基础闭环
portable Python 运行时验证
```

下一步不应该继续围绕“能不能打出包”打转。

推荐路线：

```text
进入任务队列、导出和缓存
```
