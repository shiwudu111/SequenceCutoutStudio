# Sequence Cutout Studio Agent 工作说明

本文件是给 Codex / AI 编程助手看的项目规则。  
后续任何自动改代码、写脚本、重构、修 bug，都必须优先遵守这里的规则。

---

## 1. 项目定位

Sequence Cutout Studio 是一个 Windows 本地桌面工具，主要面向：

- 游戏美术
- 技术美术
- 动画素材处理人员
- 美术外包人员
- 游戏开发人员

它的核心功能是：

    导入视频 / PNG 序列帧
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
    参数对比
    ↓
    输出透明 PNG 序列

当前阶段优先保证：

    本地可运行
    跨电脑可运行
    绿色包稳定
    处理链路稳定
    构建流程可重复

不要优先做账号系统、云端处理、自动更新、防多开、复杂权限系统等消费级软件功能。

---

## 2. 当前稳定发布形态

当前稳定发布形态是：

    绿色文件夹 zip + 顶层 C# launcher

最终目录结构应类似：

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

用户只需要双击：

    SequenceCutoutStudio-Internal.exe

---

## 3. 非常重要：rembg 运行时规则

旧方案已经确认失败：

    portable-root/tools/rembg/.venv
    portable-root/tools/rembg/.venv/Scripts/python.exe
    portable-root/tools/rembg/.venv/Scripts/rembg.exe

失败原因：

    Windows .venv 不适合作为绿色便携运行时。
    .venv 内部会记录开发电脑上的绝对 Python 路径。
    换到干净电脑后会出现 No Python at ... 或 rembg 运行失败。

所以后续禁止恢复旧方案。

当前正确方案是：

    portable-root/tools/python/python.exe
    portable-root/tools/Lib/site-packages
    portable-root/tools/rembg_runner.py
    portable-root/tools/models/isnet-general-use.onnx
    portable-root/tools/postprocess/batch_clean_cutout_soft.py
    portable-root/tools/ffmpeg/ffmpeg.exe

Electron 主进程调用 rembg 时，必须走：

    python.exe rembg_runner.py

不要直接调用：

    rembg.exe
    python -m rembg
    .venv/Scripts/python.exe
    .venv/Scripts/rembg.exe

原因：

    当前 rembg 版本不支持 python -m rembg。
    .venv 不便携。
    rembg.exe 启动器会记录开发机绝对路径。

---

## 4. 当前 Python 运行时结构

当前 portable Python 的依赖实际位于：

    portable-root/tools/Lib/site-packages

不是：

    portable-root/tools/python/Lib/site-packages

因此代码里的 PYTHONPATH 应指向：

    tools/Lib/site-packages

不要改回：

    tools/python/Lib/site-packages

---

## 5. 必须保留的运行时文件

发布包中必须包含：

    app/resources/portable-root/tools/python/python.exe
    app/resources/portable-root/tools/Lib/site-packages/rembg
    app/resources/portable-root/tools/Lib/site-packages/onnxruntime
    app/resources/portable-root/tools/Lib/site-packages/PIL
    app/resources/portable-root/tools/Lib/site-packages/numpy
    app/resources/portable-root/tools/rembg_runner.py
    app/resources/portable-root/tools/models/isnet-general-use.onnx
    app/resources/portable-root/tools/postprocess/batch_clean_cutout_soft.py
    app/resources/portable-root/tools/ffmpeg/ffmpeg.exe
    app/resources/portable-root/tools/pyvenv.cfg

发布包中不应包含：

    app/resources/portable-root/tools/rembg/.venv

旧 .venv 会让包体变大，并且不是当前运行链路需要的内容。

---

## 6. 不要提交到 Git 的内容

不要提交以下目录和文件：

    portable-root/
    release/
    dist/
    dist-electron/
    node_modules/
    *.zip
    *_general_raw/
    *_soft_*/
    *_12fps_*/

portable-root 是本地运行时目录，体积很大，不应进入 Git。

如果需要保存工具脚本源码，例如 rembg_runner.py，应该放在可追踪源码目录，例如：

    runtime-tools/rembg_runner.py

然后由构建脚本复制到：

    portable-root/tools/rembg_runner.py

---

## 7. 构建和验证要求

普通代码修改后，至少运行：

    .\node_modules\.bin\tsc.cmd --noEmit
    npm.cmd run build

涉及绿色包、运行时、rembg、Python、postprocess、打包的修改，必须额外验证：

    .\release\SequenceCutoutStudio-Internal\app\resources\portable-root\tools\python\python.exe -c "import rembg; print('rembg ok')"

    .\release\SequenceCutoutStudio-Internal\app\resources\portable-root\tools\python\python.exe -c "import onnxruntime; print('onnxruntime ok')"

    .\release\SequenceCutoutStudio-Internal\app\resources\portable-root\tools\python\python.exe -c "import PIL, numpy; print('postprocess deps ok')"

这三条必须通过。

---

## 8. 当前绿色包验收流程

每次重新打包后，至少验证：

    1. 双击 SequenceCutoutStudio-Internal.exe
    2. launcher 启动画面出现
    3. 主界面正常打开
    4. 启动自检通过
    5. 选择 sample_video.mp4
    6. 视频切帧成功
    7. 单帧测试成功
    8. 完整批量处理成功
    9. 只重跑边缘成功

干净电脑测试也必须通过。

---

## 9. 包体大小判断

当前已验证的合理 zip 大小约为：

    551 MB 左右

如果打包结果明显变大，例如接近 800 MB 或更大，应优先检查是否错误包含了：

    tools/rembg/.venv
    samples 下的测试输出目录
    旧 zip
    release 目录
    嵌套的 SequenceCutoutStudio-Internal 目录

必须删除旧 .venv：

    tools/rembg/.venv

当前已经验证：删除旧 .venv 后，zip 从约 800 MB 降到约 551.67 MB。

---

## 10. 构建脚本后续目标

后续应该新增：

    scripts/build-internal.ps1

目标是自动完成：

    npm build
    electron-builder --win dir
    删除旧 .venv
    清理 samples 测试输出
    组装 release/SequenceCutoutStudio-Internal/app
    编译 launcher
    嵌入 icon.ico 和 splash.bmp
    验证 Python import
    压缩 zip
    输出 zip 大小

---

## 11. Launcher 规则

当前启动入口是 C# WinForms launcher：

    launcher/SequenceCutoutStudioLauncher.cs

它负责：

    用户双击后立即显示启动画面
    后台启动 app/SequenceCutoutStudio.exe
    等待 Electron ready
    ready 后关闭启动画面
    显示主窗口

不要把完整启动页逻辑重新塞回 Electron main.ts 的 BrowserWindow 里。  
Electron 主窗口可以隐藏加载，但启动前提示应由 launcher 负责。

launcher 编译时应嵌入：

    build/icon.ico
    build/splash.bmp

不要在最终顶层目录暴露：

    icon.ico
    splash.bmp

最终顶层目录应该尽量保持：

    SequenceCutoutStudio-Internal/
    ├─ SequenceCutoutStudio-Internal.exe
    └─ app/

---

## 12. package / electron-builder 规则

electron-builder 负责生成：

    release/win-unpacked/

package.json 中的 extraResources 应把 portable-root 注入：

    from: portable-root
    to: portable-root

但由于 portable-root 本身不进 Git，构建机必须本地准备好完整 portable-root。

打包后必须清理：

    release/win-unpacked/resources/portable-root/tools/rembg/.venv
    release/win-unpacked/resources/portable-root/tools/rembg

然后再组装 launcher 绿色目录。

---

## 13. 代码修改原则

每次改动必须尽量小，避免一次做太多事情。

提交说明需要包含：

    改了哪些文件
    为什么改
    运行了哪些验证命令
    哪些内容没有验证
    是否影响打包

不要在没有明确要求的情况下重构整个项目。

不要为了“顺手优化”改动无关模块。

---

## 14. UI 和用户说明原则

本软件主要给美术和开发人员使用。

面向美术人员的文案应避免过多技术术语。

推荐使用：

    自动去背景
    修边
    Raw 初步结果
    Soft 修边结果
    单帧测试
    批量处理
    只重跑边缘

避免在用户界面中过度暴露：

    onnxruntime
    site-packages
    Python venv
    spawn
    Electron resourcesPath

这些可以写在开发文档里，不应放到普通用户主流程说明中。

---

## 15. 当前稳定结论

当前已验证：

    绿色包形态：通过
    干净电脑测试：通过
    FFmpeg 切帧：通过
    portable Python：通过
    rembg_runner 单帧：通过
    完整批量处理：通过
    只重跑边缘：通过
    旧 .venv 已移除：通过
    zip 大小约 551.67 MB：通过

这个状态是后续开发的稳定基线。  
不要破坏这条运行链路。

---

## 16. 后续推荐优先级

第一优先级：

    scripts/build-internal.ps1 自动化构建脚本

第二优先级：

    启动自检升级为真实运行检查

第三优先级：

    docs/BUILD-INTERNAL.md 构建说明
    docs/PORTABLE-RUNTIME.md 运行时说明

第四优先级：

    Project System 工程系统
    序列帧时间轴
    缩略图缓存
    任务队列
    导出系统

---

## 17. 给 Codex 的工作方式

给 Codex 的任务必须小而明确。

推荐任务格式：

    背景：
    当前稳定基线是绿色 zip + launcher，portable Python 运行时已在干净电脑通过。

    目标：
    只做某一个具体任务。

    禁止：
    不要恢复 .venv。
    不要调用 rembg.exe。
    不要提交 portable-root / release。
    不要做无关重构。

    验收：
    运行 tsc。
    运行 npm build。
    如果涉及打包，验证 Python import rembg / onnxruntime / PIL / numpy。

    输出：
    说明改了哪些文件、跑了哪些命令、风险是什么。

---

## 18. 特别提醒

如果以后再次出现：

    No Python at ...
    Fatal error in launcher: Unable to create process using ...
    rembg 单帧抠图失败
    rembg 批量抠图失败

优先检查是否有人恢复了：

    tools/rembg/.venv
    .venv/Scripts/python.exe
    .venv/Scripts/rembg.exe

正确链路永远是：

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