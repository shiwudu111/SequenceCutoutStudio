param(
    [string]$Version = "",
    [switch]$CheckOnly
)

$ErrorActionPreference = "Stop"
$script:BuildStopwatch = [System.Diagnostics.Stopwatch]::StartNew()
$script:StepStopwatch = [System.Diagnostics.Stopwatch]::StartNew()

function Write-Step {
    param([string]$Message)
    if ($script:StepStopwatch.Elapsed.TotalSeconds -gt 0.1) {
        Write-Host "Step elapsed: $([Math]::Round($script:StepStopwatch.Elapsed.TotalSeconds, 1))s"
    }
    $script:StepStopwatch.Restart()
    Write-Host ""
    Write-Host "==> $Message"
}

function Get-RepoRoot {
    $scriptDir = Split-Path -Parent $PSCommandPath
    return (Resolve-Path (Join-Path $scriptDir "..")).Path
}

function Assert-Exists {
    param(
        [string]$Path,
        [string]$Message
    )

    if (-not (Test-Path -LiteralPath $Path)) {
        throw "$Message Missing path: $Path"
    }
}

function Assert-NotExists {
    param(
        [string]$Path,
        [string]$Message
    )

    if (Test-Path -LiteralPath $Path) {
        throw "$Message Unexpected path: $Path"
    }
}

function Sync-RuntimeToolSources {
    param([string]$Root)

    $runtimeToolsDir = Join-Path $Root "runtime-tools"
    $portableToolsDir = Join-Path $Root "portable-root\tools"
    $postprocessTargetDir = Join-Path $portableToolsDir "postprocess"

    Assert-Exists -Path $runtimeToolsDir -Message "Runtime tool source directory was not found."
    Assert-Exists -Path $portableToolsDir -Message "Portable runtime tools directory was not found."

    $rembgRunnerSource = Join-Path $runtimeToolsDir "rembg_runner.py"
    $rembgRunnerTarget = Join-Path $portableToolsDir "rembg_runner.py"
    $postprocessSource = Join-Path $runtimeToolsDir "postprocess\batch_clean_cutout_soft.py"
    $postprocessTarget = Join-Path $postprocessTargetDir "batch_clean_cutout_soft.py"

    Assert-Exists -Path $rembgRunnerSource -Message "Tracked rembg runner source was not found."
    Assert-Exists -Path $postprocessSource -Message "Tracked postprocess source was not found."

    New-Item -ItemType Directory -Path $postprocessTargetDir -Force | Out-Null
    Copy-Item -LiteralPath $rembgRunnerSource -Destination $rembgRunnerTarget -Force
    Copy-Item -LiteralPath $postprocessSource -Destination $postprocessTarget -Force
    $animationSource = Join-Path $runtimeToolsDir "extract_animation.py"
    Assert-Exists -Path $animationSource -Message "GIF/WebP decoder source was not found."
    Copy-Item -LiteralPath $animationSource -Destination (Join-Path $portableToolsDir "extract_animation.py") -Force
}

function Wait-ForPath {
    param(
        [string]$Path,
        [int]$TimeoutSeconds = 30
    )

    $deadline = (Get-Date).AddSeconds($TimeoutSeconds)

    while ((Get-Date) -lt $deadline) {
        if (Test-Path -LiteralPath $Path) {
            return
        }

        Start-Sleep -Milliseconds 250
    }

    throw "Timed out waiting for path: $Path"
}

function Move-WithRetry {
    param(
        [string]$Source,
        [string]$Destination,
        [int]$Attempts = 10
    )

    Assert-ReleasePath -Path $Source
    Assert-ReleasePath -Path $Destination
    for ($attempt = 1; $attempt -le $Attempts; $attempt++) {
        try {
            Move-Item -LiteralPath $Source -Destination $Destination -Force
            return
        }
        catch {
            if ($attempt -eq $Attempts) {
                throw
            }

            Start-Sleep -Milliseconds 500
        }
    }
}

function Get-IcoEntries {
    param([string]$Path)

    $bytes = [System.IO.File]::ReadAllBytes($Path)
    $count = [BitConverter]::ToUInt16($bytes, 4)
    $entries = @()

    for ($i = 0; $i -lt $count; $i++) {
        $offset = 6 + ($i * 16)
        $width = $bytes[$offset]
        if ($width -eq 0) {
            $width = 256
        }

        $dataSize = [BitConverter]::ToUInt32($bytes, $offset + 8)
        $dataOffset = [BitConverter]::ToUInt32($bytes, $offset + 12)
        $signature = [System.Text.Encoding]::ASCII.GetString($bytes, [int]$dataOffset + 1, 3)
        $format = "DIB"
        if ($signature -eq "PNG") {
            $format = "PNG"
        }

        $entries += [PSCustomObject]@{
            Size = $width
            Bytes = $dataSize
            Format = $format
        }
    }

    return $entries
}

function Assert-LauncherIconSource {
    param([string]$Path)

    $entries = Get-IcoEntries -Path $Path
    $requiredSizes = @(16, 24, 32, 40, 48, 64, 96, 128, 256)

    foreach ($size in $requiredSizes) {
        $entry = $entries | Where-Object { $_.Size -eq $size } | Select-Object -First 1
        if (-not $entry) {
            throw "Launcher icon is missing ${size}px entry: $Path"
        }

        if ($entry.Format -ne "PNG") {
            throw "Launcher icon ${size}px entry must be PNG to avoid Explorer using blurry DIB entries: $Path"
        }
    }
}

function Assert-LauncherExeIcon {
    param([string]$Path)

    Add-Type -TypeDefinition @'
using System;
using System.Runtime.InteropServices;
public static class ScsIconVerifier {
  [DllImport("user32.dll", CharSet = CharSet.Unicode)]
  public static extern int PrivateExtractIcons(string szFileName, int nIconIndex, int cxIcon, int cyIcon, IntPtr[] phicon, int[] piconid, int nIcons, int flags);
  [DllImport("user32.dll")]
  public static extern bool DestroyIcon(IntPtr hIcon);
}
'@ -ErrorAction SilentlyContinue
    Add-Type -AssemblyName System.Drawing

    foreach ($index in @(0, 1)) {
        foreach ($size in @(48, 64, 256)) {
            $handles = New-Object IntPtr[] 1
            $ids = New-Object int[] 1
            $count = [ScsIconVerifier]::PrivateExtractIcons($Path, $index, $size, $size, $handles, $ids, 1, 0)

            if ($count -le 0 -or $handles[0] -eq [IntPtr]::Zero) {
                throw "Launcher exe icon extraction failed for icon index $index at ${size}px: $Path"
            }

            $icon = [System.Drawing.Icon]::FromHandle($handles[0])
            try {
                if ($icon.Width -ne $size -or $icon.Height -ne $size) {
                    throw "Launcher exe icon index $index returned $($icon.Width)x$($icon.Height), expected ${size}x${size}: $Path"
                }
            }
            finally {
                $icon.Dispose()
                [ScsIconVerifier]::DestroyIcon($handles[0]) | Out-Null
            }
        }
    }
}

function Refresh-ShellIconCache {
    param([string]$Path)

    Add-Type -TypeDefinition @'
using System;
using System.Runtime.InteropServices;
public static class ScsShellNotify {
  [DllImport("shell32.dll", CharSet = CharSet.Unicode)]
  public static extern void SHChangeNotify(int wEventId, uint uFlags, string dwItem1, string dwItem2);
}
'@ -ErrorAction SilentlyContinue

    $SHCNE_UPDATEITEM = 0x00002000
    $SHCNE_ASSOCCHANGED = 0x08000000
    $SHCNF_PATHW = 0x0005
    $SHCNF_IDLIST = 0x0000

    $directory = Split-Path -Parent $Path
    [ScsShellNotify]::SHChangeNotify($SHCNE_UPDATEITEM, $SHCNF_PATHW, $Path, $null)
    [ScsShellNotify]::SHChangeNotify($SHCNE_UPDATEITEM, $SHCNF_PATHW, $directory, $null)
    [ScsShellNotify]::SHChangeNotify($SHCNE_ASSOCCHANGED, $SHCNF_IDLIST, $null, $null)

    $ie4uinit = Join-Path $env:WINDIR "System32\ie4uinit.exe"
    if (Test-Path -LiteralPath $ie4uinit) {
        & $ie4uinit -ClearIconCache
        & $ie4uinit -show
    }
}

function Invoke-CommandChecked {
    param(
        [string]$FilePath,
        [string[]]$Arguments,
        [string]$WorkingDirectory
    )

    Write-Host "> $FilePath $($Arguments -join ' ')"
    & $FilePath @Arguments
    if ($LASTEXITCODE -ne 0) {
        throw "Command failed with exit code $LASTEXITCODE`: $FilePath $($Arguments -join ' ')"
    }
}

function Find-Csc {
    $candidates = @()

    try {
        $runtimeDir = [System.Runtime.InteropServices.RuntimeEnvironment]::GetRuntimeDirectory()
        if ($runtimeDir) {
            $candidates += (Join-Path $runtimeDir "csc.exe")
        }
    }
    catch {
    }

    $candidates += @(
        (Join-Path $env:WINDIR "Microsoft.NET\Framework64\v4.0.30319\csc.exe"),
        (Join-Path $env:WINDIR "Microsoft.NET\Framework\v4.0.30319\csc.exe")
    )

    foreach ($candidate in $candidates) {
        if (Test-Path -LiteralPath $candidate) {
            return (Resolve-Path -LiteralPath $candidate).Path
        }
    }

    throw "Could not find .NET Framework csc.exe."
}

function Find-ResourceHacker {
    $candidates = @()

    if ($env:SCS_RESOURCE_HACKER_EXE) {
        $candidates += $env:SCS_RESOURCE_HACKER_EXE
    }

    $candidates += @(
        (Join-Path $env:LOCALAPPDATA "electron-builder\Cache\winCodeSign\winCodeSign-2.6.0\ResourceHacker.exe"),
        (Join-Path $env:LOCALAPPDATA "Programs\Resource Hacker\ResourceHacker.exe"),
        "C:\Program Files\Resource Hacker\ResourceHacker.exe",
        "C:\Program Files (x86)\Resource Hacker\ResourceHacker.exe",
        (Join-Path (Get-RepoRoot) "release\tools\resource-hacker\ResourceHacker.exe")
    )

    foreach ($candidate in $candidates) {
        if ($candidate -and (Test-Path -LiteralPath $candidate)) {
            return (Resolve-Path -LiteralPath $candidate).Path
        }
    }

    throw "Could not find ResourceHacker.exe. Set SCS_RESOURCE_HACKER_EXE or place it at release\tools\resource-hacker\ResourceHacker.exe."
}

function Assert-ReleasePath {
    param([string]$Path)

    $boundary = [IO.Path]::GetFullPath((Join-Path (Get-RepoRoot) "release")).TrimEnd('\')
    $target = [IO.Path]::GetFullPath($Path)
    if (-not $target.StartsWith($boundary + '\', [StringComparison]::OrdinalIgnoreCase)) {
        throw "Refusing to modify a path outside release: $target"
    }
    $current = $target
    while ($current -and $current.Length -ge $boundary.Length) {
        if (Test-Path -LiteralPath $current) {
            $item = Get-Item -LiteralPath $current -Force
            if ($item.Attributes -band [IO.FileAttributes]::ReparsePoint) {
                throw "Refusing to modify a linked release path: $current"
            }
        }
        $current = Split-Path -Parent $current
    }
}

function Remove-IfExists {
    param([string]$Path)

    if (Test-Path -LiteralPath $Path) {
        Write-Host "Removing $Path"
        Assert-ReleasePath -Path $Path
        Remove-Item -LiteralPath $Path -Recurse -Force
    }
}

function Remove-SampleOutputs {
    param([string]$Root)

    $sampleRoots = @(
        (Join-Path $Root "portable-root\samples"),
        (Join-Path $Root "samples"),
        (Join-Path $Root "public\samples")
    )

    $patterns = @("*_12fps_*", "*_general_raw", "*_soft_*")

    foreach ($sampleRoot in $sampleRoots) {
        if (-not (Test-Path -LiteralPath $sampleRoot)) {
            continue
        }

        foreach ($pattern in $patterns) {
            Get-ChildItem -LiteralPath $sampleRoot -Directory -Recurse -Filter $pattern -ErrorAction SilentlyContinue |
                ForEach-Object {
                    Write-Host "Removing sample output $($_.FullName)"
                    Remove-IfExists -Path $_.FullName
                }
        }
    }
}

function Keep-OnlySampleVideo {
    param([string]$Root)

    $sampleRoot = Join-Path $Root "portable-root\samples"

    if (-not (Test-Path -LiteralPath $sampleRoot)) {
        return
    }

    Get-ChildItem -LiteralPath $sampleRoot -Force |
        Where-Object { $_.Name -ne "sample_video.mp4" } |
        ForEach-Object {
            Write-Host "Removing sample extra $($_.FullName)"
            Remove-IfExists -Path $_.FullName
        }
}

function Copy-ReleaseUserDocs {
    param(
        [string]$Root,
        [string]$InternalDir
    )

    # Keep this script ASCII-compatible with Windows PowerShell 5.1 without a BOM.
    $quickstartName = (-join [char[]]@(0x5FEB, 0x901F, 0x4F7F, 0x7528, 0x8BF4, 0x660E)) + ".md"
    $quickstartSource = Join-Path (Join-Path $Root "docs") $quickstartName
    $quickstartTarget = Join-Path $InternalDir $quickstartName

    Assert-Exists -Path $quickstartSource -Message "User quickstart document was not found."
    Copy-Item -LiteralPath $quickstartSource -Destination $quickstartTarget -Force
}

function Compress-InternalPackage {
    param(
        [string]$SourceDir,
        [string]$ZipPath
    )

    Assert-ReleasePath -Path $ZipPath
    Assert-NotExists -Path $ZipPath -Message "Refusing to replace an existing zip."

    Add-Type -AssemblyName System.IO.Compression.FileSystem
    [System.IO.Compression.ZipFile]::CreateFromDirectory(
        $SourceDir,
        $ZipPath,
        [System.IO.Compression.CompressionLevel]::Optimal,
        $true
    )
}

$root = Get-RepoRoot
Set-Location -LiteralPath $root

$packageJsonPath = Join-Path $root "package.json"
Assert-Exists -Path $packageJsonPath -Message "package.json was not found."
$packageJson = Get-Content -LiteralPath $packageJsonPath -Raw -Encoding UTF8 | ConvertFrom-Json
if (-not $Version) {
    $Version = $packageJson.version
}
if ($Version -notmatch '^\d+\.\d+\.\d+(?:-[0-9A-Za-z.-]+)?(?:\+[0-9A-Za-z.-]+)?$' -or $Version -ne $packageJson.version) {
    throw "Version must match package.json and be a valid release version. Update package.json first."
}

$releaseDir = Join-Path $root "release"
$winUnpackedDir = Join-Path $releaseDir "win-unpacked"
$internalDir = Join-Path $releaseDir "SequenceCutoutStudio-Internal"
$internalAppDir = Join-Path $internalDir "app"
$launcherSource = Join-Path $root "launcher\SequenceCutoutStudioLauncher.cs"
$iconPath = Join-Path $root "build\icon.ico"
$splashPath = Join-Path $root "build\splash.bmp"
$launcherOutput = Join-Path $internalDir "SequenceCutoutStudio-Internal.exe"
$zipPath = Join-Path $releaseDir "SequenceCutoutStudio-Internal-v$Version-win-x64.zip"
$buildId = Get-Date -Format 'yyyyMMdd-HHmmss-fff'
if (Test-Path -LiteralPath $zipPath) {
    $zipPath = Join-Path $releaseDir "SequenceCutoutStudio-Internal-v$Version-win-x64-$buildId.zip"
}
$logPath = Join-Path $releaseDir "build-internal-$buildId.log"
$resultPath = Join-Path $releaseDir "build-internal-$buildId.json"

Write-Step "Checking build prerequisites (no packaging yet)"
$npm = (Get-Command npm.cmd -ErrorAction Stop).Source
$builder = Join-Path $root "node_modules\.bin\electron-builder.cmd"
$tsc = Join-Path $root "node_modules\.bin\tsc.cmd"
$csc = Find-Csc
$resourceHacker = Find-ResourceHacker
$quickstartName = (-join [char[]]@(0x5FEB, 0x901F, 0x4F7F, 0x7528, 0x8BF4, 0x660E)) + ".md"
foreach ($required in @($builder, $tsc, $launcherSource, $iconPath, $splashPath,
    (Join-Path $root "docs\$quickstartName"),
    (Join-Path $root "runtime-tools\extract_animation.py"),
    (Join-Path $root "runtime-tools\rembg_runner.py"),
    (Join-Path $root "runtime-tools\postprocess\batch_clean_cutout_soft.py"),
    (Join-Path $root "portable-root\tools\python\python.exe"),
    (Join-Path $root "portable-root\tools\Lib\site-packages\rembg"),
    (Join-Path $root "portable-root\tools\Lib\site-packages\onnxruntime"),
    (Join-Path $root "portable-root\tools\Lib\site-packages\PIL"),
    (Join-Path $root "portable-root\tools\Lib\site-packages\numpy"),
    (Join-Path $root "portable-root\tools\models\isnet-general-use.onnx"),
    (Join-Path $root "portable-root\tools\ffmpeg\ffmpeg.exe"),
    (Join-Path $root "portable-root\tools\pyvenv.cfg"))) {
    Assert-Exists -Path $required -Message "Build prerequisite was not found."
}
Assert-LauncherIconSource -Path $iconPath
Assert-ReleasePath -Path $internalDir
Assert-ReleasePath -Path $winUnpackedDir
Assert-ReleasePath -Path $zipPath
Write-Host "Version: $Version"
Write-Host "Zip target: $zipPath"
if ($CheckOnly) {
    Write-Host "Prerequisites passed. No build, cleanup or packaging was performed."
    return
}

New-Item -ItemType Directory -Path $releaseDir -Force | Out-Null
Start-Transcript -Path $logPath -Force | Out-Null

try {

Write-Step "Syncing tracked runtime tool scripts"
Sync-RuntimeToolSources -Root $root

Write-Step "Building renderer and Electron main process"
Invoke-CommandChecked -FilePath $tsc -Arguments @("--noEmit") -WorkingDirectory $root
Invoke-CommandChecked -FilePath $npm -Arguments @("run", "build") -WorkingDirectory $root

Write-Step "Running electron-builder dir target"
Invoke-CommandChecked -FilePath $builder -Arguments @("--win", "dir") -WorkingDirectory $root

Write-Step "Cleaning legacy rembg runtime from win-unpacked"
$legacyVenv = Join-Path $winUnpackedDir "resources\portable-root\tools\rembg\.venv"
$legacyRembgDir = Join-Path $winUnpackedDir "resources\portable-root\tools\rembg"
Remove-IfExists -Path $legacyVenv
Remove-IfExists -Path $legacyRembgDir

Write-Step "Cleaning sample output directories"
Remove-SampleOutputs -Root (Join-Path $winUnpackedDir "resources")
Keep-OnlySampleVideo -Root (Join-Path $winUnpackedDir "resources")

Write-Step "Assembling internal green package"
Remove-IfExists -Path $internalDir
New-Item -ItemType Directory -Path $internalAppDir -Force | Out-Null
Assert-Exists -Path $winUnpackedDir -Message "electron-builder output was not found."
Copy-Item -Path (Join-Path $winUnpackedDir "*") -Destination $internalAppDir -Recurse -Force

Write-Step "Copying release user documents"
Copy-ReleaseUserDocs -Root $root -InternalDir $internalDir

Write-Step "Compiling launcher"
Assert-Exists -Path $launcherSource -Message "Launcher source was not found."
Assert-Exists -Path $iconPath -Message "Launcher icon was not found."
Assert-Exists -Path $splashPath -Message "Launcher splash image was not found."
Assert-LauncherIconSource -Path $iconPath

$csc = Find-Csc
$cscArgs = @(
    "/nologo",
    "/target:winexe",
    "/platform:x86",
    "/out:$launcherOutput",
    "/win32icon:$iconPath",
    "/resource:$iconPath,LauncherIcon",
    "/resource:$splashPath,SplashBmp",
    "/reference:System.dll",
    "/reference:System.Drawing.dll",
    "/reference:System.Windows.Forms.dll",
    $launcherSource
)
Invoke-CommandChecked -FilePath $csc -Arguments $cscArgs -WorkingDirectory $root

Write-Step "Replacing launcher Win32 icon resource"
$resourceHacker = Find-ResourceHacker
$resourceHackerOutput = "$launcherOutput.rh.exe"
Remove-IfExists -Path $resourceHackerOutput
$resourceHackerArgs = @(
    "-open",
    $launcherOutput,
    "-save",
    $resourceHackerOutput,
    "-action",
    "addoverwrite",
    "-res",
    $iconPath,
    "-mask",
    "ICONGROUP,MAINICON,0"
)
Invoke-CommandChecked -FilePath $resourceHacker -Arguments $resourceHackerArgs -WorkingDirectory $root
Wait-ForPath -Path $resourceHackerOutput -TimeoutSeconds 30
Move-WithRetry -Source $resourceHackerOutput -Destination $launcherOutput

Remove-IfExists -Path $resourceHackerOutput
$resourceHackerArgs = @(
    "-open",
    $launcherOutput,
    "-save",
    $resourceHackerOutput,
    "-action",
    "addoverwrite",
    "-res",
    $iconPath,
    "-mask",
    "ICONGROUP,32512,0"
)
Invoke-CommandChecked -FilePath $resourceHacker -Arguments $resourceHackerArgs -WorkingDirectory $root
Wait-ForPath -Path $resourceHackerOutput -TimeoutSeconds 30
Move-WithRetry -Source $resourceHackerOutput -Destination $launcherOutput
Assert-LauncherExeIcon -Path $launcherOutput
(Get-Item -LiteralPath $launcherOutput).LastWriteTime = Get-Date
Refresh-ShellIconCache -Path $launcherOutput

Write-Step "Validating portable runtime layout"
$finalRoot = Join-Path $internalAppDir "resources\portable-root"
$pythonExe = Join-Path $finalRoot "tools\python\python.exe"
$requiredPaths = @(
    $pythonExe,
    (Join-Path $finalRoot "tools\rembg_runner.py"),
    (Join-Path $finalRoot "tools\extract_animation.py"),
    (Join-Path $finalRoot "tools\models\isnet-general-use.onnx"),
    (Join-Path $finalRoot "tools\ffmpeg\ffmpeg.exe"),
    (Join-Path $finalRoot "tools\pyvenv.cfg"),
    (Join-Path $finalRoot "tools\postprocess\batch_clean_cutout_soft.py"),
    (Join-Path $finalRoot "tools\Lib\site-packages\rembg"),
    (Join-Path $finalRoot "tools\Lib\site-packages\onnxruntime"),
    (Join-Path $finalRoot "tools\Lib\site-packages\PIL"),
    (Join-Path $finalRoot "tools\Lib\site-packages\numpy")
)

foreach ($path in $requiredPaths) {
    Assert-Exists -Path $path -Message "Required runtime file or directory was not found."
}

Assert-NotExists -Path (Join-Path $finalRoot "tools\rembg\.venv") -Message "Legacy rembg .venv must not be included."

Write-Step "Running portable Python import checks"
Invoke-CommandChecked -FilePath $pythonExe -Arguments @("-c", "import rembg; print('rembg ok')") -WorkingDirectory $root
Invoke-CommandChecked -FilePath $pythonExe -Arguments @("-c", "import onnxruntime; print('onnxruntime ok')") -WorkingDirectory $root
Invoke-CommandChecked -FilePath $pythonExe -Arguments @("-c", "import PIL, numpy; print('postprocess deps ok')") -WorkingDirectory $root
Invoke-CommandChecked -FilePath $pythonExe -Arguments @("-c", "from PIL import features; assert features.check('webp'), 'Pillow WebP support missing'; print('webp support ok')") -WorkingDirectory $root

Write-Step "Creating zip package"
Compress-InternalPackage -SourceDir $internalDir -ZipPath $zipPath

$zip = Get-Item -LiteralPath $zipPath
$zipSizeMb = [Math]::Round($zip.Length / 1MB, 2)
$summary = [ordered]@{
    status = 'success'
    version = $Version
    finishedAt = (Get-Date).ToString('o')
    elapsedSeconds = [Math]::Round($script:BuildStopwatch.Elapsed.TotalSeconds, 1)
    packageDirectory = $internalDir
    zipPath = $zipPath
    zipBytes = $zip.Length
    zipSizeMB = $zipSizeMb
    sha256 = (Get-FileHash -LiteralPath $zipPath -Algorithm SHA256).Hash
    logPath = $logPath
    checks = @('typescript', 'build', 'launcher-icons', 'runtime-layout', 'rembg', 'onnxruntime', 'PIL-numpy', 'webp')
    manualAcceptance = 'pending: launcher GUI, full workflow and clean PC'
}
$summary | ConvertTo-Json -Depth 4 | Set-Content -LiteralPath $resultPath -Encoding UTF8
Write-Host ""
Write-Host "Zip created: $zipPath"
Write-Host "Zip size: $zipSizeMb MB"

if ($zipSizeMb -gt 700) {
    Write-Warning "Zip is larger than 700 MB. Check for legacy tools/rembg/.venv, sample output directories, old zips, nested release folders, or other stale build artifacts."
}

Write-Host ""
Write-Host "Total elapsed: $([Math]::Round($script:BuildStopwatch.Elapsed.TotalSeconds, 1))s"
Write-Host "Build log: $logPath"
Write-Host "Build summary: $resultPath"
Write-Host "Internal package build completed."
}
catch {
    [ordered]@{
        status = 'failed'
        version = $Version
        failedAt = (Get-Date).ToString('o')
        error = $_.Exception.Message
        logPath = $logPath
    } | ConvertTo-Json | Set-Content -LiteralPath $resultPath -Encoding UTF8
    throw
}
finally {
    Stop-Transcript | Out-Null
}
