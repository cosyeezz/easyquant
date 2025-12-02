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
    提供由 '代码' 和 '日期' 组成的复合主键，适用于日度数据。
    """
    code = Column(String(15), primary_key=True, comment="股票代码")
    trade_date = Column(Date, primary_key=True, comment="交易日期")


# 2. 创建用于【分钟/秒级】数据的 '代码+日期+时间' 主键 Mixin
class CodeDateTimeMixin:
    """
    提供由 '代码'、'日期' 和 '时间' 组成的复合主键，适用于分钟、秒级等日内数据。
    """
    code = Column(String(15), primary_key=True, comment="股票代码")
    trade_date = Column(Date, primary_key=True, comment="交易日期")
    time = Column(Time, primary_key=True, comment="交易时间 (时分秒)")
