@echo off
cd /d "%~dp0"
where node >nul 2>nul
if errorlevel 1 goto missing
if exist node_modules\tsx goto build
set ELECTRON_SKIP_BINARY_DOWNLOAD=1
call npm ci --no-audit --no-fund
if errorlevel 1 goto failed
:build
call npm run build
if errorlevel 1 goto failed
echo.
echo Open http://localhost:3000 in your browser.
echo Share the LAN address printed below with your colleagues.
echo Keep this window open while playing. Ctrl+C stops the server.
echo.
node -e "fetch('http://127.0.0.1:3000/api/health',{signal:AbortSignal.timeout(1500)}).then(r=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))"
if not errorlevel 1 goto running
call npm start
goto end
:running
echo Game service is already running at http://localhost:3000
pause
goto end
:missing
echo Please install Node.js 22.12 or newer first.
:failed
pause
:end
