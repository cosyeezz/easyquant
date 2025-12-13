import logging
import asyncio
import json
import psutil
import time
from typing import List, Dict, Any, Set
from fastapi import WebSocket
from queue import SimpleQueue

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

class ConnectionManager:
    """
    WebSocket 连接管理器 (支持 Pub/Sub)。
    """
    def __init__(self):
        # {websocket: {"channels": set()}}
        self.connections: Dict[WebSocket, Dict[str, Set[str]]] = {}

    async def connect(self, websocket: WebSocket):
        await websocket.accept()
        # 默认订阅 'system.status'
        self.connections[websocket] = {"channels": {"system.status"}}

    def disconnect(self, websocket: WebSocket):
        if websocket in self.connections:
            del self.connections[websocket]

    def subscribe(self, websocket: WebSocket, channels: List[str]):
        if websocket in self.connections:
            self.connections[websocket]["channels"].update(channels)

    def unsubscribe(self, websocket: WebSocket, channels: List[str]):
        if websocket in self.connections:
            self.connections[websocket]["channels"].difference_update(channels)

    async def broadcast(self, channel: str, data: Any):
        """
        向订阅了该频道的客户端广播消息。
        消息格式统一为: {"channel": "xxx", "data": ...}
        """
        message = {"channel": channel, "data": data}
        # 预序列化，避免多次 json.dumps
        try:
            message_str = json.dumps(message)
        except TypeError:
            # 如果 data 包含不可序列化的对象，尝试转为 str
            message["data"] = str(data)
            message_str = json.dumps(message)

        # 遍历发送
        for ws, info in list(self.connections.items()):
            if channel in info["channels"]:
                try:
                    await ws.send_text(message_str)
                except Exception:
                    # 发送失败，移除连接
                    self.disconnect(ws)

# 全局单例
manager = ConnectionManager()

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
    while True:
        try:
            # 获取系统状态
            status_data = {
                "uptime": time.time() - process.create_time(),
                "cpu_percent": process.cpu_percent(),
                "memory_mb": process.memory_info().rss / 1024 / 1024,
                "timestamp": time.time(),
                "status": "running"
            }
            await manager.broadcast("system.status", status_data)
            await asyncio.sleep(2)
        except Exception as e:
            print(f"Error in status broadcaster: {e}")
            await asyncio.sleep(5)