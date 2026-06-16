# Phase 6H GUI 手工复核记录

日期：2026-06-16

## 目标

在正式候选绿色包归档前，用真实 GUI 操作确认软件主流程可用。

## 复核对象

```text
release/SequenceCutoutStudio-Internal
release/SequenceCutoutStudio-Internal-v0.4.0-internal.1-win-x64.zip
```

## GUI 复核结论

```text
[x] 顶层 launcher 能出现，并能进入主界面。
[x] 左侧环境自检通过。
[x] 主流程通过：
    选择视频 -> 切序列帧 -> 单帧测试 -> 批量处理 -> 质量验收 -> 导出 PNG。
[x] 导出目录正确。
[x] 导出 PNG 数量正确。
[x] manifest.json 正确生成。
```

## 代表样本复核

样本来源：

```text
E:\cuts\test
```

复核结果：

```text
[x] 01白底角色
    切帧通过。
    单帧测试通过。
    批量处理通过。
    质量验收通过。
    导出通过。

[x] 04简单背景
    切帧通过。
    单帧测试通过。
    批量处理通过。
    质量验收通过。
    导出通过。

[x] 10发光法术
    切帧通过。
    单帧测试通过。
    批量处理通过。
    质量验收正确提示疑似问题帧。

[x] 14遮挡旋转
    切帧通过。
    单帧测试通过。
    批量处理通过。
    质量验收正确提示疑似问题帧。
```

## 导出复核

GUI 日志中确认导出了透明 PNG 序列，并生成了 `manifest.json`。

日志中可识别的导出目录示例：

```text
E:\cuts\test\exports\01白底角色_12fps_4s_transparent_png_20260616_142745
E:\cuts\test\exports\04简单背景_12fps_4s_transparent_png_20260616_143030
```

导出 PNG 数量和预期序列数量一致。

## 图标问题归档

launcher 图标资源已经确认正确。

资源管理器里图标模糊的问题已经确认是 Windows Explorer 图标 / 缩略图缓存导致。运行以下脚本后，同一个最终 exe 图标恢复清晰：

```powershell
.\scripts\clear-explorer-icon-cache.ps1 -TargetPath ".\release\SequenceCutoutStudio-Internal\SequenceCutoutStudio-Internal.exe" -Full
```

图标问题归因记录：

```text
docs/ICON-CACHE-ROOT-CAUSE.md
```

## 日志说明

用户粘贴的 GUI 日志存在控制台编码乱码，但主流程事件、路径、数量、质量验收结果、导出目录和 manifest 路径都能识别，并且与用户的人工复核结论一致。

## 本轮边界

```text
不改模型。
不改默认参数。
不改 rembg / portable Python / postprocess 处理链路。
不恢复 .venv。
不调用 rembg.exe。
不新增功能范围。
```

## 最终结论

```text
Phase 6H GUI 手工复核通过。
正式候选绿色包可以进入发布归档 / 最终提交前检查。
```
