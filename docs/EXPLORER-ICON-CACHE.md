# Explorer Icon Cache Check

当 Windows 资源管理器里的 exe 图标显示不清晰时，先清理 Explorer 图标缓存，排除本机缓存 / 缩放干扰，再判断是否是图标资源问题。

温和刷新，不关闭资源管理器：

```powershell
.\scripts\clear-explorer-icon-cache.ps1 -TargetPath ".\release\SequenceCutoutStudio-Internal\SequenceCutoutStudio-Internal.exe"
```

完整清理，会关闭并重新启动 Windows Explorer，同时删除本机 iconcache / thumbcache 数据库：

```powershell
.\scripts\clear-explorer-icon-cache.ps1 -TargetPath ".\release\SequenceCutoutStudio-Internal\SequenceCutoutStudio-Internal.exe" -Full
```

完整清理只用于排除资源管理器缓存问题，不代表重新生成图标资源。

图标资源是否正确，应以两类验证为准：

- `build/icon.ico` 分层校验。
- 最终 `SequenceCutoutStudio-Internal.exe` 图标提取校验。

本次图标模糊问题的归因记录见：

```text
docs/ICON-CACHE-ROOT-CAUSE.md
```

最终实证结论：清理 Explorer 图标缓存后，同一个最终 exe 图标恢复清晰。
