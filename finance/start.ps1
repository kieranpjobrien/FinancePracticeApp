# CFA Practice App - Start Script
# Launches backend and frontend with no visible console windows

$ErrorActionPreference = "Stop"
$scriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
Set-Location $scriptDir

Write-Host ""
Write-Host "  ========================================"
Write-Host "   CFA Practice App"
Write-Host "  ========================================"
Write-Host ""

# Check if virtual environment exists
$venvPython = Join-Path $scriptDir "app\backend\venv\Scripts\pythonw.exe"
if (-not (Test-Path $venvPython)) {
    Write-Host "  Virtual environment not found. Run setup.bat first."
    Read-Host "  Press Enter to exit"
    exit 1
}
Write-Host "  [1/4] Virtual environment OK"

# Install backend dependencies quietly
Write-Host "  [2/4] Checking dependencies..."
$pip = Join-Path $scriptDir "app\backend\venv\Scripts\pip.exe"
$reqs = Join-Path $scriptDir "app\backend\requirements.txt"
& $pip install -r $reqs -q 2>$null

# Check frontend node_modules
$nodeModules = Join-Path $scriptDir "app\frontend\node_modules"
if (-not (Test-Path $nodeModules)) {
    Write-Host "  Installing frontend dependencies (first run)..."
    Push-Location (Join-Path $scriptDir "app\frontend")
    npm install
    Pop-Location
}

# Start backend - hidden window
Write-Host "  [3/4] Starting backend..."
$backendDir = Join-Path $scriptDir "app\backend"
$backendProc = Start-Process -FilePath $venvPython `
    -ArgumentList "-m", "uvicorn", "main:app", "--host", "127.0.0.1", "--port", "8010" `
    -WorkingDirectory $backendDir `
    -WindowStyle Hidden `
    -PassThru

Write-Host "       Waiting for backend..."
Start-Sleep -Seconds 2

# Start frontend - hidden window
Write-Host "  [4/4] Starting frontend..."
$frontendDir = Join-Path $scriptDir "app\frontend"
$frontendProc = Start-Process -FilePath "cmd.exe" `
    -ArgumentList "/c", "cd /d `"$frontendDir`" && npm run dev" `
    -WindowStyle Hidden `
    -PassThru

# Wait for backend to be ready
Write-Host "       Waiting for servers..."
$ready = $false
for ($i = 0; $i -lt 15; $i++) {
    Start-Sleep -Seconds 1
    try {
        $null = Invoke-WebRequest -Uri "http://127.0.0.1:8010/" -UseBasicParsing -TimeoutSec 2
        $ready = $true
        break
    } catch {}
}

if (-not $ready) {
    Write-Host "  WARNING: Backend did not respond in time. It may still be starting."
}

Write-Host ""
Write-Host "  ========================================"
Write-Host "   App is ready!"
Write-Host ""
Write-Host "   URL: http://localhost:5173"
Write-Host "  ========================================"
Write-Host ""

# Open browser
Start-Process "http://localhost:5173"

Write-Host "  The app is running. Press Enter to stop the servers."
Write-Host ""
Read-Host | Out-Null

# Cleanup
Write-Host "  Stopping servers..."
if ($backendProc -and -not $backendProc.HasExited) {
    Stop-Process -Id $backendProc.Id -Force -ErrorAction SilentlyContinue
}
if ($frontendProc -and -not $frontendProc.HasExited) {
    Stop-Process -Id $frontendProc.Id -Force -ErrorAction SilentlyContinue
    Get-Process -Name "node" -ErrorAction SilentlyContinue |
        Where-Object { $_.StartTime -gt $frontendProc.StartTime.AddSeconds(-5) } |
        Stop-Process -Force -ErrorAction SilentlyContinue
}

Write-Host "  Done."
Start-Sleep -Seconds 1
