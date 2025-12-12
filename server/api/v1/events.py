# server/api/v1/events.py
from typing import List
from datetime import datetime

from fastapi import APIRouter, Depends, Query, HTTPException
from sqlalchemy import select, desc, distinct
from sqlalchemy.ext.asyncio import AsyncSession
from pydantic import BaseModel, Field

from server.storage.database import get_session
from server.storage.models.event import Event

# 创建一个新的路由器
router = APIRouter()

# ================= Pydantic 模型 =================
# （这些模型也可以移到更通用的 schemas/pydantic 文件中，但为了简单起见，暂时放在这里）

class EventResponse(BaseModel):
    """返回事件数据的响应模型"""
    id: int
    process_name: str
    event_name: str
    payload: dict | None
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True

# ================= API 端点 =================
# 注意：我们不再需要 POST /events 端点，因为所有事件都在服务内部通过调用 event_service 来创建。
# 这里只保留用于前端查询的 GET 端点。

@router.get("/events", response_model=List[EventResponse])
async def get_events(
    process_name: str | None = Query(None, description="按进程名筛选"),
    event_name: str | None = Query(None, description="按事件名筛选"),
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
