import asyncio
import multiprocessing
import time
import random
import os
from typing import List

import uvicorn
from fastapi import FastAPI, WebSocket, WebSocketDisconnect
from starlette.websockets import WebSocketState

# 导入我们之前创建的监控基类
from common.monitor import BaseMonitor

# 1. ------------------- WebSocket 连接管理器 -------------------
class ConnectionManager:
    """管理所有活跃的WebSocket连接"""
    def __init__(self):
        self.active_connections: List[WebSocket] = []

    async def connect(self, websocket: WebSocket):
        await websocket.accept()
        self.active_connections.append(websocket)

    def disconnect(self, websocket: WebSocket):
        if websocket in self.active_connections:
            self.active_connections.remove(websocket)

    async def broadcast(self, message: str):
        # 遍历所有连接并发送消息
        # 为了防止在迭代过程中列表被修改，我们创建一个副本
        for connection in self.active_connections[:]:
            if connection.client_state == WebSocketState.CONNECTED:
                try:
                    await connection.send_text(message)
                except Exception:
                    # 如果发送失败（例如连接已断开），则移除该连接
                    self.disconnect(connection)

# 2. ------------------- 模拟的工作进程 -------------------
class DataProcessor(BaseMonitor):
    """一个模拟的数据处理进程"""
    def run(self):
        self.set_status('Running')
        self.update_metric('processed_files', 0)
        self.update_metric('total_files', 1000)
        
        for i in range(1, 1001):
            time.sleep(random.uniform(0.01, 0.05))
            self.increment_metric('processed_files')
            if i % 100 == 0:
                # 每处理100个文件更新一次状态
                self.set_status(f'Processing batch {i // 100}/10')
        
        self.set_status('Finished')

class TradingBot(BaseMonitor):
    """一个模拟的交易机器人进程"""
    def run(self):
        self.set_status('Connecting')
        time.sleep(2)
        self.set_status('Running')
        self.update_metric('pnl', 0.0)
        self.update_metric('trades', 0)

        for _ in range(300): # 模拟运行5分钟
            time.sleep(1)
            # 模拟盈亏变化
            current_pnl = self._status['metrics'].get('pnl', 0.0)
            pnl_change = random.uniform(-10.5, 15.5)
            self.update_metric('pnl', round(current_pnl + pnl_change, 2))
            
            # 模拟交易
            if random.random() < 0.1:
                self.increment_metric('trades')
        
        self.set_status('Stopped')


# 3. ------------------- FastAPI 应用设置 -------------------
app = FastAPI()
manager = ConnectionManager()

# 这是关键：将多进程共享的字典定义在FastAPI应用可以访问的作用域
# 注意：实际使用时，此字典由主进程创建并传入
shared_status_dict = None 

@app.websocket("/ws/status")
async def websocket_endpoint(websocket: WebSocket):
    """通过WebSocket实时推送所有进程的状态"""
    await manager.connect(websocket)
    try:
        while True:
            # 保持连接开放，等待断开
            await websocket.receive_text()
    except WebSocketDisconnect:
        manager.disconnect(websocket)

async def status_broadcaster(status_dict: dict):
    """后台任务：定期从共享字典读取状态并广播"""
    while True:
        # 将Manager.dict转换为普通dict以便序列化
        statuses = dict(status_dict)
        # FastAPI的jsonable_encoder可以很好地处理时间等类型
        from fastapi.encoders import jsonable_encoder
        json_message = jsonable_encoder(statuses)
        
        await manager.broadcast(str(json_message))
        await asyncio.sleep(1) # 每秒广播一次

# 4. ------------------- 主程序入口 -------------------
if __name__ == "__main__":
    # 在主程序块中设置好多进程环境
    multiprocessing.freeze_support() # 对Windows打包成exe时有用

    # 创建一个进程管理器和共享的状态字典
    with multiprocessing.Manager() as process_manager:
        shared_status_dict = process_manager.dict()
        
        # 定义要启动的工作进程
        worker_definitions = {
            "ETL_Process_1": (DataProcessor, {}),
            "Trading_Bot_NYSE": (TradingBot, {}),
            "Trading_Bot_NASDAQ": (TradingBot, {}),
        }
        
        processes = []
        for name, (worker_class, kwargs) in worker_definitions.items():
            instance = worker_class(name=name, shared_status_dict=shared_status_dict, **kwargs)
            p = multiprocessing.Process(target=instance.run, daemon=True)
            processes.append(p)

        try:
            # 启动所有后台工作进程
            for p in processes:
                p.start()

            # 设置FastAPI应用可以访问共享字典
            # 这是个变通方法，因为FastAPI在uvicorn中运行，不能直接传递参数
            # 我们通过模块级变量来共享
            __main__.shared_status_dict = shared_status_dict

            # 创建并启动后台广播任务
            loop = asyncio.get_event_loop()
            broadcast_task = loop.create_task(status_broadcaster(shared_status_dict))

            # 启动FastAPI服务器
            print("--- 监控服务器已启动 ---")
            print("访问 http://127.0.0.1:8000/ 来连接前端页面")
            print("WebSocket 端点位于 ws://127.0.0.1:8000/ws/status")
            
            uvicorn.run(app, host="0.0.0.0", port=8000)

        finally:
            print("\n--- 服务器正在关闭，终止所有工作进程 ---")
            for p in processes:
                if p.is_alive():
                    p.terminate()
                    p.join()
            print("--- 所有进程已清理 ---")

# 在文件顶部将 __main__ 模块导入，以便在函数中访问其变量
import __main__
