#!/bin/bash

# 电商自动化系统 - 快速启动脚本
# 本脚本用于在本地环境快速部署和启动项目

set -e

# 颜色输出
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# 项目目录
PROJECT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
BACKEND_DIR="$PROJECT_DIR"
FRONTEND_DIR="$PROJECT_DIR/frontend"

# 日志函数
log_info() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

log_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

log_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# 检查命令是否存在
check_command() {
    if command -v "$1" &> /dev/null; then
        return 0
    else
        return 1
    fi
}

# 检查环境
check_environment() {
    log_info "检查环境..."
    
    local env_ok=1
    
    # 检查 Python
    if check_command python; then
        PYTHON_CMD=python
    elif check_command python3; then
        PYTHON_CMD=python3
    else
        log_error "未找到 Python，请先安装 Python 3.11+"
        env_ok=0
    fi
    
    # 检查 Node.js
    if check_command node; then
        NODE_VERSION=$(node --version | grep -Eo '[0-9]+' | head -1)
        if [ "$NODE_VERSION" -lt 18 ]; then
            log_warning "Node.js 版本过低 ($(node --version))，建议使用 18+"
        fi
    else
        log_error "未找到 Node.js，请先安装 Node.js 18+"
        env_ok=0
    fi
    
    # 检查 npm
    if ! check_command npm; then
        log_error "未找到 npm，请先安装 npm"
        env_ok=0
    fi
    
    if [ "$env_ok" -eq 0 ]; then
        log_error "环境检查失败，请先安装必要的依赖"
        exit 1
    fi
    
    log_success "环境检查通过"
}

# 安装后端依赖
setup_backend() {
    log_info "设置后端..."
    
    cd "$BACKEND_DIR"
    
    # 检查 uv
    if ! check_command uv; then
        log_warning "未找到 uv，尝试安装..."
        if [[ "$OSTYPE" == "darwin"* || "$OSTYPE" == "linux-gnu"* ]]; then
            curl -LsSf https://astral.sh/uv/install.sh | sh
        else
            log_warning "无法自动安装 uv，请手动安装"
        fi
    fi
    
    # 安装依赖
    if check_command uv; then
        log_info "使用 uv 安装依赖..."
        uv sync
    else
        log_info "使用 pip 安装依赖..."
        pip install -e .
    fi
    
    # 安装 Playwright 浏览器
    log_info "安装 Playwright 浏览器..."
    if check_command uv; then
        uv run playwright install chromium
    else
        $PYTHON_CMD -m playwright install chromium
    fi
    
    # 初始化数据库
    log_info "初始化数据库..."
    mkdir -p data/db
    
    log_success "后端设置完成"
}

# 安装前端依赖
setup_frontend() {
    log_info "设置前端..."
    
    cd "$FRONTEND_DIR"
    
    # 使用国内镜像（如果需要）
    if [ -n "$CN_MIRROR" ]; then
        log_info "使用国内镜像源..."
        npm config set registry https://registry.npmmirror.com
    fi
    
    # 安装依赖
    log_info "安装 npm 依赖..."
    npm install
    
    log_success "前端设置完成"
}

# 启动服务
start_services() {
    log_info "启动服务..."
    
    # 设置 PYTHONPATH
    export PYTHONPATH="$BACKEND_DIR"
    
    # 启动后端（后台）
    log_info "启动后端服务 (端口 8000)..."
    cd "$BACKEND_DIR"
    if check_command uv; then
        nohup uv run python -m backend.main > backend.log 2>&1 &
    else
        nohup $PYTHON_CMD -m backend.main > backend.log 2>&1 &
    fi
    BACKEND_PID=$!
    echo "$BACKEND_PID" > backend.pid
    log_success "后端服务已启动 (PID: $BACKEND_PID)"
    
    # 等待后端启动
    sleep 3
    
    # 启动前端（后台）
    log_info "启动前端服务 (端口 5173)..."
    cd "$FRONTEND_DIR"
    nohup npm run dev > frontend.log 2>&1 &
    FRONTEND_PID=$!
    echo "$FRONTEND_PID" > frontend.pid
    log_success "前端服务已启动 (PID: $FRONTEND_PID)"
    
    # 等待服务启动
    sleep 3
    
    log_success ""
    log_success "=========================================="
    log_success "服务启动完成！"
    log_success "=========================================="
    log_success "后端 API:  http://localhost:8000"
    log_success "API 文档:  http://localhost:8000/docs"
    log_success "前端页面:  http://localhost:5173"
    log_success "=========================================="
    log_success ""
    log_success "后端日志:  tail -f $BACKEND_DIR/backend.log"
    log_success "前端日志:  tail -f $FRONTEND_DIR/frontend.log"
    log_success ""
    log_success "停止服务:  ./quick_start.sh stop"
    log_success ""
}

# 停止服务
stop_services() {
    log_info "停止服务..."
    
    cd "$BACKEND_DIR"
    
    if [ -f backend.pid ]; then
        BACKEND_PID=$(cat backend.pid 2>/dev/null || true)
        if kill -0 "$BACKEND_PID" 2>/dev/null; then
            kill -9 "$BACKEND_PID" 2>/dev/null || true
            log_success "后端服务已停止"
        fi
        rm -f backend.pid backend.log
    fi
    
    cd "$FRONTEND_DIR"
    if [ -f frontend.pid ]; then
        FRONTEND_PID=$(cat frontend.pid 2>/dev/null || true)
        if kill -0 "$FRONTEND_PID" 2>/dev/null; then
            kill -9 "$FRONTEND_PID" 2>/dev/null || true
            log_success "前端服务已停止"
        fi
        rm -f frontend.pid frontend.log
    fi
    
    log_success "所有服务已停止"
}

# 查看服务状态
check_status() {
    log_info "检查服务状态..."
    
    cd "$BACKEND_DIR"
    
    local backend_running=0
    local frontend_running=0
    
    if [ -f backend.pid ]; then
        BACKEND_PID=$(cat backend.pid 2>/dev/null || true)
        if kill -0 "$BACKEND_PID" 2>/dev/null; then
            log_success "后端服务运行中 (PID: $BACKEND_PID)"
            backend_running=1
        fi
    fi
    
    if [ $backend_running -eq 0 ]; then
        log_warning "后端服务未运行"
    fi
    
    cd "$FRONTEND_DIR"
    if [ -f frontend.pid ]; then
        FRONTEND_PID=$(cat frontend.pid 2>/dev/null || true)
        if kill -0 "$FRONTEND_PID" 2>/dev/null; then
            log_success "前端服务运行中 (PID: $FRONTEND_PID)"
            frontend_running=1
        fi
    fi
    
    if [ $frontend_running -eq 0 ]; then
        log_warning "前端服务未运行"
    fi
    
    if [ $backend_running -eq 1 ] && [ $frontend_running -eq 1 ]; then
        log_success ""
        log_success "所有服务运行正常！"
        log_success "访问地址: http://localhost:5173"
    fi
}

# 显示帮助
show_help() {
    echo "电商自动化系统 - 快速启动脚本"
    echo ""
    echo "用法: $0 [命令]"
    echo ""
    echo "命令:"
    echo "  setup    - 初始化项目（安装依赖等）"
    echo "  start    - 启动所有服务"
    echo "  stop     - 停止所有服务"
    echo "  restart  - 重启所有服务"
    echo "  status   - 查看服务状态"
    echo "  help     - 显示帮助信息"
    echo ""
    echo "示例:"
    echo "  $0 setup    # 首次运行，安装依赖"
    echo "  $0 start    # 启动服务"
    echo "  $0 stop     # 停止服务"
    echo ""
}

# 主函数
main() {
    cd "$PROJECT_DIR"
    
    case "${1:-help}" in
        setup)
            check_environment
            setup_backend
            setup_frontend
            log_success "设置完成！使用 '$0 start' 启动服务"
            ;;
        start)
            start_services
            ;;
        stop)
            stop_services
            ;;
        restart)
            stop_services
            sleep 2
            start_services
            ;;
        status)
            check_status
            ;;
        help)
            show_help
            ;;
        *)
            log_error "未知命令: $1"
            show_help
            exit 1
            ;;
    esac
}

main "$@"
