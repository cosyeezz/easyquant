"""
EasyQuant FastAPI 事件服务

提供事件上报和查询接口，用于监控所有工作进程的状态。
"""
import os
import sys
import logging
from pathlib import Path

# --- 日志配置 ---
# 确保 logs 目录存在 (假设在项目根目录运行)
LOG_DIR = Path("logs")
LOG_DIR.mkdir(exist_ok=True)

# 定义格式器
formatter = logging.Formatter('%(asctime)s [%(levelname)s] %(name)s: %(message)s', datefmt='%Y-%m-%d %H:%M:%S')

# 1. 全量日志 (server.log) - 包含 INFO 及以上
file_handler_info = logging.FileHandler(LOG_DIR / "server.log", mode="a", encoding="utf-8")
file_handler_info.setLevel(logging.INFO)
file_handler_info.setFormatter(formatter)

# 2. 错误日志 (server.err.log) - 仅包含 ERROR 及以上
file_handler_err = logging.FileHandler(LOG_DIR / "server.err.log", mode="a", encoding="utf-8")
file_handler_err.setLevel(logging.ERROR)
file_handler_err.setFormatter(formatter)

# 3. 控制台输出 (StreamHandler) - 默认输出到 stderr (便于 uvicorn 捕获)
stream_handler = logging.StreamHandler(sys.stdout) # 强制到 stdout，避免被重定向到 err.log
stream_handler.setLevel(logging.INFO)
stream_handler.setFormatter(formatter)

# 获取根记录器并应用配置
root_logger = logging.getLogger()
root_logger.setLevel(logging.INFO)

# 清除可能存在的默认 handler (如 uvicorn 自动添加的) 避免重复
root_logger.handlers = []

root_logger.addHandler(file_handler_info)
root_logger.addHandler(file_handler_err)
root_logger.addHandler(stream_handler)

# 专门针对 uvicorn 的日志进行调整，使其也使用我们的 handler
logging.getLogger("uvicorn").handlers = []
logging.getLogger("uvicorn.access").handlers = []
logging.getLogger("uvicorn.error").handlers = []
# 将 uvicorn 日志传播到根记录器
logging.getLogger("uvicorn").propagate = True
logging.getLogger("uvicorn.access").propagate = True
logging.getLogger("uvicorn.error").propagate = True


logger = logging.getLogger(__name__)

# --- Startup Check ---
if os.environ.get("EASYQUANT_LAUNCHER") != "1":
    print("\n" + "!" * 60)
    print("ERROR: Direct execution prohibited.")
    print("Please use the management script to start the application:")
    print("  python manage.py start")
    print("!" * 60 + "\n")
    sys.exit(1)
# ---------------------

from datetime import datetime
import logging
from contextlib import asynccontextmanager
import uvicorn
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

# 从新的 API 路由文件中导入路由器
from server.api.v1 import events as events_v1
from server.api.v1 import etl as etl_v1
from server.api.v1 import data_tables as data_tables_v1
from server.api.v1 import system as system_v1
from server.bootstrap import check_and_bootstrap
from server.common.websocket_manager import manager, WebSocketLogHandler, log_broadcast_worker, system_status_worker
from fastapi import WebSocket, WebSocketDisconnect
import json
import asyncio

# ================= Lifespan (启动/关闭事件) =================

@asynccontextmanager
async def lifespan(app: FastAPI):
    # --- 启动前逻辑 ---
    
    # 1. 启动日志广播后台任务
    # 使用 asyncio.create_task 将其放入后台运行
    broadcast_task = asyncio.create_task(log_broadcast_worker())
    status_task = asyncio.create_task(system_status_worker())
    
    # 2. 配置 WebSocket 日志拦截器
    # 将其实例化并添加到 root logger，这样所有日志都会自动流向 WebSocket
    ws_handler = WebSocketLogHandler()
    logging.getLogger().addHandler(ws_handler)
    
    try:
        await check_and_bootstrap()
    except Exception as e:
        logger.error(f"Bootstrap failed: {e}")
        # 在生产级应用中，如果引导失败，通常应该阻止启动
        raise e
    
    yield
    
    # --- 关闭后逻辑 ---
    # 取消后台任务
    broadcast_task.cancel()
    status_task.cancel()
    try:
        await broadcast_task
        await status_task
    except asyncio.CancelledError:
        pass

# ================= FastAPI 应用 =================

app = FastAPI(
    title="EasyQuant 事件服务",
    description="量化交易系统的事件上报和监控API",
    version="1.0.0",
    lifespan=lifespan
)

# 配置 CORS，允许前端跨域访问
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:3000",
        "http://127.0.0.1:3000",
        "http://localhost:5173", # Vite default
        "*"
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ================= API 路由 =================

# WebSocket 实时数据流端点
@app.websocket("/ws/system")
async def websocket_endpoint(websocket: WebSocket):
    await manager.connect(websocket)
    try:
        while True:
            # 接收客户端指令
            data_str = await websocket.receive_text()
            try:
                msg = json.loads(data_str)
                action = msg.get("action")
                if action == "subscribe":
                    channels = msg.get("channels", [])
                    manager.subscribe(websocket, channels)
                elif action == "unsubscribe":
                    channels = msg.get("channels", [])
                    manager.unsubscribe(websocket, channels)
            except json.JSONDecodeError:
                pass
    except WebSocketDisconnect:
        manager.disconnect(websocket)
    except Exception as e:
        logger.error(f"WebSocket error: {e}")
        manager.disconnect(websocket)

# 健康检查端点
@app.get("/")
async def root():
    """健康检查端点"""
    return {
        "service": "EasyQuant 事件服务",
        "status": "running",
        "timestamp": datetime.now().isoformat()
    }

# 包含 v1 版本的事件相关 API
# 所有在 events_v1.router 中定义的路由都会自动带上 /api/v1 前缀
app.include_router(events_v1.router, prefix="/api/v1")
app.include_router(etl_v1.router, prefix="/api/v1", tags=["ETL Configuration"])
app.include_router(data_tables_v1.router, prefix="/api/v1", tags=["Data Table Management"])
app.include_router(system_v1.router, prefix="/api/v1/system", tags=["System & Logs"])


# ================= 主程序入口 =================

if __name__ == "__main__":
    print("=" * 60)
    print("EasyQuant 事件服务")
    print("=" * 60)
    print(f"API 文档: http://127.0.0.1:8001/docs")
    print(f"事件查询: GET  http://127.0.0.1:8001/api/v1/events")
    print("=" * 60)

    # log_config=None: 防止 uvicorn 覆盖我们自定义的 logging 配置
    # Port changed to 8001 to avoid zombie process on 8000
    uvicorn.run("server.main:app", host="0.0.0.0", port=8001, log_config=None, reload=True)