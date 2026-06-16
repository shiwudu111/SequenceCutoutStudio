param(
    [string]$LayerDir = ""
)

$ErrorActionPreference = "Stop"

function Get-RepoRoot {
    $scriptDir = Split-Path -Parent $PSCommandPath
    return (Resolve-Path (Join-Path $scriptDir "..")).Path
}

function Read-IconLayer {
    param(
        [string]$Directory,
        [int]$Size
    )

    $path = Join-Path $Directory ("icon-{0}.png" -f $Size)
    if (-not (Test-Path -LiteralPath $path)) {
        throw "Missing fixed icon layer: $path"
    }

    $bytes = [System.IO.File]::ReadAllBytes((Resolve-Path -LiteralPath $path).Path)
    if ($bytes.Length -lt 24 -or
        $bytes[0] -ne 0x89 -or
        $bytes[1] -ne 0x50 -or
        $bytes[2] -ne 0x4e -or
        $bytes[3] -ne 0x47) {
        throw "Icon layer is not a PNG file: $path"
    }

    return ,$bytes
}

function Write-IcoFromLayers {
    param(
        [string]$Directory,
        [string]$Path
    )

    $sizes = @(256, 128, 96, 64, 48, 40, 32, 24, 16)
    $images = @()

    foreach ($size in $sizes) {
        $images += [PSCustomObject]@{
            Size = $size
            Bytes = Read-IconLayer -Directory $Directory -Size $size
        }
    }

    $stream = New-Object System.IO.FileStream $Path, ([System.IO.FileMode]::Create), ([System.IO.FileAccess]::Write)
    $writer = New-Object System.IO.BinaryWriter $stream

    try {
        $writer.Write([UInt16]0)
        $writer.Write([UInt16]1)
        $writer.Write([UInt16]$images.Count)

        $offset = 6 + (16 * $images.Count)
        foreach ($image in $images) {
            $widthByte = if ($image.Size -eq 256) { 0 } else { $image.Size }
            $writer.Write([byte]$widthByte)
            $writer.Write([byte]$widthByte)
            $writer.Write([byte]0)
            $writer.Write([byte]0)
            $writer.Write([UInt16]1)
            $writer.Write([UInt16]32)
            $writer.Write([UInt32]$image.Bytes.Length)
            $writer.Write([UInt32]$offset)
            $offset += $image.Bytes.Length
        }

        foreach ($image in $images) {
            $writer.Write([byte[]]$image.Bytes)
        }
    }
    finally {
        $writer.Dispose()
        $stream.Dispose()
    }
}

$root = Get-RepoRoot
$buildDir = Join-Path $root "build"
if ([string]::IsNullOrWhiteSpace($LayerDir)) {
    $LayerDir = Join-Path $buildDir "icon-layers"
}

if (-not (Test-Path -LiteralPath $LayerDir)) {
    throw "Icon layer directory was not found: $LayerDir"
}

$iconPngPath = Join-Path $buildDir "icon.png"
$iconIcoPath = Join-Path $buildDir "icon.ico"

New-Item -ItemType Directory -Path $buildDir -Force | Out-Null

Copy-Item -LiteralPath (Join-Path $LayerDir "icon-256.png") -Destination $iconPngPath -Force
Write-IcoFromLayers -Directory $LayerDir -Path $iconIcoPath

Write-Host "Generated $iconPngPath from fixed icon layer icon-256.png"
Write-Host "Generated $iconIcoPath from fixed icon layers in $LayerDir"
