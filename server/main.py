"""
EasyQuant FastAPI 事件服务

提供事件上报和查询接口，用于监控所有工作进程的状态。
"""
from typing import List, Optional
from datetime import datetime

import uvicorn
from fastapi import FastAPI, Depends, Query, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field
from sqlalchemy import select, desc
from sqlalchemy.ext.asyncio import AsyncSession

# 导入数据库、模型和服务
from storage.database import get_session
from storage.models.event import Event
from common.event_service import record_event as record_event_service

# ================= Pydantic 模型 =================

class EventCreate(BaseModel):
    """接收事件数据的请求模型"""
    process_name: str = Field(..., description="进程名称，如 'ETL_Pipeline_1'")
    event_name: str = Field(..., description="事件名称，如 'loader.task.started'")
    payload: Optional[dict] = Field(None, description="事件详细信息（JSON格式）")

    class Config:
        json_schema_extra = {
            "example": {
                "process_name": "ETL_Pipeline_1",
                "event_name": "loader.queue.status",
                "payload": {
                    "queue_size": 42,
                    "current_file": "stock_data_2024.csv",
                    "processed": 1000,
                    "total": 5000
                }
            }
        }


class EventResponse(BaseModel):
    """返回事件数据的响应模型"""
    id: int
    process_name: str
    event_name: str
    payload: Optional[dict]
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True


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


# ================= API 端点 =================

@app.get("/")
async def root():
    """健康检查端点"""
    return {
        "service": "EasyQuant 事件服务",
        "status": "running",
        "timestamp": datetime.now().isoformat()
    }


@app.post("/api/v1/events", response_model=EventResponse, status_code=201)
async def create_event(
    event: EventCreate,
    session: AsyncSession = Depends(get_session)
):
    """
    接收并存储来自工作进程的事件

    - **process_name**: 进程名称
    - **event_name**: 事件类型
    - **payload**: 事件详细信息（可选）
    """
    try:
        # 调用核心服务函数来记录事件
        db_event = await record_event_service(
            session=session,
            process_name=event.process_name,
            event_name=event.event_name,
            payload=event.payload
        )
        return db_event

    except Exception as e:
        # 服务层可能会抛出特定异常，这里可以做更精细的处理
        # 为了保持健壮性，暂时捕获通用异常
        await session.rollback()
        raise HTTPException(status_code=500, detail=f"创建事件失败: {str(e)}")


@app.get("/api/v1/events", response_model=List[EventResponse])
async def get_events(
    process_name: Optional[str] = Query(None, description="按进程名筛选"),
    event_name: Optional[str] = Query(None, description="按事件名筛选"),
    limit: int = Query(100, ge=1, le=1000, description="返回的最大事件数"),
    offset: int = Query(0, ge=0, description="跳过的事件数"),
    session: AsyncSession = Depends(get_session)
):
    """
    查询事件数据

    - **process_name**: 可选，筛选特定进程的事件
    - **event_name**: 可选，筛选特定类型的事件
    - **limit**: 返回的最大事件数（默认100）
    - **offset**: 分页偏移量（默认0）
    """
    try:
        # 构建查询
        query = select(Event)

        # 添加筛选条件
        if process_name:
            query = query.where(Event.process_name == process_name)
        if event_name:
            query = query.where(Event.event_name == event_name)

        # 按创建时间倒序排列
        query = query.order_by(desc(Event.created_at))

        # 分页
        query = query.offset(offset).limit(limit)

        # 执行查询
        result = await session.execute(query)
        events = result.scalars().all()

        return events

    except Exception as e:
        raise HTTPException(status_code=500, detail=f"查询事件失败: {str(e)}")


@app.get("/api/v1/processes")
async def get_processes(session: AsyncSession = Depends(get_session)):
    """
    获取所有活跃进程的列表和最新状态
    """
    try:
        # 查询所有不同的进程名
        from sqlalchemy import distinct, func

        query = select(distinct(Event.process_name))
        result = await session.execute(query)
        process_names = result.scalars().all()

        # 为每个进程获取最新事件
        processes = []
        for name in process_names:
            latest_query = (
                select(Event)
                .where(Event.process_name == name)
                .order_by(desc(Event.created_at))
                .limit(1)
            )
            result = await session.execute(latest_query)
            latest_event = result.scalar_one_or_none()

            if latest_event:
                processes.append({
                    "name": name,
                    "latest_event": EventResponse.model_validate(latest_event),
                    "last_seen": latest_event.created_at
                })

        return processes

    except Exception as e:
        raise HTTPException(status_code=500, detail=f"查询进程列表失败: {str(e)}")


# ================= 主程序入口 =================

if __name__ == "__main__":
    print("=" * 60)
    print("EasyQuant 事件服务")
    print("=" * 60)
    print(f"API 文档: http://127.0.0.1:8000/docs")
    print(f"事件上报: POST http://127.0.0.1:8000/api/v1/events")
    print(f"事件查询: GET  http://127.0.0.1:8000/api/v1/events")
    print("=" * 60)

    uvicorn.run(app, host="0.0.0.0", port=8000, log_level="info")
