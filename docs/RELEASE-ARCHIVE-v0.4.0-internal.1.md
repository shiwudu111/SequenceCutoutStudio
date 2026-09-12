# Release Archive: v0.4.0-internal.1

日期：2026-06-16

## 候选包

```text
release/SequenceCutoutStudio-Internal-v0.4.0-internal.1-win-x64.zip
```

归档信息：

```text
版本：0.4.0-internal.1
平台：Windows x64
形态：绿色 zip + 顶层 C# launcher
大小：579,606,898 bytes / 552.76 MiB
构建完成时间：2026-06-16 10:16:45
发布分支：main
候选分支：codex/build-internal-script
```

## 已归档验证

```text
[x] GUI 手工复核记录：docs/PHASE-6H-GUI-VERIFICATION.md
[x] 图标缓存归因：docs/ICON-CACHE-ROOT-CAUSE.md
[x] 发布说明：docs/INTERNAL-RELEASE.md
[x] 短版随包说明：docs/快速使用说明.md
[x] 用户使用指南：docs/USER-GUIDE.md
[x] 素材质量指南：docs/QUALITY-GUIDE.md
[x] 反馈模板：docs/INTERNAL-FEEDBACK.md
[x] 发布物料建议：docs/LAUNCH-MATERIALS.md
[x] changelog：docs/CHANGELOG-v0.4.0-internal.1.md
```

## GUI 复核结论

Phase 6H 手工复核已通过：

```text
顶层 launcher 能出现并进入主界面。
环境自检通过。
视频切帧、单帧测试、批量处理、质量验收、导出 PNG 主流程通过。
导出目录、PNG 数量和 manifest.json 生成结果正确。
```

代表样本覆盖：

```text
01白底角色
04简单背景
10发光法术
14遮挡旋转
```

其中 10 / 14 的质量验收能正确提示疑似问题帧。

## 图标缓存结论

launcher 图标资源本身正确。资源管理器里看到的模糊图标已经确认为 Windows Explorer 图标 / 缩略图缓存问题，不是 zip、exe 资源或源图问题。

需要刷新时运行：

```powershell
.\scripts\clear-explorer-icon-cache.ps1 -TargetPath ".\release\SequenceCutoutStudio-Internal\SequenceCutoutStudio-Internal.exe" -Full
```

## 发布判断

当前版本可以进入首批小范围内测：

```text
建议先发给 3-5 个真实用户测试。
先收集真实素材、路径、机器环境和反馈日志。
不要立即大范围宣传。
不要高调宣传“全自动高质量去背景”。
```

推荐对外口径：

```text
本地运行的游戏序列帧透明化处理工具。
适合主体明确、背景相对简单、主体与背景区分明显的素材。
支持视频切帧、单帧测试、批量处理、Raw / Soft 预览、质量验收和透明 PNG 序列导出。
```

需要明确边界：

```text
低对比、毛发、半透明、复杂光效、复杂背景和强运动模糊素材仍需要人工检查。
质量验收用于提示疑似问题帧，不是自动修图或质量保证。
Sprite Sheet / plist / TexturePacker JSON 不在当前版本范围内。
```
