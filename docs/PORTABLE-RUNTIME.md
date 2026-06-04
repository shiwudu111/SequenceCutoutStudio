# Sequence Cutout Studio Portable Runtime 说明

本文档记录当前已经在绿色包和干净电脑上通过验证的 portable Python / rembg 运行时结构。

当前稳定结论：

```text
[x] portable Python 可跨电脑运行
[x] rembg import 通过
[x] onnxruntime import 通过
[x] PIL / numpy import 通过
[x] Electron 调用 rembg_runner.py 链路通过
[x] 旧 .venv 未进入发布包
[x] 干净电脑验收通过
```

---

## 1. 正确运行链路

当前正确链路是：

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

后续开发不能破坏这条链路。

---

## 2. 发布包中的运行时位置

最终绿色包中的运行时根目录：

```text
SequenceCutoutStudio-Internal/app/resources/portable-root/
```

关键文件和目录：

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

注意：Python 依赖实际位于：

```text
tools/Lib/site-packages
```

不是：

```text
tools/python/Lib/site-packages
```

因此运行时的 `PYTHONPATH` 应指向：

```text
tools/Lib/site-packages
```

---

## 3. 禁止恢复的旧方案

旧方案已经确认不适合作为绿色运行时：

```text
portable-root/tools/rembg/.venv
portable-root/tools/rembg/.venv/Scripts/python.exe
portable-root/tools/rembg/.venv/Scripts/rembg.exe
```

失败原因：

```text
Windows .venv 内部会记录开发电脑上的绝对 Python 路径。
换到干净电脑后，容易出现 No Python at ... 或 rembg 启动失败。
```

后续禁止恢复或依赖：

```text
tools/rembg/.venv
.venv/Scripts/python.exe
.venv/Scripts/rembg.exe
rembg.exe
python -m rembg
```

当前 rembg 版本也不应通过 `python -m rembg` 调用。

---

## 4. Electron 调用规则

Electron 主进程调用自动去背景时，必须走：

```text
tools/python/python.exe tools/rembg_runner.py
```

不要直接调用：

```text
rembg.exe
python -m rembg
.venv/Scripts/python.exe
.venv/Scripts/rembg.exe
```

面向普通用户的界面文案应使用：

```text
自动去背景
修边
Raw 初步结果
Soft 修边结果
单帧测试
批量处理
只重跑边缘
```

不要在普通主流程中暴露：

```text
onnxruntime
site-packages
Python venv
spawn
Electron resourcesPath
```

这些内容只应出现在开发文档或日志排查中。

---

## 5. 构建时清理规则

打包后必须清理：

```text
release/win-unpacked/resources/portable-root/tools/rembg/.venv
release/win-unpacked/resources/portable-root/tools/rembg
```

当前 `scripts/build-internal.ps1` 已经自动执行这一步。

最终发布包中不应包含：

```text
app/resources/portable-root/tools/rembg/.venv
app/resources/portable-root/tools/rembg
```

---

## 6. 必须验证的 import

涉及绿色包、运行时、Python、rembg、postprocess 或打包的改动后，必须验证：

```powershell
.\release\SequenceCutoutStudio-Internal\app\resources\portable-root\tools\python\python.exe -c "import rembg; print('rembg ok')"

.\release\SequenceCutoutStudio-Internal\app\resources\portable-root\tools\python\python.exe -c "import onnxruntime; print('onnxruntime ok')"

.\release\SequenceCutoutStudio-Internal\app\resources\portable-root\tools\python\python.exe -c "import PIL, numpy; print('postprocess deps ok')"
```

预期输出：

```text
rembg ok
onnxruntime ok
postprocess deps ok
```

---

## 7. 常见故障排查

如果出现：

```text
No Python at ...
Fatal error in launcher: Unable to create process using ...
rembg 单帧抠图失败
rembg 批量抠图失败
```

优先检查是否有人恢复了旧 `.venv` 方案：

```text
tools/rembg/.venv
.venv/Scripts/python.exe
.venv/Scripts/rembg.exe
```

然后检查：

```text
tools/python/python.exe 是否存在
tools/rembg_runner.py 是否存在
tools/Lib/site-packages/rembg 是否存在
tools/Lib/site-packages/onnxruntime 是否存在
tools/models/isnet-general-use.onnx 是否存在
PYTHONPATH 是否指向 tools/Lib/site-packages
```

---

## 8. zip 体积与运行时关系

当前已验证合理 zip 体积约为：

```text
551 MB 到 554 MB
```

如果包体明显变大，尤其接近 800 MB，应优先检查：

```text
是否错误包含 tools/rembg/.venv
是否错误包含 sample 输出目录
是否把 release 目录嵌套进包内
是否重复包含 SequenceCutoutStudio-Internal
```

旧 `.venv` 会显著增大包体，并且不是当前运行链路需要的内容。

---

## 9. 运行时源码保存建议

`portable-root/` 不进入 Git。

如果需要保存可追踪的运行时脚本源码，应放在源码目录，例如：

```text
runtime-tools/rembg_runner.py
runtime-tools/postprocess/batch_clean_cutout_soft.py
```

构建时再复制到：

```text
portable-root/tools/rembg_runner.py
portable-root/tools/postprocess/batch_clean_cutout_soft.py
```

不要为了保存脚本而提交完整 `portable-root/`。
