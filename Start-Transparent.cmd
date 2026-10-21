@echo off
cd /d "%~dp0"
where node >nul 2>nul
if errorlevel 1 goto missing
if exist node_modules\electron\dist\electron.exe goto build
set ELECTRON_MIRROR=https://npmmirror.com/mirrors/electron/
set ELECTRON_SKIP_BINARY_DOWNLOAD=
call npm ci --no-audit --no-fund
if errorlevel 1 goto failed
:build
call npm run build
if errorlevel 1 goto failed
call npm run desktop -- --compact
if errorlevel 1 goto failed
goto end
:missing
echo Please install Node.js 22.12 or newer first.
:failed
pause
:end
