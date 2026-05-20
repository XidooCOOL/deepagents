@echo off
REM 电商自动化系统 - Windows 快速启动脚本
REM 本脚本用于在 Windows 环境快速部署和启动项目

setlocal enabledelayedexpansion

cd /d "%~dp0"
set PROJECT_DIR=%cd%
set BACKEND_DIR=%PROJECT_DIR%
set FRONTEND_DIR=%PROJECT_DIR%\frontend

echo ==========================================
echo 电商自动化系统 - Windows 快速启动脚本
echo ==========================================
echo.

:main
if "%1"=="setup" goto setup
if "%1"=="start" goto start
if "%1"=="stop" goto stop
if "%1"=="restart" goto restart
if "%1"=="status" goto status
goto help

:help
echo 用法: quick_start.bat [命令]
echo.
echo 命令:
echo   setup    - 初始化项目（安装依赖等）
echo   start    - 启动所有服务
echo   stop     - 停止所有服务
echo   restart  - 重启所有服务
echo   status   - 查看服务状态
echo   help     - 显示帮助信息
echo.
echo 示例:
echo   quick_start.bat setup    # 首次运行，安装依赖
echo   quick_start.bat start    # 启动服务
echo   quick_start.bat stop     # 停止服务
echo.
goto end

:setup
echo [INFO] 检查环境...

REM 检查 Python
python --version >nul 2>&1
if %errorlevel% neq 0 (
    python3 --version >nul 2>&1
    if %errorlevel% neq 0 (
        echo [ERROR] 未找到 Python，请先安装 Python 3.11+
        goto end
    )
    set PYTHON_CMD=python3
) else (
    set PYTHON_CMD=python
)
echo [SUCCESS] Python 已安装

REM 检查 Node.js
node --version >nul 2>&1
if %errorlevel% neq 0 (
    echo [ERROR] 未找到 Node.js，请先安装 Node.js 18+
    goto end
)
echo [SUCCESS] Node.js 已安装

REM 检查 npm
npm --version >nul 2>&1
if %errorlevel% neq 0 (
    echo [ERROR] 未找到 npm，请先安装 npm
    goto end
)
echo [SUCCESS] npm 已安装

echo.
echo [INFO] 设置后端...
cd %BACKEND_DIR%

REM 检查 uv
uv --version >nul 2>&1
if %errorlevel% neq 0 (
    echo [WARNING] 未找到 uv，尝试安装...
    powershell -Command "Invoke-WebRequest -Uri https://astral.sh/uv/install.ps1 -OutFile install_uv.ps1; PowerShell -ExecutionPolicy Bypass -File install_uv.ps1"
    if exist install_uv.ps1 del install_uv.ps1
)

REM 安装依赖
echo [INFO] 安装 Python 依赖...
uv --version >nul 2>&1
if %errorlevel% equ 0 (
    echo [INFO] 使用 uv 安装...
    uv sync
) else (
    echo [INFO] 使用 pip 安装...
    pip install -e .
)

REM 安装 Playwright
echo [INFO] 安装 Playwright 浏览器...
uv --version >nul 2>&1
if %errorlevel% equ 0 (
    uv run playwright install chromium
) else (
    %PYTHON_CMD% -m playwright install chromium
)

REM 初始化数据库
echo [INFO] 初始化数据库...
if not exist data\db mkdir data\db

echo [SUCCESS] 后端设置完成

echo.
echo [INFO] 设置前端...
cd %FRONTEND_DIR%

REM 使用国内镜像（可选）
if "%CN_MIRROR%"=="1" (
    echo [INFO] 使用国内镜像源...
    npm config set registry https://registry.npmmirror.com
)

REM 安装依赖
echo [INFO] 安装 npm 依赖...
npm install

echo [SUCCESS] 前端设置完成
echo.
echo [SUCCESS] 设置完成！使用 'quick_start.bat start' 启动服务
goto end

:start
echo [INFO] 启动服务...

cd %BACKEND_DIR%
set PYTHONPATH=%BACKEND_DIR%

REM 检查是否已经在运行
if exist backend.pid (
    set /p BACKEND_PID=<backend.pid
    tasklist /FI "PID eq !BACKEND_PID!" >nul 2>&1
    if !errorlevel! equ 0 (
        echo [WARNING] 后端服务已在运行 (PID: !BACKEND_PID!)
    ) else (
        del backend.pid
    )
)

REM 启动后端
echo [INFO] 启动后端服务 (端口 8000)...
if exist uv (
    start /B uv run python -m backend.main > backend.log 2>&1
    echo !errorlevel! > backend.pid
) else (
    start /B %PYTHON_CMD% -m backend.main > backend.log 2>&1
    echo !errorlevel! > backend.pid
)
echo [SUCCESS] 后端服务已启动

REM 等待后端启动
timeout /t 3 /nobreak >nul

REM 启动前端
echo [INFO] 启动前端服务 (端口 5173)...
cd %FRONTEND_DIR%

if exist frontend.pid (
    set /p FRONTEND_PID=<frontend.pid
    tasklist /FI "PID eq !FRONTEND_PID!" >nul 2>&1
    if !errorlevel! equ 0 (
        echo [WARNING] 前端服务已在运行 (PID: !FRONTEND_PID!)
    ) else (
        del frontend.pid
    )
)

start /B npm run dev > frontend.log 2>&1
echo %errorlevel% > frontend.pid
echo [SUCCESS] 前端服务已启动

REM 等待服务启动
timeout /t 3 /nobreak >nul

echo.
echo ==========================================
echo 服务启动完成！
echo ==========================================
echo 后端 API:  http://localhost:8000
echo API 文档:  http://localhost:8000/docs
echo 前端页面:  http://localhost:5173
echo ==========================================
echo.
echo 后端日志:  type %BACKEND_DIR%\backend.log
echo 前端日志:  type %FRONTEND_DIR%\frontend.log
echo.
echo 停止服务:  quick_start.bat stop
echo.
goto end

:stop
echo [INFO] 停止服务...

REM 停止后端
cd %BACKEND_DIR%
if exist backend.pid (
    set /p BACKEND_PID=<backend.pid
    tasklist /FI "PID eq !BACKEND_PID!" >nul 2>&1
    if !errorlevel! equ 0 (
        taskkill /F /PID !BACKEND_PID! >nul 2>&1
        echo [SUCCESS] 后端服务已停止
    )
    if exist backend.pid del backend.pid
    if exist backend.log del backend.log
)

REM 停止前端
cd %FRONTEND_DIR%
if exist frontend.pid (
    set /p FRONTEND_PID=<frontend.pid
    tasklist /FI "PID eq !FRONTEND_PID!" >nul 2>&1
    if !errorlevel! equ 0 (
        taskkill /F /PID !FRONTEND_PID! >nul 2>&1
        echo [SUCCESS] 前端服务已停止
    )
    if exist frontend.pid del frontend.pid
    if exist frontend.log del frontend.log
)

echo [SUCCESS] 所有服务已停止
goto end

:restart
echo [INFO] 重启服务...
call quick_start.bat stop
timeout /t 2 /nobreak >nul
call quick_start.bat start
goto end

:status
echo [INFO] 检查服务状态...

set BACKEND_RUNNING=0
set FRONTEND_RUNNING=0

REM 检查后端
cd %BACKEND_DIR%
if exist backend.pid (
    set /p BACKEND_PID=<backend.pid
    tasklist /FI "PID eq !BACKEND_PID!" >nul 2>&1
    if !errorlevel! equ 0 (
        echo [SUCCESS] 后端服务运行中 (PID: !BACKEND_PID!)
        set BACKEND_RUNNING=1
    )
)
if !BACKEND_RUNNING! equ 0 (
    echo [WARNING] 后端服务未运行
)

REM 检查前端
cd %FRONTEND_DIR%
if exist frontend.pid (
    set /p FRONTEND_PID=<frontend.pid
    tasklist /FI "PID eq !FRONTEND_PID!" >nul 2>&1
    if !errorlevel! equ 0 (
        echo [SUCCESS] 前端服务运行中 (PID: !FRONTEND_PID!)
        set FRONTEND_RUNNING=1
    )
)
if !FRONTEND_RUNNING! equ 0 (
    echo [WARNING] 前端服务未运行
)

if !BACKEND_RUNNING! equ 1 (
    if !FRONTEND_RUNNING! equ 1 (
        echo.
        echo [SUCCESS] 所有服务运行正常！
        echo [INFO] 访问地址: http://localhost:5173
    )
)

goto end

:end
endlocal
