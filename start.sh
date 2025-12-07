#!/bin/bash

# 设置项目根目录
PROJECT_ROOT=$(pwd)
LOG_DIR="$PROJECT_ROOT/logs"

# 创建日志目录
if [ ! -d "$LOG_DIR" ]; then
    echo "Creating logs directory: $LOG_DIR"
    mkdir -p "$LOG_DIR"
fi

echo "=================================================="
echo "Starting EasyQuant Services..."
echo "Date: $(date)"
echo "Logs directory: $LOG_DIR"
echo "=================================================="

# --- 1. 启动后端 (Server) ---
echo "[Server] Starting backend service..."

# 检查端口 8000 是否被占用
if lsof -Pi :8000 -sTCP:LISTEN -t >/dev/null ; then
    echo "[Server] Warning: Port 8000 is already in use. Please stop the existing service first."
else
    # 使用 nohup 后台启动，拆分 stdout 和 stderr
    # 注意：需确保 python 环境已激活或使用绝对路径
    # 这里假设当前 shell 已经激活了正确的 venv，或者 python3 是正确的解释器
    nohup python3 server/main.py > "$LOG_DIR/server.log" 2> "$LOG_DIR/server.err.log" &
    SERVER_PID=$!
    echo "[Server] Started with PID: $SERVER_PID"
    echo "         Stdout: $LOG_DIR/server.log"
    echo "         Stderr: $LOG_DIR/server.err.log"
fi

echo ""

# --- 2. 启动前端 (Client) ---
echo "[Client] Starting frontend service..."

# 检查前端端口 (通常 Vite 是 5173，但也可能变)
# 这里不做严格检查，因为 Vite 会自动寻找下一个可用端口

cd "$PROJECT_ROOT/client" || exit

# 使用 npm run dev 启动
nohup npm run dev > "$LOG_DIR/client.log" 2> "$LOG_DIR/client.err.log" &
CLIENT_PID=$!
echo "[Client] Started with PID: $CLIENT_PID"
echo "         Stdout: $LOG_DIR/client.log"
echo "         Stderr: $LOG_DIR/client.err.log"

cd "$PROJECT_ROOT"

echo "=================================================="
echo "Services are running in background."
echo "Use 'tail -f logs/*.log' to monitor logs."
echo "To stop services, find PIDs via 'ps aux | grep -E \"python3 server/main.py|npm run dev\"' or use a stop script."
echo "=================================================="
