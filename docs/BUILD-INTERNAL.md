# Sequence Cutout Studio 内部绿色包构建说明

本文档记录当前已通过验收的内部绿色包构建流程。

当前稳定发布形态：

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

---

## 1. 当前稳定结论

当前内部绿色包已经完成：

```text
[x] 顶层 C# launcher 启动
[x] app/ 内 Electron 主程序启动
[x] portable Python 运行时通过
[x] rembg import 通过
[x] onnxruntime import 通过
[x] PIL / numpy import 通过
[x] 旧 tools/rembg/.venv 未进入发布包
[x] sample_video 全流程验收通过
[x] 干净电脑打开 zip 验收通过
[x] zip 体积约 553.78 MB
```

该状态是后续构建和发布的稳定基线。

---

## 2. 构建前要求

构建机本地必须已经准备好：

```text
node_modules/
portable-root/
build/icon.ico
build/icon.png
build/splash.png
build/splash.bmp
launcher/SequenceCutoutStudioLauncher.cs
```

其中 `portable-root/` 是本地大体积运行时目录，不进入 Git。

`build/splash.png` 是启动图的可编辑源图，`build/splash.bmp` 是 launcher 构建时嵌入的 BMP 资源。修改启动图后，应重新生成 `build/splash.bmp` 并重新运行 `scripts/build-internal.ps1`。

`portable-root/` 中必须包含：

```text
tools/python/python.exe
tools/Lib/site-packages/rembg
tools/Lib/site-packages/onnxruntime
tools/Lib/site-packages/PIL
tools/Lib/site-packages/numpy
tools/rembg_runner.py
tools/models/isnet-general-use.onnx
tools/postprocess/batch_clean_cutout_soft.py
tools/ffmpeg/ffmpeg.exe
tools/pyvenv.cfg
```

可追踪运行时脚本源码放在：

```text
runtime-tools/rembg_runner.py
runtime-tools/postprocess/batch_clean_cutout_soft.py
```

`scripts/build-internal.ps1` 会在打包前同步到：

```text
portable-root/tools/rembg_runner.py
portable-root/tools/postprocess/batch_clean_cutout_soft.py
```

不要恢复或依赖：

```text
tools/rembg/.venv
.venv/Scripts/python.exe
.venv/Scripts/rembg.exe
rembg.exe
python -m rembg
```

---

## 3. icon 资源生成

当前 icon 来源：

```text
E:\buddy-client\assets\resources\ui\main\character\icon.png
```

生成脚本：

```powershell
.\scripts\generate-icon-assets.ps1
```

默认会生成：

```text
build/icon.png
build/icon.ico
```

`build/icon.ico` 包含多尺寸图层：

```text
16, 24, 32, 40, 48, 64, 96, 128, 256
```

如果要指定其他源图：

```powershell
.\scripts\generate-icon-assets.ps1 -Source "E:\path\to\icon.png"
```

注意：Windows Explorer 可能缓存旧图标。如果最终 exe 已经换了新 icon 但资源管理器仍显示旧图，优先考虑 Explorer icon cache，而不是立刻重做图标。

---

## 4. 一键构建命令

推荐构建命令：

```powershell
.\scripts\build-internal.ps1
```

当前脚本默认会读取：

```text
package.json version
```

也可以手动指定版本号：

```powershell
.\scripts\build-internal.ps1 -Version "0.4.0-internal.1"
```

构建产物：

```text
release/SequenceCutoutStudio-Internal/
release/SequenceCutoutStudio-Internal-v<version>-win-x64.zip
release/build-internal.log
```

当前已验收 zip：

```text
release/SequenceCutoutStudio-Internal-v0.4.0-internal.1-win-x64.zip
约 553.78 MB
```

---

## 5. build-internal.ps1 当前流程

脚本当前会自动执行：

```text
1. 同步 runtime-tools 中的可追踪运行时脚本到 portable-root
2. npm.cmd run build
3. npx.cmd electron-builder --win dir
4. 清理 release/win-unpacked/resources/portable-root/tools/rembg/.venv
5. 清理 release/win-unpacked/resources/portable-root/tools/rembg
6. 清理 sample 输出目录
7. 组装 release/SequenceCutoutStudio-Internal/app
8. 使用 csc.exe 编译 launcher
9. 嵌入 build/icon.ico 和 build/splash.bmp
10. 使用 ResourceHacker 替换 Win32 icon resource
11. 验证 portable runtime 布局
12. 验证 Python import
13. 压缩内部绿色包 zip
14. 输出 zip 路径和 zip 体积
```

脚本会写入日志：

```text
release/build-internal.log
```

---

## 6. Resource Hacker 要求

脚本会自动查找 `ResourceHacker.exe`。

可用位置包括：

```text
%LOCALAPPDATA%\electron-builder\Cache\winCodeSign\winCodeSign-2.6.0\ResourceHacker.exe
%LOCALAPPDATA%\Programs\Resource Hacker\ResourceHacker.exe
C:\Program Files\Resource Hacker\ResourceHacker.exe
C:\Program Files (x86)\Resource Hacker\ResourceHacker.exe
release\tools\resource-hacker\ResourceHacker.exe
```

也可以设置环境变量：

```powershell
$env:SCS_RESOURCE_HACKER_EXE = "C:\path\to\ResourceHacker.exe"
```

---

## 7. 必须通过的 Python import 验证

涉及绿色包、Python、rembg、postprocess 或打包的改动后，必须验证：

```powershell
.\release\SequenceCutoutStudio-Internal\app\resources\portable-root\tools\python\python.exe -c "import rembg; print('rembg ok')"

.\release\SequenceCutoutStudio-Internal\app\resources\portable-root\tools\python\python.exe -c "import onnxruntime; print('onnxruntime ok')"

.\release\SequenceCutoutStudio-Internal\app\resources\portable-root\tools\python\python.exe -c "import PIL, numpy; print('postprocess deps ok')"
```

`build-internal.ps1` 已经内置这三条验证。

---

## 8. zip 体积判断

当前合理 zip 体积约为：

```text
551 MB 到 554 MB
```

如果 zip 接近或超过 700 MB，应优先检查：

```text
tools/rembg/.venv
sample 输出目录
旧 zip
release 目录被嵌套
SequenceCutoutStudio-Internal 被重复打包
```

旧 `.venv` 不应进入最终发布包。

---

## 9. 长时间构建阻塞处理

本项目曾出现过：

```text
vite / esbuild
Error: spawn EPERM
```

遇到这种情况时，通常是执行环境权限或子进程启动问题。不要长时间等待，应直接按权限规则提升权限重跑必要阶段或完整脚本。

如果完整构建超过 5 到 10 分钟没有新输出，应检查当前进程和最后输出阶段，不要盲等。

如果组装阶段提示文件被占用，优先检查是否已有 `SequenceCutoutStudio` 或 Electron 进程仍在运行。

---

## 10. 构建后验收

每次重新打包后，至少验证：

```text
1. 双击 SequenceCutoutStudio-Internal.exe
2. launcher 启动画面出现
3. 主界面正常打开
4. 启动自检通过
5. 选择 sample_video.mp4
6. 视频切帧成功
7. 单帧测试成功
8. 完整批量处理成功
9. 只重跑边缘成功
10. 干净电脑打开 zip 验收
```

---

## 11. 不应提交到 Git 的内容

不要提交：

```text
portable-root/
release/
dist/
dist-electron/
node_modules/
*.zip
*_general_raw/
*_soft_*/
*_12fps_*/
```

这些内容是本地运行时、构建产物或样例输出，不属于源码基线。
