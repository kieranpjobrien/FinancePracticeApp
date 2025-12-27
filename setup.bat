@echo off
setlocal enabledelayedexpansion

echo.
echo ========================================
echo    Finance Practice App - Setup
echo ========================================
echo.
echo This script will set up your local environment.
echo It creates an isolated Python virtual environment (venv)
echo inside this folder - your system Python is NOT modified.
echo.
echo Press Ctrl+C to cancel, or
pause

:: Get the directory where this script is located
set "SCRIPT_DIR=%~dp0"
cd /d "%SCRIPT_DIR%"

echo.
echo [1/6] Checking Python installation...
echo.

:: Check for Python
where python >nul 2>&1
if %errorlevel% neq 0 (
    echo ERROR: Python is not installed or not in PATH.
    echo.
    echo Please install Python 3.10 or later from:
    echo   https://www.python.org/downloads/
    echo.
    echo IMPORTANT: During installation, check "Add Python to PATH"
    echo.
    pause
    exit /b 1
)

:: Check Python version
for /f "tokens=2 delims= " %%v in ('python --version 2^>^&1') do set PYTHON_VERSION=%%v
echo   Found Python %PYTHON_VERSION%

:: Extract major.minor version
for /f "tokens=1,2 delims=." %%a in ("%PYTHON_VERSION%") do (
    set PYTHON_MAJOR=%%a
    set PYTHON_MINOR=%%b
)

if %PYTHON_MAJOR% LSS 3 (
    echo ERROR: Python 3.10+ is required. You have Python %PYTHON_VERSION%
    pause
    exit /b 1
)
if %PYTHON_MAJOR% EQU 3 if %PYTHON_MINOR% LSS 10 (
    echo ERROR: Python 3.10+ is required. You have Python %PYTHON_VERSION%
    pause
    exit /b 1
)

echo   Python version OK
echo.

echo [2/6] Checking Node.js installation...
echo.

:: Check for Node.js
where node >nul 2>&1
if %errorlevel% neq 0 (
    echo ERROR: Node.js is not installed or not in PATH.
    echo.
    echo Please install Node.js 18 or later from:
    echo   https://nodejs.org/
    echo.
    echo Choose the LTS version for best compatibility.
    echo.
    pause
    exit /b 1
)

for /f "tokens=1 delims=v" %%v in ('node --version') do set NODE_VERSION=%%v
echo   Found Node.js v%NODE_VERSION%
echo   Node.js OK
echo.

echo [3/6] Creating Python virtual environment...
echo.
echo   This creates an isolated Python environment in:
echo   %SCRIPT_DIR%app\backend\venv\
echo.
echo   Your system Python will NOT be modified.
echo.

cd /d "%SCRIPT_DIR%app\backend"

:: Create venv if it doesn't exist
if not exist "venv\" (
    echo   Creating new virtual environment...
    python -m venv venv
    if %errorlevel% neq 0 (
        echo ERROR: Failed to create virtual environment.
        pause
        exit /b 1
    )
    echo   Virtual environment created.
) else (
    echo   Virtual environment already exists.
)
echo.

echo [4/6] Installing Python dependencies...
echo.
echo   Installing packages from requirements.txt...
echo.

call venv\Scripts\activate.bat
pip install --upgrade pip >nul 2>&1
pip install -r requirements.txt
if %errorlevel% neq 0 (
    echo ERROR: Failed to install Python dependencies.
    pause
    exit /b 1
)
echo.
echo   Python dependencies installed.
echo.

echo [5/6] Installing Node.js dependencies...
echo.

cd /d "%SCRIPT_DIR%app\frontend"

:: Check if node_modules exists
if not exist "node_modules\" (
    echo   Installing npm packages...
    call npm install
    if %errorlevel% neq 0 (
        echo ERROR: Failed to install npm packages.
        pause
        exit /b 1
    )
) else (
    echo   Node modules already installed.
    echo   Run 'npm install' in app\frontend to update if needed.
)
echo.

echo [6/6] Setup complete!
echo.
echo ========================================
echo    Setup Successful!
echo ========================================
echo.
echo To start the app, run:
echo   start.bat
echo.
echo Or manually:
echo   1. cd app\backend ^&^& venv\Scripts\activate ^&^& uvicorn main:app --reload
echo   2. cd app\frontend ^&^& npm run dev
echo.
echo Then open http://localhost:5173 in your browser.
echo.
pause
