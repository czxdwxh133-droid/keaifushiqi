@echo off
chcp 65001 >nul
title DataPilot - 一键启动
cd /d "%~dp0"

echo ========================================
echo   DataPilot - 一键启动
echo   https://datapilot.nihaofushiqi.asia
echo ========================================
echo.

:: Check frontend
if not exist "dist\index.html" (
    echo [!] dist\index.html not found
    echo [!] Run: npm install ^&^& npm run build
    echo.
    pause
    exit /b 1
)
echo [OK] 前端已构建

:: Proxy (uncomment if needed)
::set HTTP_PROXY=http://127.0.0.1:7890
::set HTTPS_PROXY=http://127.0.0.1:7890

echo.
echo [1/2] 正在启动后端 (端口 8080)...
start "DataPilot-后端" cmd /k python main.py
echo 后端已启动。
timeout /t 5 /nobreak >nul

echo.
echo [2/2] 正在启动 Cloudflare 隧道...
echo.
echo   固定网址：https://datapilot.nihaofushiqi.asia
echo.
start "Cloudflare隧道 - datapilot.nihaofushiqi.asia" cmd /k cloudflared.exe tunnel --config cloudflared.yml run

echo ========================================
echo   启动完成！
echo.
echo   访问地址：https://datapilot.nihaofushiqi.asia （长期固定）
echo   后端窗口和隧道窗口不要关闭
echo ========================================
echo.
pause
