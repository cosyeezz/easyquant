# /usr/bin/env python
# -*- coding: utf-8 -*-
"""
@Time    : 2025/11/23 15:00
@Author  : dane
@File    : stock_daily.py
@Description :
股票日线行情数据模型
"""
from sqlalchemy import Column, Numeric
from .base import BaseModel
from .mixins import CodeDateMixin


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
