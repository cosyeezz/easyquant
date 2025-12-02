# /usr/bin/env python
# -*- coding: utf-8 -*-
"""
@Time    : 2025/11/23 15:00
@Author  : dane
@File    : stock_daily.py
@Description :
股票日线行情数据模型

包含基础行情数据和衍生指标。
"""
from sqlalchemy import Column, Numeric, String, Integer
from .base import BaseModel
from .mixins import CodeDateMixin


class StockDaily(BaseModel, CodeDateMixin):
    """
    股票日线行情数据模型

    包含字段：
    1. 基础行情数据：
       - open: 开盘价
       - high: 最高价
       - low: 最低价
       - close: 收盘价
       - pre_close: 前收盘价
       - volume: 成交量
       - amount: 成交额

    2. 股票信息：
       - name: 股票名称

    3. 市值数据：
       - circulation_market_value: 流通市值
       - total_market_value: 总市值

    4. 衍生指标：
       - pct_change: 涨跌幅
       - turnover_rate: 换手率（成交额/流通市值）
       - avg_price: 均价（成交额/成交量）
       - trading_days: 上市至今交易天数
    """
    __tablename__ = 'stock_daily'

    # 基础行情数据
    open = Column(Numeric(10, 2), comment="开盘价")
    high = Column(Numeric(10, 2), comment="最高价")
    low = Column(Numeric(10, 2), comment="最低价")
    close = Column(Numeric(10, 2), comment="收盘价")
    pre_close = Column(Numeric(10, 2), comment="前收盘价")
    volume = Column(Numeric(20, 2), comment="成交量")
    amount = Column(Numeric(20, 2), comment="成交额")

    # 股票信息
    name = Column(String(50), comment="股票名称")

    # 市值数据
    circulation_market_value = Column(Numeric(20, 2), comment="流通市值")
    total_market_value = Column(Numeric(20, 2), comment="总市值")

    # 衍生指标
    pct_change = Column(Numeric(10, 6), comment="涨跌幅")
    turnover_rate = Column(Numeric(10, 6), comment="换手率")
    avg_price = Column(Numeric(10, 2), comment="均价")
    trading_days = Column(Integer, comment="上市至今交易天数")

