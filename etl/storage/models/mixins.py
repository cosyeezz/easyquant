# /usr/bin/env python
# -*- coding: utf-8 -*-
"""
@Time    : 2025/11/23 15:00
@Author  : dane
@File    : mixins.py
@Description :
可重用的ORM模型 Mixin 类，用于提供通用的字段和功能。
"""
from sqlalchemy import Column, String, Date, Time, Computed, Index


# 1. 创建用于【日度】数据的 '代码+日期' 主键 Mixin
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


# 2. 创建用于【分钟/秒级】数据的 '代码+日期+时间' 主键 Mixin
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
