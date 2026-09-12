$ErrorActionPreference = 'Stop'
$root = Split-Path -Parent $PSScriptRoot
$tokens = $null
$parseErrors = $null
$ast = [Management.Automation.Language.Parser]::ParseFile(
    (Join-Path $PSScriptRoot 'build-internal.ps1'), [ref]$tokens, [ref]$parseErrors)
if ($parseErrors.Count) { throw ($parseErrors | Out-String) }
$names = @('Assert-ReleasePath', 'Assert-Exists', 'Assert-NotExists', 'Compress-InternalPackage', 'Copy-ReleaseUserDocs')
foreach ($definition in $ast.FindAll({ param($node)
    $node -is [Management.Automation.Language.FunctionDefinitionAst] -and $node.Name -in $names
}, $true)) {
    Invoke-Expression $definition.Extent.Text
}
function Get-RepoRoot { return $root }

Assert-ReleasePath -Path (Join-Path $root 'release\build-entry-check\test.zip')
foreach ($invalid in @($root, (Join-Path $root 'release'),
    (Join-Path $root 'release-other\test'), (Join-Path $root 'release\..\package.json'))) {
    $rejected = $false
    try { Assert-ReleasePath -Path $invalid } catch { $rejected = $true }
    if (-not $rejected) { throw "Unsafe path accepted: $invalid" }
}
$testDir = Join-Path $root ('release\build-entry-check\' + [Guid]::NewGuid().ToString('N'))
$sourceDir = Join-Path $testDir 'package'
New-Item -ItemType Directory -Path $sourceDir -Force | Out-Null
Copy-Item -LiteralPath (Join-Path $root 'package.json') -Destination $sourceDir
Copy-ReleaseUserDocs -Root $root -InternalDir $sourceDir
$zip = Join-Path $testDir 'test.zip'
Compress-InternalPackage -SourceDir $sourceDir -ZipPath $zip
$before = (Get-FileHash -LiteralPath $zip).Hash
$rejected = $false
try { Compress-InternalPackage -SourceDir $sourceDir -ZipPath $zip } catch { $rejected = $true }
if (-not $rejected -or (Get-FileHash -LiteralPath $zip).Hash -ne $before) {
    throw 'Existing zip was not protected'
}
$archive = [IO.Compression.ZipFile]::OpenRead($zip)
try {
    if ($archive.Entries.Count -ne 2) { throw 'Expected package.json and user quickstart in zip' }
} finally { $archive.Dispose() }
Write-Host 'PASS: PowerShell syntax, release path boundaries, zip protection and user document packaging.'
Write-Host "Test artifacts: $testDir"
