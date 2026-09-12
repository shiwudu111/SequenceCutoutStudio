# Sequence Cutout Studio 后续迭代基线

版本定位：第一版内测绿色包已通过，进入发布流程固化与下一轮功能开发准备

当前阶段：序列查看功能增强已完成开发验证，待用户复核与新候选包验收

基线日期：2026-05-28；反馈回顾更新：2026-09-09

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
Phase 4F：处理效果增强                     已完成
Phase 5：正式发布包装                      已完成
Phase 6A：去背景质量评估                    已完成
Phase 6B：固定 UI 布局与功能承载边界          已完成
Phase 6C：序列质量验收与问题帧检测             已完成
Phase 6D：Raw / Soft 预览验收视图强化          已完成
Phase 6E：模型与预设优化验证                  已完成
Phase 6F：正式发布稳定性补强                  已完成
Phase 6G：正式上线文档与发布物料              已完成
Phase 6H：正式包构建与上线验收                准备开始
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
[x] 构建后刷新 shell icon cache，并执行 ie4uinit.exe -ClearIconCache / -show；如资源管理器仍显示旧图，重启 Explorer
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

状态：已完成。

目标：提升输出质量，让边缘更干净、更稳定，更适合游戏资源使用。

可优化方向：

```text
[ ] 更细的边缘参数
[ ] 去白边 / 去黑边
[x] 边缘颜色修正
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

Phase 4F-4 阶段回顾：

```text
目标是否完成：已完成。
实际完成：postprocess 新增 repair_edge_color，在原有去底色之后只修正半透明边缘颜色；从附近实心前景像素取色并按透明度轻量混合，降低白边 / 黑边 / 背景色污染；新增 edgeColorFix、edgeColorFixStrength、edgeColorFixedPixels 日志字段。
回退方式：新增 --disable-edge-color-fix 可关闭边缘颜色修正；新增 --edge-color-fix-strength 可调整强度，默认 0.35。
本阶段边界：不加 UI；不改 C / F / I 的 alphaLow / shrink 参数值；不改 rembg / portable Python / launcher 运行链路；不恢复 .venv；不改变输出目录命名。
验证命令：py_compile 通过；合成 PNG 小样例通过；tsc --noEmit 通过；npm.cmd run build 通过；build-internal.ps1 通过；Python import rembg / onnxruntime / PIL,numpy 通过；最终包无 tools/rembg/.venv；zip 大小已记录。
绿色包验证：本阶段重新打包用于验证 postprocess 同步和运行时依赖，不做手工完整业务流验收。
稳定链路影响：仍通过 tools/python/python.exe 调用 tools/rembg_runner.py 和 tools/postprocess/batch_clean_cutout_soft.py，不调用 rembg.exe。
下个阶段唯一主目标：Phase 4F-5 用真实样例做边缘修正验收，决定是否保留默认强度 0.35。
```

Phase 4F-5 阶段回顾：

```text
目标是否完成：已完成。
实际完成：使用 portable-root/samples/sample_frames 的 16 张真实样例生成 Raw，并分别输出默认边缘颜色修正 soft_fix 与关闭修正 soft_off；生成 edge_fix_metrics.json 和 edge_fix_contact_sheet.jpg 作为对比记录。
验收结论：保留默认 edgeColorFixStrength=0.35。
关键指标：edgeColorFixedPixels=166058；alphaChangedPixels=0；rgbChangedPixels=162508；semiTransparentRgbChangedPixels=162508；opaqueRgbChangedPixels=0；transparentRgbChangedPixels=0；meanRgbDeltaOnChangedPixels=63.05。
判断：修正只影响半透明边缘 RGB，不改变 alpha，不影响全透明区和完全不透明区，符合本阶段“只修边缘颜色污染”的边界。
验证产物：release/phase-4f-5-real-sample/raw；release/phase-4f-5-real-sample/soft_fix；release/phase-4f-5-real-sample/soft_off；release/phase-4f-5-real-sample/edge_fix_metrics.json；release/phase-4f-5-real-sample/edge_fix_contact_sheet.jpg。
本阶段边界：只做真实样例验收和文档记录；不改算法；不加 UI；不改 rembg / portable Python / launcher 运行链路；不恢复 .venv。
验证命令：rembg_runner batch 16 帧通过；postprocess 默认修正通过；postprocess --disable-edge-color-fix 通过；指标脚本通过；对比图生成通过。
绿色包验证：使用 release 内 portable Python 与 postprocess 运行样例验证；本阶段未重新打包。
稳定链路影响：不改变 portable Python / rembg_runner / postprocess 调用链路，不调用 rembg.exe。
下个阶段唯一主目标：Phase 4F-6 绿色包完整业务流验收，确认边缘颜色修正在软件主流程中可用。
```

Phase 4F-6 阶段回顾：

```text
目标是否完成：已完成。
实际完成：使用绿色包 release/SequenceCutoutStudio-Internal 内的 ffmpeg、portable Python、rembg_runner.py 和 postprocess 脚本跑通命令级主流程：sample_video.mp4 → frames → raw → soft_I。
验收产物：release/phase-4f-6-green-flow/frames；release/phase-4f-6-green-flow/raw；release/phase-4f-6-green-flow/soft_I；release/phase-4f-6-green-flow/postprocess.json。
关键结果：视频切帧 16 张；Raw 输出 16 张；Soft 输出 16 张；尺寸均为 960x720；Raw / Soft 均带 alpha；postprocess processed=16、skipped=0、errors=[]、edgeColorFix=true、edgeColorFixStrength=0.35、edgeColorFixedPixels=166058。
验证命令：绿色包 ffmpeg 切帧通过；绿色包 rembg_runner batch 通过；绿色包 postprocess 通过；Python import rembg / onnxruntime / PIL,numpy 通过；最终包无 tools/rembg/.venv；zip 大小 553.83 MB。
本阶段边界：命令级绿色包主链路验收通过；未做 GUI 手工点击验收；未改算法；未改 UI；未改 rembg / portable Python / launcher 运行链路。
稳定链路影响：确认仍通过 tools/python/python.exe 调用 tools/rembg_runner.py 和 tools/postprocess/batch_clean_cutout_soft.py，不调用 rembg.exe。
下个阶段唯一主目标：Phase 4F 收口评估，决定是否继续处理效果增强或转入 Phase 5 正式发布包装。
```

Phase 4F 最终收口：

```text
目标是否完成：已完成当前内测阶段需要的处理效果增强。
实际完成：C / F / I / Custom 用户可见命名优化；postprocess 源码纳入 runtime-tools 并由 build-internal.ps1 同步；新增可回退边缘颜色修正；真实样例确认默认 edgeColorFixStrength=0.35；绿色包命令级主链路 sample_video.mp4 → frames → raw → soft_I 验收通过。
最终边界：不继续扩算法；不新增 UI 参数；不做毛发 / 尾巴专门优化；不做帧间一致性算法；不改 C / F / I 的 alphaLow / shrink 参数值；不改 rembg / portable Python / launcher 运行链路。
验证汇总：tsc --noEmit 通过；npm.cmd run build 通过；build-internal.ps1 通过；Python import rembg / onnxruntime / PIL,numpy 通过；真实样例 16 帧对比通过；绿色包命令级主链路通过；最终包无 tools/rembg/.venv；zip 大小 553.83 MB。
稳定链路影响：仍通过 tools/python/python.exe 调用 tools/rembg_runner.py 和 tools/postprocess/batch_clean_cutout_soft.py；不调用 rembg.exe；不恢复 .venv。
后置内容：更细边缘参数、半透明区域高级优化、毛发 / 尾巴细节边缘优化、帧间闪动检查、同一序列帧参数一致性优化，放到正式版发布后的效果专项迭代。
收口判断：Phase 4F 可以收口；下一阶段转入 Phase 5 正式发布包装。
下个阶段唯一主目标：Phase 5-1 发布前版本与产物核对，先确认版本号、zip、launcher、portable runtime、文档和发布清单，不新增功能。
```

---

# Phase 5：正式发布包装

状态：已完成。

建议路线：

```text
内测阶段：绿色 zip + launcher
稳定后：考虑 Setup 安装包
不建议：继续使用单文件 portable exe 作为主发布形式
```

原因：当前项目包含 Python、模型、FFmpeg 和大量运行时文件，单文件 exe 对启动体验、排查问题和后续维护都不友好。

Phase 5-1 阶段回顾：

```text
目标是否完成：已完成发布前版本与产物核对。
实际完成：确认 package.json version=0.4.0-internal.1；确认绿色包目录结构为顶层 launcher + app；确认 release zip 已重新生成；确认 launcher、Electron exe、portable Python、rembg_runner.py、postprocess、模型、FFmpeg、pyvenv.cfg 均存在；确认 build/splash.png 作为启动图源图、build/splash.bmp 作为 launcher 嵌入资源；确认 splash.bmp 已由新源图生成并重新打包。
关键产物：release/SequenceCutoutStudio-Internal-v0.4.0-internal.1-win-x64.zip，552.75 MB。
验证命令：build-internal.ps1 通过；npm.cmd run build 在脚本内通过；Python import rembg / onnxruntime / PIL,numpy 在脚本内通过；最终包无 tools/rembg/.venv 和 tools/rembg。
本阶段边界：只做发布前核对、启动图资源入库和文档记录；不新增功能；不改 rembg / portable Python / postprocess / launcher 逻辑。
阻塞处理：首次打包因旧 SequenceCutoutStudio 进程占用 app.asar 失败；关闭占用进程后重跑通过。
下个阶段唯一主目标：Phase 5-2 发布清单与内测交付说明，明确给测试者的 zip、启动方式、验收流程和已知边界。
```

Phase 5-2 阶段回顾：

```text
目标是否完成：已完成。
实际完成：新增 docs/INTERNAL-RELEASE.md，明确内测交付 zip、启动方式、推荐验收流程、重点观察项、已知边界和反馈方式；修复 docs/INTERNAL-FEEDBACK.md 乱码，改为可直接复制给测试者的中文反馈模板。
关键交付文件：release/SequenceCutoutStudio-Internal-v0.4.0-internal.1-win-x64.zip，约 552.75 MB。
本阶段边界：只做发布清单、内测交付说明和反馈模板；不新增功能；不改代码；不改构建脚本；不重新打包。
验证命令：未运行，文档变更不涉及编译产物；沿用 Phase 5-1 的 build-internal.ps1、Python import 和 zip 核对结果。
下个阶段唯一主目标：Phase 5-3 GUI 启动与冒烟验收，手工确认新启动图、主界面打开、自检、核心按钮路径。
```

Phase 5-3 阶段回顾：

```text
目标是否完成：已完成 GUI 启动与冒烟验收。
实际完成：从 release/SequenceCutoutStudio-Internal/SequenceCutoutStudio-Internal.exe 启动绿色包；主界面正常打开；版本显示 v0.4.0-internal.1；左侧当前阶段显示 Phase 5；环境自检 12/12 项通过；输入素材区、预览区、视频切帧参数、关键帧/播放控制等核心首屏路径可见。
发现并修复：GUI 冒烟时发现左侧当前阶段仍显示 Phase 4E，已修正为 Phase 5，并重新运行 tsc、npm build 和 build-internal.ps1。
验证产物：release/phase-5-3-gui-smoke/main-screen.png；release/phase-5-3-gui-smoke/splash-screen.png。
启动图说明：绿色包从顶层 launcher 启动成功；本机启动较快，截图时已进入主界面，未单独捕获到停留状态的 splash 画面。
验证命令：tsc --noEmit 通过；npm.cmd run build 通过；build-internal.ps1 通过；Python import rembg / onnxruntime / PIL,numpy 在脚本内通过；最终 zip 大小 552.75 MB。
本阶段边界：只修正发布阶段显示文案并做 GUI 冒烟；不新增功能；不改 rembg / portable Python / postprocess / launcher 逻辑。
下个阶段唯一主目标：Phase 5-4 最终发布前清点与收口，确认是否可以交付当前 zip 给内测用户。
```

Phase 5-4 最终收口：

```text
目标是否完成：已完成。
交付判断：当前 0.4.0-internal.1 绿色包可以交付内测用户。
交付文件：release/SequenceCutoutStudio-Internal-v0.4.0-internal.1-win-x64.zip。
zip 大小：552.75 MB。
交付形态：绿色 zip + 顶层 SequenceCutoutStudio-Internal.exe + app/ 目录。
启动方式：测试者解压 zip 后双击顶层 SequenceCutoutStudio-Internal.exe，不直接运行 app/SequenceCutoutStudio.exe。
最终核对：launcher 存在；Electron exe 存在；portable Python 存在；rembg_runner.py 存在；postprocess 脚本存在；模型存在；FFmpeg 存在；pyvenv.cfg 存在；无 tools/rembg/.venv；无 tools/rembg。
验证汇总：build-internal.ps1 通过；GUI 冒烟通过；Python import rembg / onnxruntime / PIL,numpy 通过；环境自检 12/12 项通过；绿色包命令级主链路通过。
交付文档：docs/INTERNAL-RELEASE.md；docs/INTERNAL-FEEDBACK.md；docs/BUILD-INTERNAL.md；docs/PORTABLE-RUNTIME.md。
已知边界：不含安装器、自动更新、账号系统、云端处理、任务队列取消、完整缓存清理、Sprite Sheet / plist / TexturePacker 导出。
收口判断：Phase 5 可以收口；下一步进入内测发包与反馈跟踪，不再在 0.4.0-internal.1 上新增功能。
下个阶段唯一主目标：内测反馈跟踪，按反馈决定 0.4.0-internal.2 的修复项。
```

---

# Phase 6A：去背景质量评估

状态：第一轮真实测试已完成，等待优化方向决策。

目标：先建立不同背景下的去背景质量测试报告，再讨论核心功能优化方向。本阶段不直接改 rembg、postprocess、portable Python、launcher 或导出链路。

本阶段边界：

```text
[x] 建立质量测试报告结构
[x] 明确不同背景测试分类
[x] 明确 A / B / C / D 评级规则
[x] 用现有真实样例输出建立初始基线
[x] 补齐不同背景测试素材
[x] 跑完整 Raw / Soft 结果
[x] 输出第一版真实质量结论
```

当前已完成：

```text
新增 docs/BACKGROUND-REMOVAL-QUALITY-REPORT.md。
记录现有 release/phase-4f-5-real-sample 的 16 帧 Raw / Soft 指标。
确认当前样本帧数一致、尺寸一致、alpha 覆盖率波动较小。
明确当前样本不能代表不同背景，不足以决定算法优化方向。
补充 2026-06-12 第一轮真实测试结果：E:\cuts\test 中 14 组样本，每组 48 帧，均完成输入帧、Raw、Soft I 输出。
评级分布：A / A- 3 组；B / B- 6 组；C / C- 4 组；D / D- 1 组。
核心结论：纯色 / 简单背景 / 部分动作序列表现较好；复杂背景、低对比、毛发、透明布料和半透明发光仍是短板。
```

验证命令：

```text
使用 portable Python + PIL 只读统计 release/phase-4f-5-real-sample 的 PNG alpha 指标。
使用 portable Python + PIL 只读统计 E:\cuts\test 中 14 组测试结果的 PNG 数量、尺寸、非透明占比和 alpha 范围。
本阶段只改文档，不涉及 TypeScript / Electron / Python 运行链路，未运行 tsc / npm build。
```

正式上线前路线图：docs/FORMAL-LAUNCH-ROADMAP.md。
下个阶段唯一主目标：Phase 6B 固定 UI 布局与功能承载边界。后续增加功能不再增加新的主流程窗口，新的面板只在对应面板内扩展。

---

# 正式上线路线图

状态：已记录。

路线图文件：

```text
docs/FORMAL-LAUNCH-ROADMAP.md
```

正式上线前阶段顺序：

```text
Phase 6B：固定 UI 布局与功能承载边界
Phase 6C：序列质量验收与问题帧检测
Phase 6D：Raw / Soft 预览验收视图强化
Phase 6E：模型与预设优化验证
Phase 6F：正式发布稳定性补强
Phase 6G：正式上线文档与发布物料
Phase 6H：正式包构建与上线验收
```

防目标漂移规则：

```text
每个阶段只能有一个唯一主目标。
开始前必须明确本阶段做什么、不做什么、验收命令是什么。
完成后必须更新 docs/ITERATION_BASELINE.md。
UI 后续不新增主流程窗口；新增功能只进入对应面板。
涉及绿色包、运行时、rembg、Python、postprocess、打包的修改，必须重新验证构建和 Python import。
```

---

# Phase 6B：固定 UI 布局与功能承载边界

状态：已完成。

目标：冻结主界面结构，后续功能只进入对应面板，不再新增主流程窗口。

实际完成：

```text
[x] 新增 docs/UI-LAYOUT-RULES.md
[x] 固定输入素材、处理参数、导出设置、预览检查、质量验收、处理日志六个主工作区面板
[x] 将导出命名和导出 PNG 序列从处理参数面板拆到导出设置面板
[x] 新增质量验收面板作为 Phase 6C 问题帧检测、数量一致性、alpha 波动的唯一承载区
[x] CSS 从 nth-child 布局归属改为显式 input-panel / process-panel / export-panel / quality-panel / preview-panel / log-panel
[x] 明确后续 Sprite Sheet、TexturePacker JSON、Cocos plist 只进入导出设置高级区
[x] 明确后续问题帧、序列稳定性和验收报告只进入质量验收面板
[x] 根据人工验收反馈，将左侧 1-5 步骤改为真实流程导航
[x] 点击流程导航后自动滚动到对应区域，并显示蓝色高亮
[x] 宽屏三栏改为：左栏输入，中栏处理 / 导出 / 质量验收，右栏预览 / 日志
[x] 双栏布局改为预览优先，日志在右栏预览下方露出明确面积
[x] 单栏布局改为输入、预览、处理、导出、质量验收、日志
[x] 日志保留完整日志流，并在第一屏露出明确可读面积
[x] 压缩输入区、切帧区和处理参数区的纵向空间
[x] 固定三栏断点：宽度 1336px 及以上保持三栏，1335px 及以下才允许进入双栏
[x] 三栏状态人工验收冻结：后续二栏 / 单栏优化不得改动三栏断点、面板顺序、预览区高度策略
[x] 二栏状态人工验收冻结：右栏保持预览检查在上、处理参数紧接其下；左栏输入素材保持三栏输入方案
[x] 单栏状态人工验收冻结：顺序为输入、预览、处理、导出、质量验收、日志；预览采用 4:3，更克制地使用纵向空间
```

本阶段边界：

```text
不实现问题帧检测。
不实现 alpha 波动算法。
不接入新模型。
不改 rembg / postprocess / portable Python 链路。
不新增主流程窗口。
不重新打绿色包。
```

验证命令：

```text
[x] .\node_modules\.bin\tsc.cmd --noEmit 通过。
[x] npm.cmd run build 通过。
```

验证说明：

```text
旧版 Phase 6B 已经由 GUI 人工验收判定为不能收口。
主要问题：预览优先级不足、中栏空间浪费、日志被压缩、左侧 1-5 步骤像按钮但没有真实功能。
本次修正后，三栏、二栏、单栏状态均已按人工反馈冻结；剩余视觉小问题不再继续打磨。
后续功能扩展不得回改三栏 / 二栏 / 单栏布局承载边界。
```

稳定链路影响：

```text
不影响 launcher。
不影响 portable Python。
不影响 rembg_runner。
不影响 postprocess。
不影响导出后端逻辑。
```

下个阶段唯一主目标：Phase 6D Raw / Soft 预览验收视图强化。

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

## 5.1 Phase 6C 当前修正记录

2026-06-15 修正质量验收最低标准：

```text
问题：E:\cuts\test\10发光法术_12fps_4s_soft_I 第 25-30 帧存在局部身体区域被当作背景抠掉，但初版质量验收只看全局 alpha 覆盖和相邻帧总面积波动，结果误判为“质量验收通过”。

结论：只看 alphaCoverage / maxAlphaJump 不满足最低验收标准。

修正：质量验收增加 8x8 局部 alpha 分布检测，记录 maxLocalAlphaDelta；只要发现局部主体缺失风险或局部 alpha 突变，就标记为疑似问题帧，报告不再显示为通过。

追加修正：有 Raw 输出时，优先做同一帧 Raw → Soft 局部收缩检测，记录 maxRawSoftShrink；相对首帧检测只作为缺少 Raw 时的兜底，避免快速运动素材因为主体真实位移被大量误报。

样本校准：04 简单背景 0 个疑似问题；10 发光法术不再误判通过，严重帧排序覆盖 sample_0024 - sample_0031 区间；13 快速运动能标出疑似闪烁 / 局部收缩帧。

界面边界：质量验收主界面只展示“有没有问题、输出帧数、疑似问题数量、问题帧入口”；alpha 覆盖、局部变化、Raw 收缩等技术指标只保留在内部报告和后续详情，不占主流程界面。

验证：tsc 通过；npm build 通过；build-internal.ps1 通过；portable Python import rembg / onnxruntime / PIL + numpy 通过；zip 大小 552.75 MB。最新打包时间：2026-06-15 11:47。

待复核：绿色包 GUI 中用 10发光法术跑批处理，确认点击疑似问题帧能切到对应帧并滚动到预览检查面板。

边界：该检测用于最低验收和人工复核提示，不承诺自动判断所有复杂运动是否真实错误；后续若误报过多，再在 Phase 6D / 6E 单独优化。
```

---

## 5.2 Phase 6D 当前推进记录

2026-06-15 Phase 6D-1 预览状态强化：

```text
目标：不重做预览架构，先让用户清楚知道当前看的是哪一类结果，以及 Raw / Soft / 对比是否已经可用。

完成：预览检查区增加轻量状态条，显示当前帧、当前视图、背景模式、Raw / Soft 就绪状态；Raw / Soft / 对比未生成时禁用对应标签；从质量验收问题帧跳转时优先切到 Soft 视图复核输出结果。

验证：tsc 通过；npm build 通过。

边界：未调整三栏 / 二栏 / 单栏冻结布局；未重做背景控件；未优化播放循环和 Compare 模式视觉细节；未重新打绿色包。
```

下个 Phase 6D 小步建议：

```text
Phase 6D-2：优化背景切换控件和对比模式显示，让黑边、白边、残留背景更容易被看出来。
```

---

2026-06-15 Phase 6D-2 背景与对比验收控件优化：

```text
目标：让用户更快切换背景，判断黑边、白边和残留背景；让 Raw / Soft 对比方向更明确。

完成：预览背景入口从文字按钮改为棋盘 / 黑 / 白 / 灰 / 图色块控件；保留“选择背景”用于自定义背景图；Raw / Soft 对比模式增加左 Raw / 右 Soft 分割提示和当前分割百分比。

验证：tsc 通过；npm build 通过。

边界：未重新打绿色包；未调整冻结布局；未重做播放控制；未做 A / C / D 样本 GUI 复核。
```

下个 Phase 6D 小步建议：

```text
Phase 6D-3：播放验收与问题帧复核体验，重点检查播放循环、帧标尺、问题帧跳转在实际样本中的连贯性。
```

---

2026-06-15 Phase 6D-3 播放验收与问题帧复核体验：

```text
目标：不改 UI 布局、不改处理算法，只让质量验收发现的问题帧更容易在预览区复核。

完成：点击质量验收疑似问题帧时会暂停播放，优先切到 Soft 视图（无 Soft 时回退 Raw / 原图），跳转到对应帧并聚焦预览检查；预览状态条会提示当前帧是否为疑似问题帧；帧标尺和预览区新增疑似问题帧快捷入口，方便连续检查。

验证：tsc 通过；npm build 通过。

未做：未重新打绿色包；未改 rembg / postprocess / 质量检测算法；未继续调整三栏、二栏、单栏布局。
```

下个 Phase 6D 小步建议：

```text
Phase 6D-4：用真实样本复核预览验收工作流，重点确认背景切换、Raw / Soft / 对比、问题帧跳转、播放暂停在绿色包中的一致性；若通过，再考虑 Phase 6D 收口。
```

---

2026-06-15 Phase 6D-4 开发版人工验收与收口判断：

```text
目标：确认 Phase 6D 的预览验收视图强化是否已经达到继续向后推进的最低标准。

验收结果：开发版人工验收完成。npm.cmd run dev 复核时先发现开发模式运行时默认指向 E:\cuts，已修正为默认使用项目内 portable-root，并保留 SCS_DEV_CORE_DIR / SCS_PORTABLE_ROOT 环境变量覆盖能力；重新启动开发版后验收通过。

验证：tsc 通过；npm build 通过；build-internal.ps1 通过；portable Python import rembg / onnxruntime / PIL + numpy 通过；zip 大小 552.75 MB。

绿色包状态：已重新打包生成 release/SequenceCutoutStudio-Internal-v0.4.0-internal.1-win-x64.zip；本轮记录为构建与运行时 import 验证通过，未额外做完整绿色包 GUI 主流程复核。

稳定链路影响：打包后仍使用 process.resourcesPath\portable-root；未恢复 .venv；未调用 rembg.exe；未改 rembg / postprocess 算法。

收口判断：Phase 6D 可以收口。剩余更细的 Compare 视觉细节、大图预览深度检查和多类样本覆盖，后续如发现问题再按独立小任务处理，不继续阻塞 6D。
```

下个阶段唯一主目标：

```text
Phase 6E：模型与预设优化验证。重点不是立刻改模型，而是基于当前质量边界决定哪些预设、提示或模型方向值得进入正式版前验证。
```

---

## 5.3 Phase 6E 当前推进记录

2026-06-15 Phase 6E-1 模型与预设验证计划：

```text
目标：先固定 Phase 6E 的实验边界，避免直接改默认模型、默认参数或正式链路。

完成：新增 docs/PHASE-6E-MODEL-PRESET-VALIDATION.md；记录当前随包模型只有 isnet-general-use.onnx；用 portable Python 查询当前 rembg 包可识别模型名；结合 theranajayant/rembg README 的模型说明，明确第一轮不全量测试所有模型，优先验证 isnet-general-use / isnet-anime / birefnet-general-lite / silueta / u2net；从 E:\cuts\test 中选出 04 / 07 / 09 / 10 / 12 五组代表样本；明确第一轮只做离线模型 / 预设对比，不提交大模型和输出图片。

验证：portable Python 查询 rembg session 清单通过；确认 portable-root/tools/models 当前只有 isnet-general-use.onnx。文档规划变更未运行 tsc / npm build。

边界：不改 Electron / rembg_runner / postprocess；不改 UI；不重新打绿色包；不恢复 .venv；不调用 rembg.exe。
```

下个 Phase 6E 小步建议：

```text
Phase 6E-2：建立离线模型 / 预设对比脚本或命令清单，先用当前 isnet-general-use + 多组 Soft 参数跑 04 / 07 / 09 / 10 / 12 的对比，输出本地临时目录，不进入正式 app。
```

---

2026-06-15 Phase 6E-2 离线预设对比脚本：

```text
目标：先验证“不同 Soft 参数是否值得作为预设优化方向”，不下载新模型，不跑 rembg，不改默认 app 链路。

完成：新增 scripts/phase-6e-compare-presets.ps1；脚本默认读取 E:\cuts\test 中 04 / 07 / 09 / 10 / 12 五组样本，复用已有 general_raw，分别生成 detail_keep / soft_c / balanced_f / clean_i 四组 Soft 结果；输出到 release/phase-6e-2-preset-compare，并生成 summary.json。

验证：powershell.exe -ExecutionPolicy Bypass -File .\scripts\phase-6e-compare-presets.ps1 通过；5 组样本 x 4 组变体 x 48 帧全部处理成功，skipped=0。

边界：不改 Electron / rembg_runner / postprocess；不改 UI；不重新打绿色包；不恢复 .venv；不调用 rembg.exe；release/phase-6e-2-preset-compare 为本地验证产物，不进入 Git。
```

下个 Phase 6E 小步建议：

```text
Phase 6E-3：生成预设对比 contact sheet 或人工视觉复核表，重点看 04 是否退化、07 是否仍误删主体、09 毛发是否更脏、10 第 25-30 帧是否无法靠 Soft 修复、12 是否仍不适合默认流程。
```

---

2026-06-15 Phase 6E-3 预设 contact sheet 与视觉结论：

```text
目标：把 Phase 6E-2 生成的四组 Soft 参数结果转成可人工验收的横向对比图，并判断“只调 Soft 参数”是否足以改善当前核心问题。

完成：新增 scripts/phase_6e_build_contact_sheets.py；生成 release/phase-6e-3-preset-contact-sheets；新增 docs/PHASE-6E-PRESET-COMPARISON-REPORT.md。每张图按 original / raw / detail_keep / soft_c / balanced_f / clean_i 横向排列；10 发光法术样本额外纳入 sample_0025 与 sample_0030，专门检查此前确认的主体误删帧。

验证：.\portable-root\tools\python\python.exe scripts\phase_6e_build_contact_sheets.py 通过，生成 5 张 contact sheet；人工抽看 04 / 07 / 09 / 10 / 12 五组图。文档和本地验证产物变更未运行 tsc / npm build。

结论：当前 clean_i 仍适合作为默认“干净收边”；detail_keep 可作为后续高级预设候选，但不足以替换默认 I；07 低对比、10 发光法术、12 透明布料的主要问题发生在 Raw 阶段，不能靠 Soft 参数补回。

边界：不改 Electron / rembg_runner / postprocess；不改 UI；不改默认参数；不下载或接入新模型；不重新打绿色包；release/phase-6e-3-preset-contact-sheets 为本地验证产物，不进入 Git。
```

下个 Phase 6E 小步建议：

```text
Phase 6E-4：收束正式版前模型与预设决策。默认继续使用 isnet-general-use + clean_i；detail_keep 作为后续高级预设候选；低对比 / 发光半透明 / 透明布料写入能力边界；不在正式版前新增复杂模型选择。
```

---

2026-06-15 Phase 6E-4 正式版前决策收束：

```text
目标：明确 Phase 6E 在正式上线前的边界，避免模型优化继续阻塞 Phase 6F / 6G / 6H。

结论：正式版前不新增复杂模型选择，不改默认模型链路，不把 isnet-anime / silueta / u2net / BiRefNet 等候选模型接入正式 app。当前默认继续使用 isnet-general-use + clean_i，质量验收负责提示疑似问题帧。

原因：Phase 6E-3 已确认 07 低对比、10 发光法术、12 透明布料的核心问题发生在 Raw 阶段，Soft 预设无法补回已经误删的主体；临时新增模型选择会引入包体、离线可用性、速度、失败提示、用户理解成本和绿色包稳定性风险。

后续归属：高级模型选择、细节保留预设、不同素材类型的模型推荐、批量重命名 / 高级导出等能力，统一归入正式版后功能迭代，可与后续会员升级功能合并规划为增值能力。

正式版前保留事项：发布文档需要清楚说明低对比、发光半透明、透明布料不是当前默认流程的稳定承诺；质量验收发现问题帧后，用户可以跳转复核和手工判断。

边界：不改 Electron / rembg_runner / postprocess；不改 UI；不改默认参数；不下载或接入新模型；不重新打绿色包。
```

下个阶段唯一主目标：

```text
Phase 6F：正式发布稳定性补强。重点检查导出目录、磁盘空间、路径/权限、日志与失败提示，不再继续扩展模型能力。
```

---

## 5.4 Phase 6F 当前推进记录

2026-06-15 Phase 6F 阶段切入：

```text
目标：正式发布稳定性补强，减少用户在导出目录、磁盘空间、路径权限、日志定位和失败提示上遇到闪崩或不明原因失败。

范围：只处理正式发布前稳定性问题；不做模型优化；不新增复杂模型选择；不做会员功能；不改 UI 主布局；不重构处理链路。

继承基线：继续使用 isnet-general-use + clean_i；继续使用 portable Python -> rembg_runner.py -> rembg -> Raw -> postprocess -> Soft 正确链路；不恢复 .venv；不调用 rembg.exe。

第一小步建议：Phase 6F-1 先审查导出目录选择 / 新建文件夹 / 可写性检查 / export.log 记录链路，优先处理此前出现过的新建目录后选择当前文件夹闪崩风险。
```

---

2026-06-15 Phase 6F-1 导出目录与日志稳定性补强：

```text
目标：优先补强导出目录选择 / 新建文件夹 / 可写性检查 / export.log 记录链路，降低此前“新建目录后选择当前文件夹”相关崩溃或失败不可定位风险。

完成：electron/main.ts 新增目录可读 / 可写检查；导出透明 PNG 序列前先确认 Soft 结果目录可读、导出保存位置可写；导出目录选择 IPC 增加 createDirectory 属性和异常捕获；选择到不可写目录时返回用户可理解提示，并把技术细节写入 export.log。

日志：export.log 继续记录导出开始、源目录、目标根目录、目录检查、PNG 数量、生成导出目录、复制数量、manifest 路径和错误详情。日志写入失败仍不影响主流程。

验证：.\node_modules\.bin\tsc.cmd --noEmit 通过；npm.cmd run build 通过。

未做：本小步未运行 build-internal.ps1，未重新打绿色包，未做 GUI 手工复核；磁盘空间不足、中文/长路径专项、已有输出目录策略、Python 子进程失败提示留到后续 6F 小步。

边界：不改模型；不改 UI 主布局；不改默认参数；不重构处理链路；不恢复 .venv；不调用 rembg.exe。
```

下个 Phase 6F 小步建议：

```text
Phase 6F-2：做路径与权限专项复核，覆盖中文路径、空格路径、长路径、只读目录、已存在输出目录；根据复核结果决定是否继续补磁盘空间检查或输出目录策略。
```

---

2026-06-15 Phase 6F-2 路径与权限专项复核：

```text
目标：覆盖中文路径、空格路径、长路径、不可用目录、已存在输出目录等正式发布前常见路径问题，减少导出失败时的系统级报错和误覆盖风险。

完成：electron/main.ts 增加已有导出目录避让策略；如果同名导出目录已存在，自动追加 _02、_03 等后缀，避免同一秒重复导出覆盖旧结果；增加 Windows 安全路径长度检查，导出目录、manifest 或任一输出 PNG 路径过长时提前返回用户可理解提示；保留中文和空格路径，不做错误替换。

新增验证脚本：scripts/phase-6f-verify-export-paths.mjs。脚本在系统临时目录验证中文 + 空格路径、已有目录后缀、长路径保护、文件路径误作为导出目录时拒绝。

验证：node scripts\phase-6f-verify-export-paths.mjs 通过；.\node_modules\.bin\tsc.cmd --noEmit 通过；npm.cmd run build 通过。

未做：本小步未运行 build-internal.ps1，未重新打绿色包，未做 GUI 手工复核；磁盘空间不足提示、Electron 主进程异常捕获复核、Python 子进程失败提示仍留到后续 6F 小步。

边界：不改模型；不改 UI 主布局；不改默认参数；不重构处理链路；不恢复 .venv；不调用 rembg.exe。
```

下个 Phase 6F 小步建议：

```text
Phase 6F-3：补充磁盘空间不足与剩余异常提示策略；重点看导出前空间估算、Electron 主进程异常捕获是否已足够、Python 子进程失败信息是否仍有技术噪声。
```

---

2026-06-15 Phase 6F-3 磁盘空间与剩余失败提示：

```text
目标：补充导出前磁盘空间不足检查，并复核剩余异常提示是否仍有明显技术噪声。

完成：electron/main.ts 在导出透明 PNG 序列前统计源 PNG 总大小，按 1.1 倍 + 50MB 缓冲估算目标盘所需空间；可用空间不足时提前返回“导出保存位置剩余空间不足”提示，并在 export.log 中记录 required / available；如果系统空间查询失败，只写日志并继续导出，避免因为平台 API 异常造成新阻断。

完成：单帧测试中 Python 子进程失败提示从 “rembg / postprocess” 改为“自动去背景失败 / 修边失败”，技术细节仍保留在详情日志中。批量处理主链路此前已使用“自动去背景失败 / 修边失败 + debug 详情”，本轮未扩大改动。

复核：Electron 主进程已有 uncaughtException / unhandledRejection 写入 export.log；导出选择窗口、导出目录检查、导出执行 catch 均已记录错误详情。本轮不新增全局异常架构。

验证：node scripts\phase-6f-verify-export-paths.mjs 通过；.\node_modules\.bin\tsc.cmd --noEmit 通过；npm.cmd run build 通过。

未做：本小步未运行 build-internal.ps1，未重新打绿色包，未做 GUI 手工复核；绿色包完整验证留到 Phase 6F 收口或 Phase 6H。

边界：不改模型；不改 UI 主布局；不改默认参数；不重构处理链路；不恢复 .venv；不调用 rembg.exe。
```

下个 Phase 6F 小步建议：

```text
Phase 6F-4：做 Phase 6F 收口前检查，决定是否需要打绿色包复核；重点确认导出稳定性补强是否足够进入 Phase 6G 发布文档。
```

---

2026-06-15 Phase 6F-4 绿色包构建与 GUI 复核：

```text
目标：将 Phase 6F 导出稳定性补强打入绿色包，并通过 GUI 手工复核确认主流程仍可用。

完成：运行 scripts/build-internal.ps1 成功；portable Python import rembg / onnxruntime / PIL + numpy 在脚本内通过；最终 zip 为 release/SequenceCutoutStudio-Internal-v0.4.0-internal.1-win-x64.zip，大小 552.76 MB；最终包中 tools/rembg/.venv 不存在，tools/rembg 旧目录不存在。

GUI 复核：launcher 出现并进入主界面；环境自检通过；E:\cuts\test\10发光法术.mp4 完成视频切帧、单帧测试、批量处理、质量验收提示疑似问题帧；连续两次导出 PNG 序列成功；export.log 记录导出开始、目录检查、磁盘空间检查、PNG 数量、导出目录、manifest 路径和复制数量。

复核发现：预览区提示“双击预览图可放大查看，Raw / Soft 对比可拖动分割线检查边缘。”占用首屏高度；主界面阶段仍显示 Phase 6B。

修正：src/App.tsx 删除预览提示文字，减少预览检查面板高度占用；主界面阶段和启动日志更新为 Phase 6F - 正式发布稳定性补强。

修正后验证：.\node_modules\.bin\tsc.cmd --noEmit 通过；npm.cmd run build 通过；再次运行 scripts/build-internal.ps1 成功；Python import 三项通过；zip 大小 552.76 MB；最终包中 .venv / 旧 tools/rembg 均不存在；绿色包进程已重新启动。

最终人工确认：最新绿色包中预览说明文字已消失，左侧当前阶段已显示 Phase 6F；此前 Windows “找不到路径”是从日志区域复制 / 点击被换行截断路径导致，不是导出失败。

边界：不改模型；不改默认参数；不改处理链路；不恢复 .venv；不调用 rembg.exe。
```

Phase 6F 收口判断：

```text
Phase 6F 已完成并可以收口。下一阶段转入 Phase 6G 正式上线文档与发布物料。
```

下个阶段唯一主目标：

```text
Phase 6G：正式上线文档与发布物料。重点写清楚使用流程、适合素材、已知限制、反馈方式和发布说明，不再扩展功能。
```

---

## 5.5 Phase 6G 当前推进记录

2026-06-15 Phase 6G 正式上线文档与发布物料：

```text
目标：让正式用户知道怎么启动、怎么完成一次处理、什么素材适合当前版本、遇到问题怎么反馈，以及发布宣传时哪些能力可以说、哪些边界不能夸大。

完成：新增 docs/USER-GUIDE.md，覆盖启动、导入、单帧测试、批量处理、预览检查、质量验收、导出和常见问题；新增 docs/QUALITY-GUIDE.md，明确推荐素材、谨慎素材、不建议宣传的素材、人工验收方法和质量验收边界。

完成：重写 docs/INTERNAL-RELEASE.md 为正式发布说明；重写 docs/INTERNAL-FEEDBACK.md 为正式反馈模板；新增 docs/LAUNCH-MATERIALS.md，记录 A / A- 宣传样本建议、截图动图清单、宣传文案和不建议作为宣传主图的样本；新增 docs/CHANGELOG-v0.4.0-internal.1.md。

版本命名：当前仍记录为 0.4.0-internal.1；是否在 Phase 6H 正式候选包中升版，由最终打包验收时决定。

验证：本阶段只改文档，未运行 tsc / npm build，未重新打绿色包。

边界：不改 Electron / launcher / portable Python / rembg_runner / postprocess；不改 UI；不改模型；不改默认参数；不恢复 .venv；不调用 rembg.exe。
```

Phase 6G 收口判断：

```text
Phase 6G 已完成并可以收口。下一阶段转入 Phase 6H 正式包构建与上线验收。
```

下个阶段唯一主目标：

```text
Phase 6H：构建正式候选绿色包，完成最终主流程验收、多电脑测试准备、版本号确认和发布归档。
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
Phase 6B 固定 UI 布局与功能承载边界
Phase 6C 序列质量验收与问题帧检测
Phase 6D Raw / Soft 预览验收视图强化
Phase 6E 模型与预设优化验证
Phase 6F 正式发布稳定性补强
Phase 6G 正式上线文档与发布物料
Phase 6H 正式包构建与上线验收
```

---

## 5.6 Phase 6H 发布归档

2026-06-16 Phase 6H 正式候选包构建、GUI 复核与发布归档：

```text
目标：构建正式候选绿色包，完成最终主流程验收、版本号确认、发布资料归档和首批内测发布判断。

候选包：release/SequenceCutoutStudio-Internal-v0.4.0-internal.1-win-x64.zip
大小：579,606,898 bytes / 552.76 MiB
构建完成时间：2026-06-16 10:16:45
发布分支：main
候选分支：codex/build-internal-script

归档：新增 docs/RELEASE-ARCHIVE-v0.4.0-internal.1.md；确认 docs/PHASE-6H-GUI-VERIFICATION.md 已记录 GUI 手工复核；确认 docs/ICON-CACHE-ROOT-CAUSE.md 已记录图标缓存归因；发布说明、用户指南、质量指南、反馈模板、发布物料和 changelog 已归档。

GUI 复核：顶层 launcher、环境自检、视频切帧、单帧测试、批量处理、质量验收、导出 PNG 主流程通过；01白底角色、04简单背景、10发光法术、14遮挡旋转代表样本完成复核；10 / 14 能正确提示疑似问题帧。

发布判断：当前版本可以进入首批小范围内测，建议先发给 3-5 个真实用户测试；不建议马上大范围宣传；不宣传为“全自动高质量去背景”。

边界：本次发布归档不改 Electron / launcher / portable Python / rembg_runner / postprocess；不改 UI；不改模型；不改默认参数；不恢复 .venv；不调用 rembg.exe。
```

Phase 6H 收口判断：

```text
Phase 6H 已完成并可以收口。v0.4.0-internal.1 可以作为首批小范围内测候选包。
```

下个阶段唯一主目标：

```text
Phase 6I：首批真实用户内测反馈整理。定性汇总已收到，人数和逐项测试数据未提供，具体回顾见下文。
```

## 首批内测反馈回顾（2026-09-09）

已完成定性反馈整理，详见 [首批内测反馈与后续迭代计划](首批内测反馈与后续迭代计划.md)。用户经指导可完成操作；序列播放与查看使用最多；复杂背景和特效去背景未达到产品预期。缺少原始素材和逐人记录，效果问题仍待复现。

本轮只新增反馈规划文档、更新基线；核对代码格式入口为 MP4 / MOV / WEBM / MKV，未包含 GIF。未运行 tsc、npm build、Python import 或 GUI 回归，未重打包；未改变 launcher、portable Python、rembg 和后处理链路。

用户已纠正阶段目标：直接打开序列查看和播放是现有能力。下一阶段应在此基础上增加 GIF 原始拆帧、放大背景可选开关、滚轮隔离和区间循环；复杂背景和特效去背景留作独立专项。

## 序列查看功能增强回顾（2026-09-09）

开发目标已完成：GIF 选择后禁用切帧 FPS/时长，按原始帧输出 PNG；保留透明度和时长清单；放大滚轮阻止页面滚动；“使用主预览背景”默认关闭且不改变已有图像缩放、位置、播放状态；起止帧区间循环支持恢复全帧和换素材重置。

验证：tsc --noEmit、npm build、GIF 解码测试、真实 Electron 窗口自动验证通过；1440/1024/920 宽度截图已检查。现有绿色包 rembg、onnxruntime、PIL/numpy import 通过；PowerShell 5.1 脚本解析、GIF 脚本同步和中文说明复制验证通过。细节见 [序列预览优化验证记录](序列预览优化验证记录.md)。

运行链路：新增使用现有 Pillow 的 GIF 解码脚本，构建时随运行时复制；不新增依赖、不改变模型或 rembg_runner/postprocess。修正已有随包中文文件名在 PowerShell 5.1 下的解码问题。没有恢复 .venv 或调用 rembg.exe。

未完成：未重建发布包，未做新版干净电脑验收，尚未取得真实用户对本轮交互的复核。本轮没有操作发布标签或既有分发压缩包；核对时历史 zip 已不在 release 顶层，当前有绿色目录和“视频转序列帧+智能去背景工具.rar”。发现已有 src/main.tsx 的旧 IPC 监听报错，单独记录，未在本轮扩展修复。

下一个唯一主目标：用户复核本轮三项交互并完成新候选包验收；验收前不进入复杂背景模型优化。

### 用户复核后的修正（2026-09-09）

用户已通过多数 GIF、放大查看、区间循环与 PNG 预览项目。根据反馈修正：每次打开大图取消背景开关；大图自定义背景以原始尺寸居中不拉伸；区间数字输入改为失焦或 Enter 时校验，允许逐位输入。旧 Phase 6F 文案更新为“序列预览优化”。

修正后 tsc、npm build、GIF 解码测试与独立 Electron 回归均通过，新增覆盖 5-14 逐位输入、空白恢复、范围限制和大图重开默认状态。未改 launcher、portable Python 或 rembg 链路，未重新打包。

阶段尚未最终验收：修正项待用户复测，透明 GIF 和源素材不变性待手工确认，单帧去背景、批量处理、只重跑边缘及 PNG 导出仍为待测，不能默认通过。下一唯一主目标仍为补齐本轮复测与候选包验收。

### 用户复测通过与阶段归档（2026-09-09）

用户最终确认：“复测结果通过可以归档”。本轮序列预览优化完成收口，包含 GIF 导入拆帧与原始节奏、放大预览滚轮隔离及可选背景、部分帧循环，以及大图重开默认状态、背景原始尺寸、区间数字输入三项修正。此前“修正项待用户复测”状态由本记录更新为通过。

验证依据为前述类型检查、构建、GIF 解码与 Electron 自动回归结果，以及本次用户复测确认。本次归档只更新文档，没有重跑构建、重新打包或修改发布标签；不改变绿色包、launcher、portable Python 和 rembg 链路。

发布验收与功能收口分开记录：透明 GIF 和源素材不变性的手工逐项结论、完整去背景与导出回归尚无补测明细，不自动标记通过。现有启动 IPC 异常和性能验证边界继续保留。

下一个唯一主目标：生成并验收包含本轮优化的新内测候选包，补齐发布回归与干净电脑验证；当前归档不表示新版分发包已生成或已发布。

## WebP 导入扩展（2026-09-10）

按用户新增需求，在原有 GIF 拆帧链路上支持 WebP 导入、原始拆帧及播放，保留半透明像素。使用通用 `extract_animation.py` 替代原 GIF 专用入口，兼容旧 GIF 时长清单，构建脚本同步新入口并检查 Pillow WebP 支持；没有新增 Python 依赖，没有改变 launcher / rembg / 后处理链路。

开发验证通过：tsc、npm build、GIF 两组回归、WebP 两组测试、用户 512×512/18 帧样本逐帧 RGBA 与时长比对、真实 Electron 导入拆帧播放回归。现有绿色包 Python 三项 import 及 WebP 测试通过。详细记录见 [WebP 导入与拆帧验证记录](WebP导入与拆帧验证记录.md)。

本扩展尚未用户验收、未生成新发布包，不覆盖前一轮用户复测通过的历史结论。下一唯一主目标：用户复测 WebP 导入与半透明保留，通过后再继续候选包构建与发布回归。

## 固定一键打包入口（2026-09-10）

按用户要求复用 `scripts/build-internal.ps1`，新增项目根目录 `一键打包.cmd`，供后续更新后直接运行，避免每次重新组织构建步骤。新增只读前提检查 `-CheckOnly`、版本一致性校验、独立日志和 JSON 结果、ZIP 大小与 SHA-256 记录；同版本已有 ZIP 时追加时间戳，不覆盖历史包。类型检查、构建、launcher 图标与 portable Python 检查继续保留。

清理操作限定在 release 内并拒绝链接路径，不再清理源码侧测试素材。工作目录 `release/SequenceCutoutStudio-Internal/` 仍会重建。缺失的 Resource Hacker 便携工具已从作者官网补齐到本地 release/tools，不进入用户包。未改变 launcher 源码、Python 便携结构或 rembg 调用方式。

验证通过：脚本语法、路径边界、ZIP 防覆盖、中文说明随包测试；真实 `-CheckOnly`；tsc、npm build；现有绿色包 rembg / onnxruntime / PIL+numpy 三项 import。本次没有执行完整 electron-builder、launcher 重编译与全量 ZIP 压缩，没有新发布包或正式发布标签。

后续打包默认直接运行上述入口，不临时重写构建流程；构建成功不代替 GUI、完整处理流程及干净电脑验收。当前下一主目标仍为完成 WebP 用户复测，再用固定脚本生成候选包。

## 放大预览顶栏精简（2026-09-10）

根据用户截图反馈，取消启用主预览背景后才出现的整条深色顶栏，统一勾选前后的布局和控件样式。棋盘、黑、白、灰、图片及选择背景图片收进原生下拉框，未勾选时置灰并保留位置；主预览背景按钮不变。仍保留每次打开默认不勾选、背景图片原始尺寸、缩放拖动和播放行为。

验证：tsc --noEmit、npm build、独立 Electron 自动回归通过；1440/920 宽度截图检查通过，勾选前后顶栏高度、背景和内边距一致，无横向溢出；GIF/WebP 导入拆帧播放、区间循环及背景图片选择回归通过。原有 IPC 启动异常仍单独记录，无新增页面异常。

本轮只改前端、测试和说明，未改 launcher / portable Python / rembg 链路，未重新打包。待用户复测后使用一键脚本更新候选包；已打出的旧包不包含本次顶栏调整。

## 纯色背景半透明抠图复现 skill（2026-09-11）

用户认可莲花人物样本的去灰底结果，要求保存可复现skill和独立操作方法。本轮在独立 `skills/solid-background-matting/` 中保存实际算法脚本、原始样本、初选Alpha、主体保护坐标/修正PNG、全部参数与验收S，附本地涂抹工具、操作说明、公式和限制。详见 [纯色背景抠图交付说明](SOLID-BACKGROUND-MATTING.md)。

验证通过：固定初选重算、从原图重新rembg初选后重算、用修正PNG替代坐标预设三条路径，全部与用户验收S的RGBA像素一致；错误原图预设、错误蒙版尺寸、已有透明输入的拒绝检查通过；skill结构、PowerShell语法、tsc、npm build和现有绿色包Python三项import通过。涂抹工具已做内置浏览器载入、笔刷、撤销、修正生成预览和错误文件拦截验证；内置浏览器下载实际落盘及外部浏览器/其他电脑交互未验证。

范围：只交付独立复现工具与方法，没有将新算法接入应用，没有改变绿色包、launcher、portable Python、rembg_runner或默认后处理。未重新打包、未做干净电脑验收，不能据此承诺任意新图和序列帧的效果。

本专项的复现与说明目标已完成。下一唯一主目标是用户按说明在一张新的纯色底图片上完成保留/删除标记并复核效果；应用发布验收仍保留前述待办，不由本skill验收替代。

后续澄清：用户将包内 `initial-alpha.png` 初选输入与第一版最终Alpha比较。逐像素检查确认初选有156319像素不同，而三条完整skill输出的最终Alpha均与第一版相同。新增 `final-alpha.png` 明确文件名、随包已验收最终Alpha、“查看结果.md”及终端路径提示，未改精修算法参数。再次重跑后最终Alpha和S均与第一版逐像素一致；skill/脚本校验、tsc、build和Python三项import再次通过。下一主目标不变。

## 发布包用户验收通过（2026-09-12）

用户确认本次优化“验收通过”。GIF/WebP 原始拆帧与半透明保留、原始节奏/区间循环、放大预览背景及顶栏精简、一键打包流程作为本轮成果收口；此前相关“待用户复测、未重新打包”状态由此更新。

已验收包：`SequenceCutoutStudio-Internal-v0.4.0-internal.1-win-x64-20260912-213330-310.zip`，579,638,170 bytes（552.79 MB），构建完成于 2026-09-12 21:36:13 +08:00。归档时核对 SHA-256 与构建 JSON 一致。完整身份、验证证据及范围见 [发布验收记录](发布验收记录-20260912.md)。

构建中的类型检查、构建、launcher 图标和 portable Python 检查通过；用户验收结论已补充归档，不反写原始构建 JSON。未提供逐项机器记录，不额外推断新版干净电脑与全部抠图质量测试已完成。此次仅文档更新，无新构建、Git 提交或发布标签操作，不改变运行链路。

推荐下一阶段唯一主目标（草案，待用户确认）：缩略图时间轴与可视化选段，提升找帧、检查和设置循环范围的效率，不重复开发已有的直接打开播放能力。独立纯色背景抠图继续保留新素材验证门槛，不与本阶段捆绑接入。
