# server/api/v1/events.py
from typing import List, Optional
from datetime import datetime

from fastapi import APIRouter, Depends, Query, HTTPException
from sqlalchemy import select, desc, distinct
from sqlalchemy.ext.asyncio import AsyncSession
from pydantic import BaseModel, Field

from server.storage.database import get_session
from server.storage.models.event import Event
from server.common.event_service import record_event as record_event_service

# 创建一个新的路由器
router = APIRouter()

# ================= Pydantic 模型 =================
# （这些模型也可以移到更通用的 schemas/pydantic 文件中，但为了简单起见，暂时放在这里）

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

# ================= API 端点 =================

@router.post("/events", response_model=EventResponse, status_code=201)
async def create_event(
    event: EventCreate,
    session: AsyncSession = Depends(get_session)
):
    """
    接收并存储来自工作进程的事件
    """
    try:
        db_event = await record_event_service(
            session=session,
            process_name=event.process_name,
            event_name=event.event_name,
            payload=event.payload
        )
        return db_event
    except Exception as e:
        await session.rollback()
        raise HTTPException(status_code=500, detail=f"创建事件失败: {str(e)}")


@router.get("/events", response_model=List[EventResponse])
async def get_events(
    process_name: Optional[str] = Query(None, description="按进程名筛选"),
    event_name: Optional[str] = Query(None, description="按事件名筛选"),
    limit: int = Query(100, ge=1, le=1000, description="返回的最大事件数"),
    offset: int = Query(0, ge=0, description="跳过的事件数"),
    session: AsyncSession = Depends(get_session)
):
    """
    查询事件数据
    """
    try:
        query = select(Event)
        if process_name:
            query = query.where(Event.process_name == process_name)
        if event_name:
            query = query.where(Event.event_name == event_name)

        query = query.order_by(desc(Event.created_at)).offset(offset).limit(limit)
        result = await session.execute(query)
        events = result.scalars().all()
        return events
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"查询事件失败: {str(e)}")


@router.get("/processes")
async def get_processes(session: AsyncSession = Depends(get_session)):
    """
    获取所有活跃进程的列表和最新状态
    """
    try:
        query = select(distinct(Event.process_name))
        result = await session.execute(query)
        process_names = result.scalars().all()

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
                # 使用 EventResponse 模型来验证和格式化最新事件
                latest_event_response = EventResponse.model_validate(latest_event)
                processes.append({
                    "name": name,
                    "latest_event": latest_event_response,
                    "last_seen": latest_event.created_at
                })
        
        # 按最后活跃时间倒序排序
        processes.sort(key=lambda p: p["last_seen"], reverse=True)

        return processes
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"查询进程列表失败: {str(e)}")
