#!/bin/bash

# 电商助手服务管理脚本

# 颜色定义
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# 项目根目录
PROJECT_ROOT="/workspace/examples/ecommerce_agent"

# 启动后端服务
start_backend() {
    echo -e "${YELLOW}启动后端服务...${NC}"
    cd "$PROJECT_ROOT"
    export PYTHONPATH="$PROJECT_ROOT:$PYTHONPATH"
    nohup uvicorn backend.main:app --host 0.0.0.0 --port 8000 --reload > backend.log 2>&1 &
    echo $! > backend.pid
    sleep 3
    
    if curl -s http://localhost:8000/ > /dev/null 2>&1; then
        echo -e "${GREEN}✓ 后端服务启动成功 (http://localhost:8000)${NC}"
    else
        echo -e "${RED}✗ 后端服务启动失败${NC}"
        cat backend.log
    fi
}

# 启动前端服务
start_frontend() {
    echo -e "${YELLOW}启动前端服务...${NC}"
    cd "$PROJECT_ROOT/frontend"
    nohup npm run dev -- --host 0.0.0.0 --port 5173 > frontend.log 2>&1 &
    echo $! > frontend.pid
    sleep 5
    
    if curl -s http://localhost:5173/ > /dev/null 2>&1; then
        echo -e "${GREEN}✓ 前端服务启动成功 (http://localhost:5173)${NC}"
    else
        echo -e "${RED}✗ 前端服务启动失败${NC}"
        cat frontend.log
    fi
}

# 停止后端服务
stop_backend() {
    if [ -f backend.pid ]; then
        echo -e "${YELLOW}停止后端服务...${NC}"
        kill $(cat backend.pid) 2>/dev/null
        rm backend.pid
        echo -e "${GREEN}✓ 后端服务已停止${NC}"
    else
        echo -e "${YELLOW}后端服务未运行${NC}"
    fi
}

# 停止前端服务
stop_frontend() {
    if [ -f frontend.pid ]; then
        echo -e "${YELLOW}停止前端服务...${NC}"
        kill $(cat frontend.pid) 2>/dev/null
        rm frontend.pid
        echo -e "${GREEN}✓ 前端服务已停止${NC}"
    else
        echo -e "${YELLOW}前端服务未运行${NC}"
    fi
}

# 查看服务状态
status() {
    echo -e "\n${YELLOW}=== 服务状态 ===${NC}\n"
    
    # 检查后端
    if curl -s http://localhost:8000/ > /dev/null 2>&1; then
        echo -e "${GREEN}✓ 后端服务${NC} - 运行中 (http://localhost:8000)"
    else
        echo -e "${RED}✗ 后端服务${NC} - 未运行"
    fi
    
    # 检查前端
    if curl -s http://localhost:5173/ > /dev/null 2>&1; then
        echo -e "${GREEN}✓ 前端服务${NC} - 运行中 (http://localhost:5173)"
    else
        echo -e "${RED}✗ 前端服务${NC} - 未运行"
    fi
    
    echo ""
}

# 启动所有服务
start() {
    echo -e "\n${YELLOW}=== 启动电商助手服务 ===${NC}\n"
    start_backend
    start_frontend
    echo -e "\n${GREEN}=== 所有服务启动完成 ===${NC}\n"
    status
}

# 停止所有服务
stop() {
    echo -e "\n${YELLOW}=== 停止电商助手服务 ===${NC}\n"
    stop_backend
    stop_frontend
    echo -e "\n${GREEN}=== 所有服务已停止 ===${NC}\n"
}

# 查看日志
logs() {
    echo -e "\n${YELLOW}=== 最近日志 ===${NC}\n"
    echo -e "${YELLOW}--- 后端日志 (最后20行) ---${NC}"
    tail -n 20 backend.log 2>/dev/null || echo "暂无日志"
    echo -e "\n${YELLOW}--- 前端日志 (最后20行) ---${NC}"
    tail -n 20 frontend.log 2>/dev/null || echo "暂无日志"
}

# 显示帮助
help() {
    echo -e "\n${YELLOW}电商助手服务管理脚本${NC}"
    echo -e "\n用法: $0 {start|stop|restart|status|logs|help}"
    echo ""
    echo "命令:"
    echo "  start   - 启动所有服务"
    echo "  stop    - 停止所有服务"
    echo "  restart - 重启所有服务"
    echo "  status  - 查看服务状态"
    echo "  logs    - 查看服务日志"
    echo "  help    - 显示帮助信息"
    echo ""
    echo "示例:"
    echo "  $0 start    # 启动服务"
    echo "  $0 status   # 查看状态"
    echo "  $0 logs     # 查看日志"
    echo ""
}

# 主逻辑
case "$1" in
    start)
        start
        ;;
    stop)
        stop
        ;;
    restart)
        stop
        sleep 2
        start
        ;;
    status)
        status
        ;;
    logs)
        logs
        ;;
    help|--help|-h)
        help
        ;;
    *)
        echo -e "${RED}未知命令: $1${NC}"
        help
        exit 1
        ;;
esac

exit 0
