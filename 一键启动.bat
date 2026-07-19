@echo off
chcp 65001 >nul
title DataPilot 一键启动
cd /d "%~dp0"

echo.
echo ╔══════════════════════════════════════╗
echo ║       DataPilot 一键启动             ║
echo ╚══════════════════════════════════════╝
echo.

:: ── 代理设置（如果 DeepSeek 连不上，删掉下一行的 :: 并改为你的端口）──
::set HTTP_PROXY=http://127.0.0.1:7890
::set HTTPS_PROXY=http://127.0.0.1:7890

:: ── 1. 启动后端 ──
echo [1/2] 启动 Python 后端...
start "DataPilot后端" /min cmd /c "cd /d %~dp0 && set HTTP_PROXY=%HTTP_PROXY% && set HTTPS_PROXY=%HTTPS_PROXY% && python main.py"
echo [√] 后端正在启动...

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
echo   永久链接: https://datapilot.nihaofushiqi.asia
echo   隧道已启动，可直接访问
echo ──────────────────────────────────────
echo.

set HOME=%USERPROFILE%
cloudflared.exe tunnel --config cloudflared.yml run datapilot

pause
