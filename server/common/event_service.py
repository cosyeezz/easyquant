# server/common/event_service.py
from sqlalchemy.ext.asyncio import AsyncSession
from server.storage.models.event import Event
from server.common.websocket_manager import manager
import logging

logger = logging.getLogger(__name__)

async def record_event(
    session: AsyncSession,
    process_name: str,
    event_name: str,
    payload: dict | None = None
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

    # --- WebSocket Real-time Broadcast ---
    try:
        # Construct channel name: process.events.ProcessName
        channel = f"process.events.{process_name}"
        
        # Prepare JSON-serializable data
        event_data = {
            "id": db_event.id,
            "process_name": db_event.process_name,
            "event_name": db_event.event_name,
            "payload": db_event.payload,
            "created_at": db_event.created_at.isoformat(),
            "updated_at": db_event.updated_at.isoformat() if db_event.updated_at else None
        }
        
        # Fire and forget
        await manager.broadcast(channel, event_data)
    except Exception as e:
        # Don't let WS errors block the main logic
        logger.error(f"Failed to broadcast event {event_name}: {e}")

    return db_event
