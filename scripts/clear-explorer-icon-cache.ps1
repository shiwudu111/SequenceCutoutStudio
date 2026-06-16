param(
    [string]$TargetPath = "",
    [switch]$Full,
    [switch]$WhatIf
)

$ErrorActionPreference = "Stop"

function Write-Step {
    param([string]$Message)
    Write-Host ""
    Write-Host "==> $Message"
}

function Invoke-IfNeeded {
    param(
        [string]$Description,
        [scriptblock]$Action
    )

    if ($WhatIf) {
        Write-Host "[what-if] $Description"
        return
    }

    Write-Host $Description
    & $Action
}

function Notify-ShellIconChanged {
    param([string]$Path)

    Add-Type -TypeDefinition @'
using System;
using System.Runtime.InteropServices;

public static class ScsIconCacheNotify {
    [DllImport("shell32.dll", CharSet = CharSet.Unicode)]
    public static extern void SHChangeNotify(int wEventId, uint uFlags, string dwItem1, string dwItem2);
}
'@

    $SHCNE_UPDATEITEM = 0x00002000
    $SHCNE_UPDATEDIR = 0x00001000
    $SHCNE_ASSOCCHANGED = 0x08000000
    $SHCNF_PATHW = 0x0005
    $SHCNF_IDLIST = 0x0000

    if (-not [string]::IsNullOrWhiteSpace($Path) -and (Test-Path -LiteralPath $Path)) {
        $resolved = (Resolve-Path -LiteralPath $Path).Path
        $directory = Split-Path -Parent $resolved
        [ScsIconCacheNotify]::SHChangeNotify($SHCNE_UPDATEITEM, $SHCNF_PATHW, $resolved, $null)
        if ($directory) {
            [ScsIconCacheNotify]::SHChangeNotify($SHCNE_UPDATEDIR, $SHCNF_PATHW, $directory, $null)
        }
    }

    [ScsIconCacheNotify]::SHChangeNotify($SHCNE_ASSOCCHANGED, $SHCNF_IDLIST, $null, $null)
}

function Invoke-Ie4uinit {
    $ie4uinit = Join-Path $env:WINDIR "System32\ie4uinit.exe"
    if (-not (Test-Path -LiteralPath $ie4uinit)) {
        Write-Host "ie4uinit.exe not found, skipping."
        return
    }

    Invoke-IfNeeded "Running ie4uinit.exe -ClearIconCache" { & $ie4uinit -ClearIconCache | Out-Null }
    Invoke-IfNeeded "Running ie4uinit.exe -show" { & $ie4uinit -show | Out-Null }
}

function Remove-CacheFiles {
    $paths = @()
    $paths += Join-Path $env:LOCALAPPDATA "IconCache.db"

    $explorerCacheDir = Join-Path $env:LOCALAPPDATA "Microsoft\Windows\Explorer"
    if (Test-Path -LiteralPath $explorerCacheDir) {
        $paths += Get-ChildItem -LiteralPath $explorerCacheDir -Filter "iconcache*.db" -Force -ErrorAction SilentlyContinue | ForEach-Object { $_.FullName }
        $paths += Get-ChildItem -LiteralPath $explorerCacheDir -Filter "thumbcache*.db" -Force -ErrorAction SilentlyContinue | ForEach-Object { $_.FullName }
    }

    $paths = $paths | Where-Object { $_ -and (Test-Path -LiteralPath $_) } | Sort-Object -Unique

    foreach ($path in $paths) {
        Invoke-IfNeeded "Removing cache file: $path" {
            Remove-Item -LiteralPath $path -Force -ErrorAction SilentlyContinue
        }
    }
}

Write-Step "Refreshing Explorer icon cache"
Notify-ShellIconChanged -Path $TargetPath
Invoke-Ie4uinit

if ($Full) {
    Write-Step "Full cache reset"
    Invoke-IfNeeded "Stopping explorer.exe" {
        Get-Process explorer -ErrorAction SilentlyContinue | Stop-Process -Force
        Start-Sleep -Milliseconds 800
    }

    Remove-CacheFiles

    Invoke-IfNeeded "Starting explorer.exe" {
        Start-Process explorer.exe
    }
}
else {
    Write-Host ""
    Write-Host "Soft refresh completed. If Explorer still shows a blurry icon, rerun with -Full."
}

Write-Host ""
Write-Host "Explorer icon cache refresh completed."
