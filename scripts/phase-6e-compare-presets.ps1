param(
    [string]$TestRoot = "E:\cuts\test",
    [string]$OutputRoot = "release\phase-6e-2-preset-compare",
    [string[]]$SampleIds = @("04", "07", "09", "10", "12"),
    [string]$PythonExe = "portable-root\tools\python\python.exe",
    [string]$PostprocessScript = "runtime-tools\postprocess\batch_clean_cutout_soft.py"
)

$ErrorActionPreference = "Stop"

function Resolve-RepoPath {
    param([string]$PathValue)

    if ([System.IO.Path]::IsPathRooted($PathValue)) {
        return $PathValue
    }

    return Join-Path (Get-Location) $PathValue
}

function Find-SampleDir {
    param(
        [string]$Root,
        [string]$SampleId,
        [string]$SuffixPattern
    )

    $matches = Get-ChildItem -LiteralPath $Root -Directory |
        Where-Object { $_.Name.StartsWith($SampleId) -and $_.Name -like $SuffixPattern } |
        Sort-Object Name

    if ($matches.Count -eq 0) {
        throw "Sample $SampleId not found for pattern $SuffixPattern under $Root"
    }

    return $matches[0].FullName
}

function Invoke-Postprocess {
    param(
        [string]$OriginalDir,
        [string]$RawDir,
        [string]$OutputDir,
        [int]$AlphaLow,
        [double]$Shrink,
        [string]$LogPath
    )

    $arguments = @(
        $script:PostprocessScriptFull,
        "--original", $OriginalDir,
        "--raw", $RawDir,
        "--output", $OutputDir,
        "--alpha-low", [string]$AlphaLow,
        "--shrink", [string]$Shrink,
        "--log", $LogPath
    )

    & $script:PythonExeFull @arguments

    if ($LASTEXITCODE -ne 0) {
        throw "Postprocess failed: $OutputDir"
    }
}

$PythonExeFull = Resolve-RepoPath $PythonExe
$PostprocessScriptFull = Resolve-RepoPath $PostprocessScript
$OutputRootFull = Resolve-RepoPath $OutputRoot

if (-not (Test-Path -LiteralPath $PythonExeFull)) {
    throw "Python not found: $PythonExeFull"
}

if (-not (Test-Path -LiteralPath $PostprocessScriptFull)) {
    throw "Postprocess script not found: $PostprocessScriptFull"
}

if (-not (Test-Path -LiteralPath $TestRoot)) {
    throw "Test root not found: $TestRoot"
}

$presets = @(
    [pscustomobject]@{
        Id = "detail_keep"
        Label = "detail keep candidate"
        AlphaLow = 18
        Shrink = 0.20
    },
    [pscustomobject]@{
        Id = "soft_c"
        Label = "soft edge C"
        AlphaLow = 24
        Shrink = 0.35
    },
    [pscustomobject]@{
        Id = "balanced_f"
        Label = "balanced edge F"
        AlphaLow = 36
        Shrink = 0.58
    },
    [pscustomobject]@{
        Id = "clean_i"
        Label = "clean edge I"
        AlphaLow = 48
        Shrink = 0.78
    }
)

New-Item -ItemType Directory -Force -Path $OutputRootFull | Out-Null

$summary = [ordered]@{
    phase = "Phase 6E-2"
    mode = "preset-compare"
    createdAt = (Get-Date).ToString("s")
    testRoot = $TestRoot
    outputRoot = $OutputRootFull
    pythonExe = $PythonExeFull
    postprocessScript = $PostprocessScriptFull
    samples = @()
}

foreach ($sampleId in $SampleIds) {
    $originalDir = Find-SampleDir -Root $TestRoot -SampleId $sampleId -SuffixPattern "*_12fps_4s"
    $rawDir = Find-SampleDir -Root $TestRoot -SampleId $sampleId -SuffixPattern "*_general_raw*"
    $sampleName = Split-Path $originalDir -Leaf
    $sampleOutputRoot = Join-Path $OutputRootFull $sampleName
    New-Item -ItemType Directory -Force -Path $sampleOutputRoot | Out-Null

    Write-Host ""
    Write-Host "==> $sampleName"
    Write-Host "Original: $originalDir"
    Write-Host "Raw:      $rawDir"

    $sampleEntry = [ordered]@{
        id = $sampleId
        name = $sampleName
        originalDir = $originalDir
        rawDir = $rawDir
        variants = @()
    }

    foreach ($preset in $presets) {
        $variantDir = Join-Path $sampleOutputRoot $preset.Id
        $logPath = Join-Path $sampleOutputRoot "$($preset.Id).json"

        Write-Host "  -> $($preset.Id) alphaLow=$($preset.AlphaLow) shrink=$($preset.Shrink)"

        Invoke-Postprocess `
            -OriginalDir $originalDir `
            -RawDir $rawDir `
            -OutputDir $variantDir `
            -AlphaLow $preset.AlphaLow `
            -Shrink $preset.Shrink `
            -LogPath $logPath

        $log = Get-Content -LiteralPath $logPath -Encoding UTF8 | ConvertFrom-Json

        $sampleEntry.variants += [ordered]@{
            id = $preset.Id
            label = $preset.Label
            alphaLow = $preset.AlphaLow
            shrink = $preset.Shrink
            outputDir = $variantDir
            logPath = $logPath
            processed = $log.processed
            skipped = $log.skipped
            edgeColorFixedPixels = $log.edgeColorFixedPixels
            elapsedSeconds = $log.elapsedSeconds
        }
    }

    $summary.samples += $sampleEntry
}

$summaryPath = Join-Path $OutputRootFull "summary.json"
$summary | ConvertTo-Json -Depth 8 | Set-Content -LiteralPath $summaryPath -Encoding UTF8

Write-Host ""
Write-Host "Phase 6E-2 preset comparison completed."
Write-Host "Summary: $summaryPath"
