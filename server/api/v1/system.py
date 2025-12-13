from fastapi import APIRouter, HTTPException
from pathlib import Path
import os
import logging
import asyncio
import json
import psutil
import time
from queue import SimpleQueue
from server.common.websocket_manager import manager

router = APIRouter()

# Assuming logs directory is relative to project root (where manage.py/main.py runs)
# Since we run from project root, 'logs' should be correct.
LOG_DIR = Path("logs")

# ================= System Monitoring Workers & Handlers =================

# 1. 线程安全的队列，用于连接同步的 Logging 世界和异步的 WebSocket 世界
log_queue = SimpleQueue()

class WebSocketLogHandler(logging.Handler):
    """
    自定义日志处理器。
    拦截日志记录，将其放入队列。
    """
    def __init__(self):
        super().__init__()
        self.setFormatter(logging.Formatter('%(asctime)s [%(levelname)s] %(name)s: %(message)s', datefmt='%Y-%m-%d %H:%M:%S'))

    def emit(self, record):
        try:
            # --- Anti-Loop Filter ---
            # 1. Ignore websockets internal logs
            if record.name.startswith("websockets"):
                return
            # 2. Ignore uvicorn access logs for the WebSocket endpoint itself
            if record.name == "uvicorn.access" and "/ws/system" in record.getMessage():
                return
            # 3. Ignore uvicorn error logs related to WebSocket disconnects (spammy)
            if record.name == "uvicorn.error" and "WebSocket" in record.getMessage():
                return
            # ------------------------

            msg = self.format(record)
            log_entry = {
                "timestamp": record.asctime if hasattr(record, 'asctime') else logging.Formatter().formatTime(record),
                "level": record.levelname,
                "logger": record.name,
                "message": record.getMessage(),
                "full_text": msg
            }
            log_queue.put(log_entry)
        except Exception:
            self.handleError(record)

async def log_broadcast_worker():
    """
    后台任务：日志广播器。
    从队列取日志，推送到 'logs' 频道。
    """
    while True:
        try:
            while not log_queue.empty():
                entry = log_queue.get_nowait()
                # 广播到 'logs' 频道
                await manager.broadcast("logs", entry)
            
            await asyncio.sleep(0.05)
        except Exception as e:
            print(f"Error in log broadcaster: {e}")
            await asyncio.sleep(1)

async def system_status_worker():
    """
    后台任务：系统心跳广播器。
    每 2 秒推送到 'system.status' 频道。
    """
    process = psutil.Process()
    # 静态数据：系统总内存（MB）
    sys_total_mb = psutil.virtual_memory().total / 1024 / 1024
    
    while True:
        try:
            # 动态数据：系统内存使用率
            # 注意：虽然 total 不变，但 available/percent 是会变的，所以仍需调用 virtual_memory()
            # 但我们可以只取 percent，或者 psutil 有更高效的方法吗？
            # psutil.virtual_memory() 会读取 /proc/meminfo，这是一次系统调用。
            # 既然需要 percent，就必须调它。
            sys_mem = psutil.virtual_memory()
            
            # 获取系统状态
            status_data = {
                "uptime": time.time() - process.create_time(),
                "cpu_percent": process.cpu_percent(),
                "memory_mb": process.memory_info().rss / 1024 / 1024, # 进程内存
                "sys_memory_percent": sys_mem.percent,                # 系统内存使用率
                "sys_memory_total_mb": sys_total_mb,                  # 系统总内存 (Static)
                "timestamp": time.time(),
                "status": "running"
            }
            await manager.broadcast("system.status", status_data)
            await asyncio.sleep(2)
        except Exception as e:
            print(f"Error in status broadcaster: {e}")
            await asyncio.sleep(5)

# ================= API Endpoints =================

@router.get("/logs/{service}")
async def get_logs(service: str, lines: int = 100):
    if service not in ["server", "client", "server.err", "client.err"]:
        raise HTTPException(status_code=400, detail="Invalid service name")
    
    # Handle error logs too
    filename = f"{service}.log" if not service.endswith(".err") else f"{service}.log"
    # Actually filename is just service.log or service.err.log?
    # manage.py names: server.log, server.err.log
    
    if service == "server": filename = "server.log"
    elif service == "client": filename = "client.log"
    elif service == "server.err": filename = "server.err.log"
    elif service == "client.err": filename = "client.err.log"
    
    log_file = LOG_DIR / filename
    if not log_file.exists():
        return {"lines": ["Log file not found."]}
    
    try:
        # Efficient tail is hard in pure python without reading whole file, 
        # but for < 10MB logs, readlines() is acceptable.
        # Improve later if needed.
        with open(log_file, "r", encoding="utf-8", errors="replace") as f:
            # Seek to end? No, just read all for simplicity now.
            # Or use collections.deque for fixed size buffer
            from collections import deque
            last_lines = deque(f, maxlen=lines)
            return {"lines": list(last_lines)}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
