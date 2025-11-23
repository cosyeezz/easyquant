# /usr/bin/env python
# -*- coding: utf-8 -*-
"""
@Time    : 2023/11/18 11:07
@Author  : zhamsocho
@File    : models.py
@Description :
所有数据库表的ORM模型定义。
"""
from sqlalchemy import (Column, String, Date, DateTime, func, Numeric,
                        Computed, Index, Time)
from sqlalchemy.orm import declarative_base

# 1. 创建所有ORM模型的基类
Base = declarative_base()


# 2. 创建一个包含通用审计字段的 Mixin
class BaseModel(Base):
    __abstract__ = True

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


# 3. 创建用于【日度】数据的 '代码+日期' 主键 Mixin
class CodeDateMixin:
    """
    提供由 '代码' 和 '日期' 自动计算生成的ID，适用于日度数据。
    """
    id = Column(
        String(40),
        Computed("UPPER(code) || TO_CHAR(trade_date, 'YYYYMMDD')", persisted=True),
        primary_key=True,
        comment="主键ID (由code大写和YYYYMMDD格式的trade_date计算生成)"
    )
    code = Column(String(15), nullable=False, comment="股票代码")
    trade_date = Column(Date, nullable=False, comment="交易日期")

    __table_args__ = (
        Index('ix_code_date', 'code', 'trade_date', unique=True),
    )


# 4. 创建用于【分钟/秒级】数据的 '代码+日期+时间' 主键 Mixin
class CodeDateTimeMixin:
    """
    提供由 '代码'、'日期' 和 '时间' 自动计算生成的ID，适用于分钟、秒级等日内数据。
    """
    id = Column(
        String(50),
        Computed("UPPER(code) || TO_CHAR(trade_date, 'YYYYMMDD') || TO_CHAR(time, 'HH24MI')", persisted=True),
        primary_key=True,
        comment="主键ID (由code, date, time计算生成, 格式: CODEYYYYMMDDHH24MI)"
    )
    code = Column(String(15), nullable=False, comment="股票代码")
    trade_date = Column(Date, nullable=False, comment="交易日期")
    time = Column(Time, nullable=False, comment="交易时间 (时分秒)")

    __table_args__ = (
        Index('ix_code_date_time', 'code', 'trade_date', 'time', unique=True),
    )


# 5. 定义股票日线行情表 (StockDaily)
class StockDaily(BaseModel, CodeDateMixin):
    """
    股票日线行情数据模型
    """
    __tablename__ = 'stock_daily'

    open = Column(Numeric(10, 2), comment="开盘价")
    high = Column(Numeric(10, 2), comment="最高价")
    low = Column(Numeric(10, 2), comment="最低价")
    close = Column(Numeric(10, 2), comment="收盘价")
    volume = Column(Numeric(20, 2), comment="成交量")
    amount = Column(Numeric(20, 2), comment="成交额")

    def __repr__(self):
        return (f"<StockDaily(id='{self.id}', close='{self.close}')>")


# 6. 定义股票分钟线行情表 (StockMinute)
class StockMinute(BaseModel, CodeDateTimeMixin):
    """
    股票分钟线行情数据模型
    """
    __tablename__ = 'stock_minute'

    open = Column(Numeric(10, 2), comment="开盘价")
    high = Column(Numeric(10, 2), comment="最高价")
    low = Column(Numeric(10, 2), comment="最低价")
    close = Column(Numeric(10, 2), comment="收盘价")
    volume = Column(Numeric(20, 2), comment="成交量")
    amount = Column(Numeric(20, 2), comment="成交额")

    def __repr__(self):
        return (f"<StockMinute(id='{self.id}', close='{self.close}')>")
