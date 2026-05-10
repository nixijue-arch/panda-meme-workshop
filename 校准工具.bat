@echo off
chcp 65001 >nul
title PandaHead 表情对齐工具

cd /d "%~dp0"

echo.
echo ================================================
echo   PandaHead 表情对齐工具 (DEV-only)
echo ================================================
echo.
echo 启动 vite dev server...
echo 浏览器即将自动打开校准页面
echo.
echo 用完后关闭这个窗口即可停服务器
echo ================================================
echo.

REM 5 秒后开浏览器（让 vite 先启动），跳到 calibrate 页
start "" cmd /c "timeout /t 5 /nobreak >nul && start http://localhost:5173/?page=calibrate"

REM 跑 vite (优先 bun，fallback npm)
where bun >nul 2>nul
if %errorlevel%==0 (
  bun run dev
) else (
  npm run dev
)

pause
