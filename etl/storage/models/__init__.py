# /usr/bin/env python
# -*- coding: utf-8 -*-
"""
@Time    : 2025/11/23 15:00
@Author  : dane
@File    : __init__.py
@Description :
将所有模型、基类和 Mixin 导入到 `etl.storage.models` 命名空间下，
以便于外部模块统一引用。
"""

# 从 .base 模块导入核心基类
from .base import Base, BaseModel

# 从 .mixins 模块导入可重用的 Mixin 类
from .mixins import CodeDateMixin, CodeDateTimeMixin

# 从具体的模型文件中导入数据表模型
from .stock_daily import StockDaily
from .stock_minute import StockMinute

# 使用 __all__ 变量明确指定可以通过 from . import * 导入的名称
# 这是一种良好的编程实践，可以避免命名空间污染
__all__ = [
    "Base",
    "BaseModel",
    "CodeDateMixin",
    "CodeDateTimeMixin",
    "StockDaily",
    "StockMinute",
]
