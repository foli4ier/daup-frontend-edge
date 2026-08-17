@echo off
setlocal enabledelayedexpansion
title DAUP Frontend Edge

:: Set directory to script root
cd /d "%~dp0"

:: Console visual styling (Green on dark)
color 0A

echo ================================================================
echo               DAUP FRONTEND EDGE LAUNCHER
echo ================================================================
echo.

:: 1. Check Node.js installation
where node >nul 2>nul
if %errorlevel% neq 0 (
    color 0C
    echo [ERROR] Node.js is not found in your system PATH!
    echo Please install Node.js from https://nodejs.org
    echo.
    pause
    exit /b 1
)

:: 2. Check npm installation
where npm >nul 2>nul
if %errorlevel% neq 0 (
    color 0C
    echo [ERROR] npm is not found in your system PATH!
    echo Please ensure npm is installed alongside Node.js.
    echo.
    pause
    exit /b 1
)

:: Display Node.js & npm version info
for /f "tokens=*" %%v in ('node -v') do set NODE_VER=%%v
for /f "tokens=*" %%v in ('npm -v') do set NPM_VER=%%v
echo [OK] Node.js: %NODE_VER% ^| npm: v%NPM_VER%
echo.

:: 3. Check node_modules dependencies
if not exist "node_modules\" (
    echo [INFO] Dependencies not found. Installing node_modules...
    echo.
    call npm install
    if %errorlevel% neq 0 (
        color 0C
        echo.
        echo [ERROR] npm install failed. Please inspect the output above.
        echo.
        pause
        exit /b 1
    )
    echo.
    echo [OK] Dependencies installed successfully!
    echo.
)

:: 4. Start Edge Frontend Dev Server directly (On-demand launcher enabled for tiles)
echo ================================================================
echo Starting DAUP Frontend Edge on http://localhost:3000...
echo (Other projects will boot on-demand when clicked in the dashboard)
echo ================================================================
echo.

:: Automatically open browser after 2 seconds
start "" cmd /c "timeout /t 2 /nobreak >nul & start http://localhost:3000"

:: Run the Vite dev server
call npm run dev

if %errorlevel% neq 0 (
    color 0C
    echo.
    echo [!] Server exited with code %errorlevel%.
    echo.
    pause
)

exit /b 0
