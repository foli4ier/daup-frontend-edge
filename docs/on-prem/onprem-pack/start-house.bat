@echo off
REM On-prem pack: start the existing Kortrijk house node (npm run start:home → :8080).
REM Assumes this file lives at daup-mcp-servers\onprem-pack\start-house.bat
setlocal EnableExtensions EnableDelayedExpansion

set "PACK_DIR=%~dp0"
if "%PACK_DIR:~-1%"=="\" set "PACK_DIR=%PACK_DIR:~0,-1%"

where node >nul 2>&1
if errorlevel 1 (
  echo [onprem] Node 20+ is required ^(node not found^)
  exit /b 1
)
for /f "delims=" %%V in ('node -e "process.stdout.write(String(parseInt(process.versions.node, 10)))"') do set "NODE_MAJOR=%%V"
if !NODE_MAJOR! LSS 20 (
  echo [onprem] Node 20+ is required ^(found node v from PATH^)
  exit /b 1
)

call :load_dotenv "%PACK_DIR%\.env"

set "REPO_ROOT="
if exist "%PACK_DIR%\..\package.json" (
  findstr /C:"start:home" "%PACK_DIR%\..\package.json" >nul 2>&1
  if not errorlevel 1 for %%I in ("%PACK_DIR%\..") do set "REPO_ROOT=%%~fI"
)
if not defined REPO_ROOT if exist "%PACK_DIR%\..\daup-mcp-servers\package.json" (
  findstr /C:"start:home" "%PACK_DIR%\..\daup-mcp-servers\package.json" >nul 2>&1
  if not errorlevel 1 for %%I in ("%PACK_DIR%\..\daup-mcp-servers") do set "REPO_ROOT=%%~fI"
)
if not defined REPO_ROOT if exist "%PACK_DIR%\daup-mcp-servers\package.json" (
  findstr /C:"start:home" "%PACK_DIR%\daup-mcp-servers\package.json" >nul 2>&1
  if not errorlevel 1 for %%I in ("%PACK_DIR%\daup-mcp-servers") do set "REPO_ROOT=%%~fI"
)
if not defined REPO_ROOT (
  echo [onprem] Could not find daup-mcp-servers ^(npm run start:home^).
  echo [onprem] Put this pack at onprem-pack\ inside the repo, or next to a built checkout.
  exit /b 1
)

call :load_dotenv "%REPO_ROOT%\.env"

if not defined PORT set "PORT=8080"
if not defined HOST set "HOST=0.0.0.0"

if not defined DAUP_DATA_DIR set "DAUP_DATA_DIR=%USERPROFILE%\daup\daup-mcp-data"
for %%I in ("%DAUP_DATA_DIR%") do set "DAUP_DATA_DIR=%%~fI"

if not exist "%REPO_ROOT%\dist\src\http\main.js" (
  echo [onprem] missing dist\src\http\main.js — run npm run build in %REPO_ROOT% first
  exit /b 1
)

echo [onprem] pack: %PACK_DIR%
echo [onprem] repo: %REPO_ROOT%
echo [onprem] bind http://%HOST%:%PORT% ^(npm run start:home^)
echo [onprem] DAUP_DATA_DIR=%DAUP_DATA_DIR%
echo [onprem] DATABASE_URL parked for this pack ^(LevelDB at DAUP_DATA_DIR^)

cd /d "%REPO_ROOT%"
call npm run start:home
exit /b %ERRORLEVEL%

:load_dotenv
if not exist "%~1" goto :eof
for /f "usebackq eol=# tokens=1,* delims==" %%A in ("%~1") do (
  if not "%%A"=="" if not defined %%A set "%%A=%%B"
)
goto :eof
