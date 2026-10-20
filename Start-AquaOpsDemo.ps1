param([switch]$NoBrowser, [switch]$Reset, [switch]$Presentation)
$ErrorActionPreference = 'Stop'
Set-Location -LiteralPath $PSScriptRoot
$aquaDemoCommandInfo = Get-Command node -ErrorAction SilentlyContinue
$aquaDemoCandidates = @($env:AQUAOPS_NODE, $(if ($aquaDemoCommandInfo) { $aquaDemoCommandInfo.Source }), (Join-Path $env:ProgramFiles 'nodejs\node.exe'), (Join-Path $env:USERPROFILE '.cache\codex-runtimes\codex-primary-runtime\dependencies\node\bin\node.exe'))
$aquaDemoNode = $null
foreach ($aquaDemoCandidate in ($aquaDemoCandidates | Where-Object { $_ -and (Test-Path -LiteralPath $_) } | Select-Object -Unique)) {
    try { $aquaDemoVersion = & $aquaDemoCandidate -p 'process.versions.node' 2>$null; if ([version]$aquaDemoVersion -ge [version]'24.14.0' -and [version]$aquaDemoVersion -lt [version]'25.0.0') { $aquaDemoNode = $aquaDemoCandidate; break } } catch { }
}
if (-not $aquaDemoNode) { throw 'Install Node 24.14 or newer in the 24.x line, then retry.' }
$aquaDemoPort = if ($Presentation) { '8002' } else { '8001' }
if ($Reset) { try { $aquaDemoSession = Invoke-RestMethod ("http://127.0.0.1:" + $aquaDemoPort + "/api/session") -TimeoutSec 2 } catch { $aquaDemoSession = $null }; if ($aquaDemoSession) { throw 'Stop the existing demo preview before resetting it. Real facility data will not be changed.' } }
$aquaDemoCommand = if ($Reset) { 'reset' } else { 'init' }
$aquaDemoArguments = @($aquaDemoCommand)
if ($Presentation) { $aquaDemoArguments += '--presentation' }
$aquaDemoOutput = & $aquaDemoNode (Join-Path $PSScriptRoot 'tools\demo.cjs') @aquaDemoArguments
if ($LASTEXITCODE -ne 0) { throw 'Demo initialization failed. Existing facility data was not changed.' }
$aquaDemoInfo = ($aquaDemoOutput -join "`n") | ConvertFrom-Json
Write-Host 'FICTIONAL DEMO - separate from your facility database'
Write-Host ('Accounts: ' + ($aquaDemoInfo.accounts -join ', '))
Write-Host ('Demo-only password: ' + $aquaDemoInfo.password)
$aquaPreviousData = $env:AQUAOPS_DATA_DIR
$aquaPreviousNode = $env:AQUAOPS_NODE
$aquaPreviousPort = $env:PORT
try {
    $env:AQUAOPS_DATA_DIR = $aquaDemoInfo.dataDir
    $env:AQUAOPS_NODE = $aquaDemoNode
    $env:PORT = $aquaDemoPort
    & (Join-Path $PSScriptRoot 'Start-AquaOps.ps1') -NoBrowser:$NoBrowser -NoPrompt
} finally {
    $env:AQUAOPS_DATA_DIR = $aquaPreviousData
    $env:AQUAOPS_NODE = $aquaPreviousNode
    $env:PORT = $aquaPreviousPort
}
