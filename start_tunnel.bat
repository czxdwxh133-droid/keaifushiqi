@echo off
chcp 65001 >nul
title DataPilot Cloudflare Tunnel

echo.
echo ╔══════════════════════════════════════╗
echo ║   DataPilot Cloudflare 隧道启动器    ║
echo ╚══════════════════════════════════════╝
echo.
echo [1] 检查后端是否在运行...
curl -s http://localhost:8080/api/ping >nul 2>&1
if %errorlevel% neq 0 (
    echo [!] 后端未运行，请先启动 start.bat
    pause
    exit /b 1
)
echo [√] 后端已运行 (localhost:8080)
echo.
echo [2] 启动 Cloudflare 隧道...
echo [*] 正在连接，请稍候...
echo.
echo ──────────────────────────────────────
echo   隧道连接成功后，会显示如下链接：
echo   https://xxxxx-xxxxx.trycloudflare.com
echo   复制这个链接发给 HR 即可！
echo ──────────────────────────────────────
echo.

"%USERPROFILE%\cloudflared.exe" tunnel --url http://localhost:8080
