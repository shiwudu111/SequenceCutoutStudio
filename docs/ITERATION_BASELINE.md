# Sequence Cutout Studio 后续迭代基线

版本定位：第一版内测绿色包已通过，进入发布流程固化与下一轮功能开发准备

当前阶段：Phase 4A 工程系统 Project System 已完成，下一阶段进入 Phase 4B

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
[x] zip 体积约 553.78 MB，属于合理范围
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
Phase 4A：工程系统 Project System          已完成
Phase 4B：序列帧时间轴与缩略图              下一阶段
Phase 4C：任务队列与批处理稳定化
Phase 4D：导出系统
Phase 4E：缓存系统
Phase 4F：处理效果增强
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

状态：已完成。

目标：从“处理一个文件或文件夹”升级为“管理一个素材处理工程”。

需要完成：

```text
[x] 新建工程
[x] 打开工程
[x] 保存工程
[x] 最近工程列表
[x] 导入视频到工程
[x] 导入序列帧到工程
[x] 保存处理参数
[x] 保存预览设置
[x] 保存输出记录
```

推荐工程结构：

```text
MyProject/
├─ project.json
├─ source/
├─ cache/
├─ output/
├─ temp/
├─ thumbnails/
└─ masks/
```

阶段回顾：

```text
目标是否完成：已完成第一版工程系统。
实际完成：新增 project.json 工程文件；新建 / 打开 / 保存工程；最近工程列表；工程目录自动创建 source/cache/output/temp/thumbnails/masks；工程内保存素材路径、处理参数、预览设置和输出目录记录。
验证命令：tsc --noEmit 通过；npm.cmd run build 通过；build-internal.ps1 提权后通过。
绿色包验证：rembg / onnxruntime / PIL / numpy import 通过。
产物：release/SequenceCutoutStudio-Internal-v0.4.0-internal.1-win-x64.zip，约 553.78 MB。
稳定链路影响：不改变 portable Python / rembg_runner / postprocess 链路。
下个阶段唯一主目标：Phase 4B 序列帧时间轴与缩略图。
```

---

# Phase 4B：序列帧时间轴与缩略图

状态：后续阶段。

目标：让用户更方便地查看和选择序列帧，避免只靠文件名和单张预览操作。

需要完成：

```text
[ ] 序列帧时间轴
[ ] 帧缩略图列表
[ ] 当前帧高亮
[ ] 点击缩略图切换当前帧
[ ] 快速跳到第一帧 / 中间帧 / 最后一帧
[ ] 播放 / 暂停
[ ] 循环播放
[ ] FPS 控制
[ ] 关键帧标记
```

完成标准：

```text
即使有几百张序列帧，界面仍然可以流畅浏览和切换。
```

---

# Phase 4C：任务队列与批处理稳定化

状态：后续阶段。

目标：让批量处理更稳定、更可控，避免用户误以为软件卡死。

需要完成：

```text
[ ] 批处理任务面板
[ ] 显示当前处理帧
[ ] 显示已完成数量 / 总数量
[ ] 显示失败数量
[ ] 显示预计剩余时间，可选
[ ] 失败任务可查看错误
[ ] 支持取消任务
[ ] 支持失败后继续处理，可选
```

---

# Phase 4D：导出系统

状态：后续阶段。

目标：让处理结果更方便进入游戏开发流程。

第一阶段导出：

```text
[ ] 导出透明 PNG 序列
[ ] 选择输出目录
[ ] 输出目录命名规范
[ ] 输出完成后打开文件夹
```

后续可扩展导出：

```text
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

状态：后续阶段。

目标：减少重复处理，提高处理效率。

缓存思路：

```text
source + model + params -> cache key
```

需要完成：

```text
[ ] 原始素材 hash
[ ] 参数 hash
[ ] Raw 缓存管理
[ ] Soft 缓存管理
[ ] 缓存命中提示
[ ] 清理缓存功能
[ ] 缓存占用大小显示
```

---

# Phase 4F：处理效果增强

状态：后续阶段。

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
进入时间轴、任务队列、导出和缓存
```
