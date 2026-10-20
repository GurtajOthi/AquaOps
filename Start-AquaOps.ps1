param([switch]$NoBrowser, [switch]$NoPrompt)
$ErrorActionPreference = 'Stop'
Set-Location -LiteralPath $PSScriptRoot
$nodeCommand = Get-Command node -ErrorAction SilentlyContinue
$nodeCandidates = @(
    $env:AQUAOPS_NODE,
    $(if ($nodeCommand) { $nodeCommand.Source }),
    (Join-Path $env:ProgramFiles 'nodejs/node.exe'),
    (Join-Path $env:USERPROFILE '.cache/codex-runtimes/codex-primary-runtime/dependencies/node/bin/node.exe')
)
$aquaNode = $null
foreach ($candidate in ($nodeCandidates | Where-Object { $_ -and (Test-Path -LiteralPath $_) } | Select-Object -Unique)) {
    try {
        $version = & $candidate -p 'process.versions.node' 2>$null
        if ([version]$version -ge [version]'24.14.0' -and [version]$version -lt [version]'25.0.0') { $aquaNode = $candidate; break }
    } catch { }
}
if (-not $aquaNode) { throw 'Node.js 24.14+ (24.x) is required. No compatible runtime was found. Install Node.js or set AQUAOPS_NODE to a compatible node.exe, then run Start-AquaOps.cmd again.' }
$port = if ($env:PORT) { [int]$env:PORT } else { 8000 }
if ($port -lt 1 -or $port -gt 65535) { throw 'PORT must be a whole number from 1 to 65535.' }
$address = "http://127.0.0.1:$port"
$aquaData = if ($env:AQUAOPS_DATA_DIR) { $env:AQUAOPS_DATA_DIR } else { Join-Path $PSScriptRoot 'data' }
$resolvedData = [IO.Path]::GetFullPath($aquaData).TrimEnd([char[]]'\/').ToLowerInvariant()
$locationHash = [Security.Cryptography.SHA256]::Create()
try { $expectedLocation = ([BitConverter]::ToString($locationHash.ComputeHash([Text.Encoding]::UTF8.GetBytes($resolvedData)))).Replace('-', '').ToLowerInvariant() } finally { $locationHash.Dispose() }
$existing = $null
try { $existing = Invoke-RestMethod -Uri "$address/api/session" -TimeoutSec 2 } catch { }
if ($existing -and $existing.app -eq 'AquaOps' -and $existing.protocol -ne 10) { throw "An older AquaOps server is running at $address. Stop that server process and launch again. Existing records will be retained." }
if ($existing -and $existing.app -eq 'AquaOps' -and $existing.protocol -eq 10) {
    if ($existing.dataLocation -ne $expectedLocation) { throw "AquaOps is running at $address with a different data directory. Stop that server before switching data, or choose another PORT to test the recovered copy." }
    Write-Host "AquaOps is already running: $address"
    if (-not $NoBrowser) { Start-Process $address }
    if ($existing.setupRequired -and -not $NoPrompt) {
        Write-Host 'Copy this setup token into the administrator setup page:'
        Write-Host (Get-Content -LiteralPath (Join-Path $aquaData 'setup-token.txt') -Raw)
        Read-Host 'Press Enter to close this launcher'
    }
    exit 0
}
if ($existing) { throw "Another application is responding at $address. Choose another PORT or stop that specific application before launching AquaOps." }
New-Item -ItemType Directory -Path $aquaData -Force | Out-Null
$aquaProcess = Start-Process -FilePath $aquaNode -ArgumentList @('server.js') -WorkingDirectory $PSScriptRoot -WindowStyle Hidden -PassThru -RedirectStandardOutput (Join-Path $aquaData 'server.log') -RedirectStandardError (Join-Path $aquaData 'server-error.log')
$ready = $false
for ($i = 0; $i -lt 30; $i++) {
    $aquaProcess.Refresh()
    if ($aquaProcess.HasExited) { throw "AquaOps could not start. Read $(Join-Path $aquaData 'server-error.log'). Another program may be using port $port." }
    try { $session = Invoke-RestMethod -Uri "$address/api/session" -TimeoutSec 1; if ($session.app -eq 'AquaOps' -and $session.protocol -eq 10 -and $session.dataLocation -eq $expectedLocation) { $ready = $true; break }; Start-Sleep -Milliseconds 300 } catch { Start-Sleep -Milliseconds 300 }
}
if (-not $ready) { throw 'AquaOps did not become ready. Check the server log.' }
if ($session.setupRequired -and -not $NoPrompt) {
    Write-Host 'First run: copy this setup token into the administrator setup page:'
    Write-Host (Get-Content -LiteralPath (Join-Path $aquaData 'setup-token.txt') -Raw)
}
Write-Host "AquaOps is running at $address"
Write-Host "Server process ID: $($aquaProcess.Id). Closing this launcher does not stop the server."
if (-not $NoBrowser) { Start-Process $address }
if (-not $NoPrompt) { Read-Host 'Press Enter to close this launcher (the server will keep running)' }
