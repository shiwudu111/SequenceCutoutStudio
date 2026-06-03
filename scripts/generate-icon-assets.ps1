param(
    [string]$Source = "E:\buddy-client\assets\resources\ui\main\character\icon.png"
)

$ErrorActionPreference = "Stop"

function Get-RepoRoot {
    $scriptDir = Split-Path -Parent $PSCommandPath
    return (Resolve-Path (Join-Path $scriptDir "..")).Path
}

function New-ResizedBitmap {
    param(
        [System.Drawing.Image]$SourceImage,
        [int]$Size
    )

    $bitmap = New-Object System.Drawing.Bitmap $Size, $Size, ([System.Drawing.Imaging.PixelFormat]::Format32bppArgb)
    $graphics = [System.Drawing.Graphics]::FromImage($bitmap)
    $graphics.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::HighQuality
    $graphics.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
    $graphics.PixelOffsetMode = [System.Drawing.Drawing2D.PixelOffsetMode]::HighQuality
    $graphics.CompositingQuality = [System.Drawing.Drawing2D.CompositingQuality]::HighQuality
    $graphics.Clear([System.Drawing.Color]::Transparent)
    $graphics.DrawImage($SourceImage, 0, 0, $Size, $Size)
    $graphics.Dispose()

    return $bitmap
}

function New-SharpenedBitmap {
    param(
        [System.Drawing.Bitmap]$SourceBitmap,
        [double]$Amount = 0.45
    )

    $width = $SourceBitmap.Width
    $height = $SourceBitmap.Height
    $bitmap = New-Object System.Drawing.Bitmap $width, $height, ([System.Drawing.Imaging.PixelFormat]::Format32bppArgb)

    for ($y = 0; $y -lt $height; $y++) {
        for ($x = 0; $x -lt $width; $x++) {
            if ($x -eq 0 -or $y -eq 0 -or $x -eq ($width - 1) -or $y -eq ($height - 1)) {
                $bitmap.SetPixel($x, $y, $SourceBitmap.GetPixel($x, $y))
                continue
            }

            $center = $SourceBitmap.GetPixel($x, $y)
            if ($center.A -eq 0) {
                $bitmap.SetPixel($x, $y, $center)
                continue
            }

            $left = $SourceBitmap.GetPixel($x - 1, $y)
            $right = $SourceBitmap.GetPixel($x + 1, $y)
            $top = $SourceBitmap.GetPixel($x, $y - 1)
            $bottom = $SourceBitmap.GetPixel($x, $y + 1)

            $blurR = ($left.R + $right.R + $top.R + $bottom.R) / 4.0
            $blurG = ($left.G + $right.G + $top.G + $bottom.G) / 4.0
            $blurB = ($left.B + $right.B + $top.B + $bottom.B) / 4.0

            $r = [Math]::Max(0, [Math]::Min(255, [int]($center.R + (($center.R - $blurR) * $Amount))))
            $g = [Math]::Max(0, [Math]::Min(255, [int]($center.G + (($center.G - $blurG) * $Amount))))
            $b = [Math]::Max(0, [Math]::Min(255, [int]($center.B + (($center.B - $blurB) * $Amount))))

            $bitmap.SetPixel($x, $y, [System.Drawing.Color]::FromArgb($center.A, $r, $g, $b))
        }
    }

    return $bitmap
}

function Get-DibBytes {
    param(
        [System.Drawing.Bitmap]$Bitmap
    )

    $width = $Bitmap.Width
    $height = $Bitmap.Height
    $xorStride = $width * 4
    $andStride = [Math]::Ceiling($width / 32.0) * 4
    $imageSize = 40 + ($xorStride * $height) + ($andStride * $height)

    $stream = New-Object System.IO.MemoryStream
    $writer = New-Object System.IO.BinaryWriter $stream

    $writer.Write([UInt32]40)
    $writer.Write([Int32]$width)
    $writer.Write([Int32]($height * 2))
    $writer.Write([UInt16]1)
    $writer.Write([UInt16]32)
    $writer.Write([UInt32]0)
    $writer.Write([UInt32]$imageSize)
    $writer.Write([Int32]0)
    $writer.Write([Int32]0)
    $writer.Write([UInt32]0)
    $writer.Write([UInt32]0)

    for ($y = $height - 1; $y -ge 0; $y--) {
        for ($x = 0; $x -lt $width; $x++) {
            $pixel = $Bitmap.GetPixel($x, $y)
            $writer.Write([byte]$pixel.B)
            $writer.Write([byte]$pixel.G)
            $writer.Write([byte]$pixel.R)
            $writer.Write([byte]$pixel.A)
        }
    }

    $emptyMaskRow = New-Object byte[] $andStride
    for ($y = 0; $y -lt $height; $y++) {
        $writer.Write($emptyMaskRow)
    }

    $writer.Flush()
    $bytes = $stream.ToArray()
    $writer.Dispose()
    $stream.Dispose()

    return ,$bytes
}

function Get-PngBytes {
    param(
        [System.Drawing.Bitmap]$Bitmap
    )

    $stream = New-Object System.IO.MemoryStream
    try {
        $Bitmap.Save($stream, [System.Drawing.Imaging.ImageFormat]::Png)
        return ,$stream.ToArray()
    }
    finally {
        $stream.Dispose()
    }
}

function Write-Ico {
    param(
        [System.Drawing.Image]$SourceImage,
        [string]$Path
    )

    $sizes = @(256, 128, 96, 64, 48, 40, 32, 24, 16)
    $images = @()

    foreach ($size in $sizes) {
        $bitmap = New-ResizedBitmap -SourceImage $SourceImage -Size $size
        $iconBitmap = $bitmap
        if ($size -le 128) {
            $iconBitmap = New-SharpenedBitmap -SourceBitmap $bitmap -Amount 0.55
        }

        $bytes = Get-PngBytes -Bitmap $iconBitmap
        $images += [PSCustomObject]@{
            Size = $size
            Bytes = $bytes
        }
        if ($iconBitmap -ne $bitmap) {
            $iconBitmap.Dispose()
        }
        $bitmap.Dispose()
    }

    $stream = New-Object System.IO.FileStream $Path, ([System.IO.FileMode]::Create), ([System.IO.FileAccess]::Write)
    $writer = New-Object System.IO.BinaryWriter $stream

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

    $writer.Dispose()
    $stream.Dispose()
}

Add-Type -AssemblyName System.Drawing

if (-not (Test-Path -LiteralPath $Source)) {
    throw "Source icon was not found: $Source"
}

$root = Get-RepoRoot
$buildDir = Join-Path $root "build"
$iconPngPath = Join-Path $buildDir "icon.png"
$iconIcoPath = Join-Path $buildDir "icon.ico"

New-Item -ItemType Directory -Path $buildDir -Force | Out-Null

$sourceImage = [System.Drawing.Image]::FromFile((Resolve-Path -LiteralPath $Source).Path)
try {
    $pngBitmap = New-ResizedBitmap -SourceImage $sourceImage -Size 512
    try {
        $pngBitmap.Save($iconPngPath, [System.Drawing.Imaging.ImageFormat]::Png)
    }
    finally {
        $pngBitmap.Dispose()
    }

    Write-Ico -SourceImage $sourceImage -Path $iconIcoPath
}
finally {
    $sourceImage.Dispose()
}

Write-Host "Generated $iconPngPath"
Write-Host "Generated $iconIcoPath"
