param(
    [string]$PythonExe = ""
)

$ErrorActionPreference = "Continue"

function Write-Section {
    param([string]$Title)
    Write-Host ""
    Write-Host "==> $Title"
}

function Resolve-DefaultPython {
    $candidate = Join-Path $PSScriptRoot "..\release\SequenceCutoutStudio-Internal\app\resources\portable-root\tools\python\python.exe"
    $resolved = Resolve-Path $candidate -ErrorAction SilentlyContinue

    if ($resolved) {
        return $resolved.Path
    }

    return ""
}

function Invoke-PythonSnippet {
    param(
        [string]$Title,
        [string]$Code
    )

    Write-Section $Title

    $tempFile = Join-Path ([System.IO.Path]::GetTempPath()) ("scs-python-diagnose-" + [System.Guid]::NewGuid().ToString("N") + ".py")

    try {
        Set-Content -LiteralPath $tempFile -Value $Code -Encoding UTF8
        & $PythonExe $tempFile 2>&1 | ForEach-Object {
            Write-Host $_
        }
        $exitCode = $LASTEXITCODE
        Write-Host "exit_code=$exitCode"
        return $exitCode
    }
    finally {
        Remove-Item -LiteralPath $tempFile -Force -ErrorAction SilentlyContinue
    }
}

if ([string]::IsNullOrWhiteSpace($PythonExe)) {
    $PythonExe = Resolve-DefaultPython
}

if ([string]::IsNullOrWhiteSpace($PythonExe) -or -not (Test-Path -LiteralPath $PythonExe)) {
    Write-Error "Portable python.exe not found. Pass -PythonExe <path> or build the internal package first."
    exit 1
}

$PythonExe = (Resolve-Path -LiteralPath $PythonExe).Path
$pythonDir = Split-Path -Parent $PythonExe
$toolsRoot = Split-Path -Parent $pythonDir
$sitePackages = Join-Path $toolsRoot "Lib\site-packages"

$env:PYTHONPATH = $sitePackages
$env:PYTHONNOUSERSITE = "1"
$env:NUMBA_CACHE_DIR = Join-Path $env:TEMP "scs-numba-cache"

Write-Section "Portable Python paths"
Write-Host "python_exe=$PythonExe"
Write-Host "tools_root=$toolsRoot"
Write-Host "site_packages=$sitePackages"
Write-Host "site_packages_exists=$(Test-Path -LiteralPath $sitePackages)"
Write-Host "PYTHONPATH=$env:PYTHONPATH"
Write-Host "PYTHONNOUSERSITE=$env:PYTHONNOUSERSITE"
Write-Host "NUMBA_CACHE_DIR=$env:NUMBA_CACHE_DIR"

$null = Invoke-PythonSnippet -Title "Python runtime and sys.path" -Code @'
import os
import sys

print("sys.executable=", sys.executable, flush=True)
print("sys.version=", sys.version.replace("\n", " "), flush=True)
print("sys.prefix=", sys.prefix, flush=True)
print("sys.base_prefix=", sys.base_prefix, flush=True)
print("PYTHONPATH=", os.environ.get("PYTHONPATH", ""), flush=True)
print("PYTHONNOUSERSITE=", os.environ.get("PYTHONNOUSERSITE", ""), flush=True)
print("sys.path:", flush=True)
for item in sys.path:
    print("  " + item, flush=True)
'@

$null = Invoke-PythonSnippet -Title "Installed package versions" -Code @'
from importlib import metadata

packages = [
    "rembg",
    "onnxruntime",
    "numpy",
    "Pillow",
    "numba",
    "llvmlite",
    "scipy",
    "pooch",
    "pymatting",
]

for package in packages:
    try:
        print(f"{package}={metadata.version(package)}", flush=True)
    except Exception as exc:
        print(f"{package}=<not found> ({type(exc).__name__}: {exc})", flush=True)
'@

$modules = @(
    "numpy",
    "PIL",
    "onnxruntime",
    "llvmlite",
    "numba",
    "pymatting",
    "rembg"
)

$results = @()

foreach ($moduleName in $modules) {
    $code = @"
import importlib
import sys

module_name = "$moduleName"
print("import_start=" + module_name, flush=True)
try:
    module = importlib.import_module(module_name)
    version = getattr(module, "__version__", "<no __version__>")
    print("import_ok=" + module_name, flush=True)
    print("module_file=" + str(getattr(module, "__file__", "")), flush=True)
    print("module_version=" + str(version), flush=True)
except BaseException as exc:
    print("import_error=" + module_name, flush=True)
    print("error_type=" + type(exc).__name__, flush=True)
    print("error_message=" + str(exc), flush=True)
    sys.exit(1)
"@

    $exitCode = Invoke-PythonSnippet -Title "Import check: $moduleName" -Code $code
    $results += [PSCustomObject]@{
        Module = $moduleName
        ExitCode = $exitCode
    }
}

Write-Section "Import summary"
$results | Format-Table -AutoSize

if (($results | Where-Object { $_.ExitCode -ne 0 }).Count -gt 0) {
    exit 1
}

exit 0
