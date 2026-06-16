# Launcher Icon Blur Root Cause

## Final Conclusion

The launcher icon resource is correct.

The blurry icon seen in Windows Explorer was caused by Explorer icon / thumbnail cache, not by the source image, zip compression, or the final exe icon resource.

After running the Explorer icon cache cleanup script, the same final package icon became clear.

## What Happened

During repeated internal builds, the top-level launcher exe kept the same path and file name:

```text
release/SequenceCutoutStudio-Internal/SequenceCutoutStudio-Internal.exe
```

Windows Explorer reused an old or low-quality cached rendering of that exe icon. This made the launcher look blurry even after the icon resource inside the exe had already been fixed.

This was confusing because:

- `.png` and `.ico` files displayed clearly.
- The `.exe` file displayed blurry.
- Rebuilding the package did not always force Explorer to refresh its cached icon.

## Confirmed Evidence

The issue was narrowed down through these checks:

- `build/icon.ico` contained the expected icon layers.
- The final `SequenceCutoutStudio-Internal.exe` could be extracted and verified with clear 48 / 64 / 256 icon layers.
- Windows Shell extraction returned clear icon images from the final exe.
- Windows Explorer still showed a blurry icon before cache cleanup.
- After running the cache cleanup script, Explorer displayed the same exe icon clearly.

Therefore, the real root cause was Explorer cache, not the packaged icon resource.

## What Was Not The Cause

Do not treat these as the root cause for this confirmed issue:

- The source image resolution.
- The 583x583 icon source being too small.
- Zip compression.
- The launcher exe failing to embed the icon.
- rembg / Python / Electron runtime.
- A need to sharpen low-quality icon layers.
- A need to switch to an unrelated character image.

## Fix

Use the cache cleanup script when Explorer displays the exe icon unclearly:

```powershell
.\scripts\clear-explorer-icon-cache.ps1 -TargetPath ".\release\SequenceCutoutStudio-Internal\SequenceCutoutStudio-Internal.exe"
```

If the soft refresh is not enough, run full cleanup:

```powershell
.\scripts\clear-explorer-icon-cache.ps1 -TargetPath ".\release\SequenceCutoutStudio-Internal\SequenceCutoutStudio-Internal.exe" -Full
```

`-Full` restarts Windows Explorer and removes local `iconcache` / `thumbcache` database files.

## Future Rule

When the launcher icon looks blurry in Explorer:

1. First run the cache cleanup script.
2. Then check the final exe icon extraction.
3. Only regenerate icon assets if extraction proves the exe resource is actually wrong.

Do not immediately change the source image, sharpen the icon, or rebuild unrelated package logic.
