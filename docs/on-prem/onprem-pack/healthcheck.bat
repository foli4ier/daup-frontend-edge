@echo off
REM On-prem pack: GET /health → ok/fail. Optional tools/call seednode_status.
setlocal EnableExtensions EnableDelayedExpansion

set "PACK_DIR=%~dp0"
if "%PACK_DIR:~-1%"=="\" set "PACK_DIR=%PACK_DIR:~0,-1%"

if exist "%PACK_DIR%\.env" (
  for /f "usebackq eol=# tokens=1,* delims==" %%A in ("%PACK_DIR%\.env") do (
    if not "%%A"=="" if not defined %%A set "%%A=%%B"
  )
)
if exist "%PACK_DIR%\..\.env" (
  for /f "usebackq eol=# tokens=1,* delims==" %%A in ("%PACK_DIR%\..\.env") do (
    if not "%%A"=="" if not defined %%A set "%%A=%%B"
  )
)

if not defined PORT set "PORT=8080"
set "HEALTH_URL=http://127.0.0.1:%PORT%/health"
set "MCP_URL=http://127.0.0.1:%PORT%/mcp"

where curl >nul 2>&1
if errorlevel 1 (
  echo fail
  echo [onprem] curl is required for healthcheck
  exit /b 1
)

curl.exe -sf "%HEALTH_URL%" >nul 2>&1
if errorlevel 1 (
  echo fail
  set "HEALTH_OK=0"
) else (
  echo ok
  set "HEALTH_OK=1"
)

if not defined COMPANY_ID if not defined OWNER_EMAIL (
  if "!HEALTH_OK!"=="1" exit /b 0
  exit /b 1
)

where node >nul 2>&1
if errorlevel 1 (
  echo [onprem] skip seednode_status ^(node not found^)
  if "!HEALTH_OK!"=="1" exit /b 0
  exit /b 1
)

for /f "delims=" %%P in ('node -e "const args={}; if (process.env.COMPANY_ID) args.companyId=process.env.COMPANY_ID; if (process.env.OWNER_EMAIL) args.ownerEmail=process.env.OWNER_EMAIL; process.stdout.write(JSON.stringify({jsonrpc:\"2.0\",id:1,method:\"tools/call\",params:{name:\"seednode_status\",arguments:args}}));"') do set "PAYLOAD=%%P"

for /f "delims=" %%R in ('curl.exe -s -H "content-type: application/json" -d "!PAYLOAD!" "%MCP_URL%" 2^>nul') do set "STATUS_RAW=%%R"
if defined STATUS_RAW echo !STATUS_RAW!

if defined STATUS_RAW (
  echo !STATUS_RAW! | node -e "let raw='';process.stdin.on('data',c=>raw+=c);process.stdin.on('end',()=>{try{const rpc=JSON.parse(raw);const text=rpc&&rpc.result&&rpc.result.content&&rpc.result.content[0]&&rpc.result.content[0].text;const status=text?JSON.parse(text):rpc;console.log(status&&status.connected===true?'seednode_status.connected=true':'seednode_status.connected=false');}catch(e){console.log('seednode_status.connected=false');}});"
) else (
  echo seednode_status.connected=false
)

if "!HEALTH_OK!"=="1" exit /b 0
exit /b 1
