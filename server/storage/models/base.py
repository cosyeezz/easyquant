# server/storage/models/base.py
from sqlalchemy import Column, DateTime, func
from sqlalchemy.orm import declarative_base

# 1. 创建一个所有模型都可以继承的 Declarative Base
#    注意：我们之前在 database.py 中也创建了一个 Base。
#    为了统一，我们应该只使用这一个。
#    后续步骤将修改 database.py，让它也使用这里的 Base。
Base = declarative_base()

class TimestampMixin:
    """
    一个 Mixin 类，为所有模型提供 'created_at' 和 'updated_at' 字段。
    """
    __abstract__ = True  # 表示这是一个 Mixin，不会创建实际的数据库表

    created_at = Column(
        DateTime(timezone=True), 
        server_default=func.now(), 
        nullable=False,
        comment="创建时间"
    )
    updated_at = Column(
        DateTime(timezone=True), 
        server_default=func.now(), 
        onupdate=func.now(), 
        nullable=False,
        comment="最后更新时间"
    )

# 我们可以定义一个包含此 Mixin 的新 Base，或者让模型直接继承 (Base, TimestampMixin)
# 为了更清晰，我们建议模型直接多重继承。
