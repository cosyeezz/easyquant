# easyquant/etl/data_loader/csv_loader.py

import os
import logging
import pandas as pd
from glob import glob
from typing import List
import aiofiles
from .base import BaseLoader
from io import StringIO

# 获取一个模块级别的 logger
logger = logging.getLogger(__name__)

class CsvLoader(BaseLoader):
    """
    从CSV文件或文件夹加载数据的具体实现。
    
    本类继承了 `BaseLoader` 的所有并发调度和内存管理能力。
    它只需实现如何获取CSV文件路径列表 (`_get_sources`) 和
    如何加载单个CSV文件 (`_load_one_source`) 的具体逻辑。
    """
    def __init__(self, path: str, file_pattern: str = "*.csv", max_queue_size: int = 100, **kwargs):
        """
        初始化CSV加载器。

        :param path: 文件路径或文件夹路径。
        :param file_pattern: 如果 `path` 是文件夹，则使用此glob模式匹配文件。
        :param max_queue_size: 传递给基类的内部缓冲区大小。
        :param kwargs: 传递给 `pandas.read_csv` 的其他关键字参数。
        """
        super().__init__(max_queue_size)
        self.path = path
        self.file_pattern = file_pattern
        self.read_csv_kwargs = kwargs

    async def _get_sources(self) -> List[str]:
        """
        实现如何获取所有CSV文件的路径列表。
        """
        if not os.path.exists(self.path):
            logger.warning(f"指定的路径不存在: {self.path}")
            return []
        if os.path.isfile(self.path):
            return [self.path]
        return glob(os.path.join(self.path, self.file_pattern))

    async def _load_one_source(self, source: str) -> pd.DataFrame:
        """
        实现如何从单个文件路径异步加载数据并返回DataFrame。
        """
        try:
            async with aiofiles.open(source, mode='r', encoding='utf-8') as f:
                content = await f.read()
            # 使用 StringIO 避免再次写入磁盘，直接在内存中操作
            return pd.read_csv(StringIO(content), **self.read_csv_kwargs)
        except Exception:
            # 记录错误但返回空DataFrame，以避免中断整个加载流程
            logger.warning(f"处理文件 {source} 失败", exc_info=True)
            return pd.DataFrame()
