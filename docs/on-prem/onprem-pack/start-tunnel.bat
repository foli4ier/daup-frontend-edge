@echo off
REM Template: Cloudflare named tunnel → local house node http://127.0.0.1:8080
REM Placeholder hostname: mcp.example.com
REM Do not bake real tunnel ids, tokens, or credentials into this pack.
setlocal EnableExtensions EnableDelayedExpansion

set "PACK_DIR=%~dp0"
if "%PACK_DIR:~-1%"=="\" set "PACK_DIR=%PACK_DIR:~0,-1%"

if exist "%PACK_DIR%\.env" (
  for /f "usebackq eol=# tokens=1,* delims==" %%A in ("%PACK_DIR%\.env") do (
    if not "%%A"=="" if not defined %%A set "%%A=%%B"
  )
)

if not defined PORT set "PORT=8080"
if not defined CLOUDFLARE_TUNNEL_ID set "CLOUDFLARE_TUNNEL_ID=REPLACE_TUNNEL_ID"
if not defined CLOUDFLARE_HOSTNAME set "CLOUDFLARE_HOSTNAME=mcp.example.com"
if not defined TUNNEL_LOCAL_URL set "TUNNEL_LOCAL_URL=http://127.0.0.1:%PORT%"

echo [onprem] Cloudflare tunnel template (fill in on this machine; do not commit secrets)
echo.
echo   Named tunnel (Hub public https):
echo     hostname : %CLOUDFLARE_HOSTNAME%
echo     service  : %TUNNEL_LOCAL_URL%
echo     tunnel id: %CLOUDFLARE_TUNNEL_ID%
echo.
echo   Example config.yml (keep credentials off this repo):
echo.
echo     tunnel: %CLOUDFLARE_TUNNEL_ID%
echo     credentials-file: %CLOUDFLARE_CREDENTIALS_FILE%
echo     ingress:
echo       - hostname: %CLOUDFLARE_HOSTNAME%
echo         service: %TUNNEL_LOCAL_URL%
echo       - service: http_status:404
echo.
echo   Then:
echo     cloudflared tunnel route dns %CLOUDFLARE_TUNNEL_ID% %CLOUDFLARE_HOSTNAME%
echo     cloudflared tunnel run %CLOUDFLARE_TUNNEL_ID%
echo.
echo   Quick try (random trycloudflare.com URL, not a stable Hub endpoint):
echo     cloudflared tunnel --url %TUNNEL_LOCAL_URL%
echo.
echo   Hub attach after the named tunnel is up:
echo     seednode_attach mode=on-prem endpoint=https://%CLOUDFLARE_HOSTNAME% companyId=^<existing^> placeId=^<opened place^>
echo.

where cloudflared >nul 2>&1
if errorlevel 1 (
  echo [onprem] cloudflared not found — install it, then re-run with CLOUDFLARE_TUNNEL_ID set.
  exit /b 1
)

if "%CLOUDFLARE_TUNNEL_ID%"=="REPLACE_TUNNEL_ID" (
  echo [onprem] Set CLOUDFLARE_TUNNEL_ID to your named tunnel id (placeholder still in place).
  exit /b 1
)
if "%CLOUDFLARE_TUNNEL_ID%"=="" (
  echo [onprem] Set CLOUDFLARE_TUNNEL_ID to your named tunnel id (placeholder still in place).
  exit /b 1
)

if defined CLOUDFLARE_CREDENTIALS_FILE (
  cloudflared tunnel --credentials-file "%CLOUDFLARE_CREDENTIALS_FILE%" run "%CLOUDFLARE_TUNNEL_ID%"
  exit /b %ERRORLEVEL%
)

cloudflared tunnel run "%CLOUDFLARE_TUNNEL_ID%"
exit /b %ERRORLEVEL%
