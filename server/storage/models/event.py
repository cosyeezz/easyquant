# server/storage/models/event.py
from sqlalchemy import Column, Integer, String, JSON

# 从 .base 模块导入我们的 Mixin 和 Base
from .base import Base, TimestampMixin

class Event(TimestampMixin, Base):
    """
    事件模型的 SQLAlchemy ORM 定义。
    所有埋点事件都将存储在此表中。
    通过继承 TimestampMixin，自动获得了 created_at 和 updated_at 字段。
    """
    __tablename__ = "events"

    id = Column(Integer, primary_key=True, index=True)
    
    # 进程名称，用于区分事件来源
    # 例如: "ETL_Pipeline_1", "Backtest_Strategy_X"
    process_name = Column(String, index=True, nullable=False)
    
    # 事件名称，用于描述事件的类型
    # 例如: "loader.task.started", "processor.row.filtered"
    event_name = Column(String, index=True, nullable=False)
    
    # 事件的详细信息，以 JSON 格式存储
    payload = Column(JSON, nullable=True)

    def __repr__(self):
        return f"<Event(id={self.id}, name='{self.event_name}', process='{self.process_name}')>"

