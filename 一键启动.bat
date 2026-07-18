@echo off
chcp 65001 >nul
title DataPilot 一键启动
cd /d "%~dp0"

echo.
echo ╔══════════════════════════════════════╗
echo ║       DataPilot 一键启动             ║
echo ╚══════════════════════════════════════╝
echo.

:: ── 1. 启动后端 ──
echo [1/2] 启动 Python 后端...
start "DataPilot后端" /min cmd /c "cd /d %~dp0 && python main.py"
echo [√] 后端正在启动...

:: 等待后端就绪
:wait_backend
timeout /t 2 /nobreak >nul
curl -s http://localhost:8080/api/ping >nul 2>&1
if %errorlevel% neq 0 (
    echo [*] 等待后端就绪...
    goto wait_backend
)
echo [√] 后端已就绪 (localhost:8080)
echo.

:: ── 2. 启动隧道 ──
echo [2/2] 启动 Cloudflare 隧道...
echo.
echo ──────────────────────────────────────
echo   下方出现 trycloudflare.com 链接
echo   即表示启动成功，复制发给 HR 即可
echo ──────────────────────────────────────
echo.

"%USERPROFILE%\cloudflared.exe" tunnel --url http://localhost:8080

pause
