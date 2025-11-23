# /usr/bin/env python
# -*- coding: utf-8 -*-
"""
@Time    : 2025/11/23 15:00
@Author  : dane
@File    : base.py
@Description :
ORM模型的基类定义。
"""
from sqlalchemy import Column, DateTime, func
from sqlalchemy.orm import declarative_base

# 1. 创建所有ORM模型的SQLAlchemy声明性基类
Base = declarative_base()


# 2. 创建一个包含通用审计字段的 Mixin 或抽象基类
#    所有具体的模型都应继承此类，以自动获得 created_at 和 updated_at 字段。
class BaseModel(Base):
    __abstract__ = True  # 声明这是一个抽象基类，不会在数据库中创建对应的表

    created_at = Column(
        DateTime,
        server_default=func.now(),
        nullable=False,
        comment="记录创建时间"
    )
    updated_at = Column(
        DateTime,
        server_default=func.now(),
        onupdate=func.now(),
        nullable=False,
        comment="记录更新时间"
    )
