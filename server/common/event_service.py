# server/common/event_service.py
from typing import Optional
from sqlalchemy.ext.asyncio import AsyncSession
from server.storage.models.event import Event

async def record_event(
    session: AsyncSession,
    process_name: str,
    event_name: str,
    payload: Optional[dict] = None
) -> Event:
    """
    在数据库中创建一条新的事件记录。

    这是全项目中唯一负责将事件写入数据库的核心服务函数。
    所有需要记录事件的内部代码都应该调用此函数。

    Args:
        session: 一个有效的 SQLAlchemy 异步会话对象。
        process_name: 产生事件的进程/任务的名称。
        event_name: 事件的名称/类型。
        payload: 附带的任意 JSON 数据。

    Returns:
        创建并提交到数据库后的 Event 对象。
    """
    db_event = Event(
        process_name=process_name,
        event_name=event_name,
        payload=payload
    )
    session.add(db_event)
    await session.commit()
    await session.refresh(db_event)
    return db_event
