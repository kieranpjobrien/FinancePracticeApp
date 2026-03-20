@echo off
setlocal EnableDelayedExpansion
cd /d "%~dp0"

title CFA Practice App
color 0A

echo.
echo  ========================================
echo   CFA Practice App
echo  ========================================
echo.

:: Check if virtual environment exists
if not exist "app\backend\venv\Scripts\python.exe" (
    echo [1/4] Creating Python virtual environment...
    python -m venv app\backend\venv
    if errorlevel 1 (
        echo ERROR: Failed to create virtual environment
        pause
        exit /b 1
    )
) else (
    echo [1/4] Virtual environment OK
)

:: Install backend dependencies
echo [2/4] Checking backend dependencies...
"app\backend\venv\Scripts\pip.exe" install -r app\backend\requirements.txt -q 2>nul

:: Check if node_modules exists
if not exist "app\frontend\node_modules" (
    echo [2/4] Installing frontend dependencies ^(first run^)...
    pushd app\frontend
    call npm install
    popd
)

:: Start backend in a new minimized window
echo [3/4] Starting backend...
start /min "" cmd /c "cd /d "%~dp0app\backend" && "%~dp0app\backend\venv\Scripts\python.exe" -m uvicorn main:app --host 127.0.0.1 --port 8010"

:: Wait for backend to start
echo      Waiting for backend...
timeout /t 2 /nobreak >nul

:: Start frontend in a new minimized window
echo [4/4] Starting frontend...
start /min "" cmd /c "cd /d "%~dp0app\frontend" && npm run dev"

:: Wait for servers to be ready
echo      Waiting for servers...
:wait_loop
timeout /t 1 /nobreak >nul
curl -s http://127.0.0.1:8010/ >nul 2>&1
if errorlevel 1 goto wait_loop

echo.
echo  ========================================
echo   App is ready!
echo
echo   URL: http://localhost:5173
echo  ========================================
echo.

:: Open browser automatically
start "" "http://localhost:5173"

echo  The app is running. Close this window to stop the servers.
echo.
pause >nul

:: Cleanup - kill node and python processes we started
echo Stopping servers...
for /f "tokens=2" %%a in ('tasklist /fi "windowtitle eq CFA*" /fo list ^| find "PID:"') do (
    taskkill /pid %%a /f >nul 2>&1
)
taskkill /f /im "node.exe" >nul 2>&1

echo Done.
timeout /t 1 >nul
