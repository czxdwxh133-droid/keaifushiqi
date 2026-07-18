@echo off
chcp 65001 >nul
title DataPilot 智能数据分析助手

echo ======================================
echo   DataPilot - 智能数据分析助手
echo ======================================
echo.

cd /d "%~dp0"

echo [1/2] 启动后端服务 (端口 8080)...
start "DataPilot-后端" cmd /c "python main.py"
echo       后端启动中，请等待...

REM 等待后端就绪
:wait_backend
timeout /t 2 /nobreak >nul
curl -s http://localhost:8080/api/ping >nul 2>&1
if %errorlevel% neq 0 (
    echo       等待后端就绪...
    goto wait_backend
)
echo       后端就绪！

echo.
echo [2/2] 启动前端界面 (端口 5173)...
start "DataPilot-前端" cmd /c "npm run dev"
echo       前端启动中...

REM 等待前端就绪并打开浏览器
timeout /t 3 /nobreak >nul
start http://localhost:5173

echo.
echo ======================================
echo   启动完成！浏览器已打开
echo   后端: http://localhost:8080
echo   前端: http://localhost:5173
echo ======================================
echo.
echo   关闭本窗口不会影响程序运行
echo   按任意键退出...
pause >nul
