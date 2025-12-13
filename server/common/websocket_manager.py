import json
from typing import List, Dict, Any, Set
from fastapi import WebSocket

class ConnectionManager:
    """
    WebSocket 连接管理器 (支持 Pub/Sub)。
    通用组件，负责管理 WebSocket 连接、频道订阅和消息广播。
    """
    def __init__(self):
        # {websocket: {"channels": set()}}
        self.connections: Dict[WebSocket, Dict[str, Set[str]]] = {}

    async def connect(self, websocket: WebSocket):
        await websocket.accept()
        # 默认不订阅任何特殊频道，由客户端主动发起订阅
        self.connections[websocket] = {"channels": set()}

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
