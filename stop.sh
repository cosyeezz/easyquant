#!/bin/bash

echo "Stopping EasyQuant Services..."

# 1. 停止后端
# 查找匹配 "server/main.py" 的 Python 进程
SERVER_PIDS=$(ps aux | grep "python3 server/main.py" | grep -v grep | awk '{print $2}')

if [ -z "$SERVER_PIDS" ]; then
    echo "[Server] No running process found."
else
    echo "[Server] Killing PIDs: $SERVER_PIDS"
    kill $SERVER_PIDS
fi

# 2. 停止前端
# 查找匹配 "vite" 的进程 (npm run dev 通常会启动 vite)
# 注意：直接杀 npm 可能杀不掉子进程 vite，所以直接找 vite
# 或者找 "npm run dev"
CLIENT_PIDS=$(ps aux | grep "vite" | grep -v grep | awk '{print $2}')

if [ -z "$CLIENT_PIDS" ]; then
    echo "[Client] No running process found."
else
    echo "[Client] Killing PIDs: $CLIENT_PIDS"
    kill $CLIENT_PIDS
fi

echo "Done."
