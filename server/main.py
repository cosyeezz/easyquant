"""
EasyQuant FastAPI 事件服务

提供事件上报和查询接口，用于监控所有工作进程的状态。
"""
from datetime import datetime
import uvicorn
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

# 从新的 API 路由文件中导入路由器
from server.api.v1 import events as events_v1

# ================= FastAPI 应用 =================

app = FastAPI(
    title="EasyQuant 事件服务",
    description="量化交易系统的事件上报和监控API",
    version="1.0.0"
)

# 配置 CORS，允许前端跨域访问
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # 生产环境应该设置为具体的前端域名
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ================= API 路由 =================

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


# ================= 主程序入口 =================

if __name__ == "__main__":
    print("=" * 60)
    print("EasyQuant 事件服务")
    print("=" * 60)
    print(f"API 文档: http://127.0.0.1:8000/docs")
    print(f"事件查询: GET  http://127.0.0.1:8000/api/v1/events")
    print("=" * 60)

    uvicorn.run("main:app", host="0.0.0.0", port=8000, log_level="info", reload=True)

