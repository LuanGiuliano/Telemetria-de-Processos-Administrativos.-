$PSScriptRoot = Split-Path -Parent $MyInvocation.MyCommand.Definition
$NodeDir = Join-Path $PSScriptRoot "node_portable\node-v22.14.0-win-x64"
$env:PATH = "$NodeDir;$env:PATH"

Write-Host "Starting Telemetria with portable Node.js $(node -v)" -ForegroundColor Cyan
Set-Location -Path (Join-Path $PSScriptRoot "frontend")
npm run dev
