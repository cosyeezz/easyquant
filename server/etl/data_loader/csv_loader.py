# server/etl/data_loader/csv_loader.py

import asyncio
import logging
import os
import pandas as pd
from pathlib import Path
from typing import List

from .base import BaseLoader, logger

class CSVLoader(BaseLoader):
    """
    一个从本地CSV文件加载数据的具体实现。
    """
    def __init__(self, path: str, file_pattern: str = "*.csv", max_queue_size: int = 100):
        """
        初始化CSV加载器。

        :param path: CSV文件所在的目录路径或单个文件路径。
        :param file_pattern: 在目录中搜索文件时使用的glob模式, 例如: "*.csv", "data_*.csv"。
                             如果 `path` 是单个文件, 此参数将被忽略。
        """
        super().__init__(max_queue_size=max_queue_size)
        self.path = Path(path)
        self.file_pattern = file_pattern
        
        if not self.path.exists():
            raise FileNotFoundError(f"指定的路径不存在: {self.path}")

    async def _get_sources(self) -> List[str]:
        """
        数据源就是文件系统中的CSV文件路径列表。
        """
        if self.path.is_file():
            logger.info(f"数据源为单个文件: {self.path}")
            return [str(self.path)]
        
        # 使用glob异步查找文件，以防目录非常大
        logger.info(f"在目录 '{self.path}' 中搜索 '{self.file_pattern}'...")
        
        # glob是同步操作，如果目录巨大，可能会有轻微阻塞，但在大多数情况下足够快
        # 为了简单起见，这里直接调用。如果性能是关键，可以包裹在 run_sync 中。
        files = [str(p) for p in self.path.glob(self.file_pattern)]
        
        logger.info(f"找到 {len(files)} 个匹配的文件。")
        return files

    async def _load_one_source(self, source: str) -> pd.DataFrame:
        """
        使用pandas加载单个CSV文件。
        由于 pd.read_csv 是一个会阻塞I/O的同步函数, 我们使用
        基类提供的 run_sync 辅助方法将其放入线程池执行, 避免阻塞事件循环。
        """
        file_path = source
        try:
            logger.debug(f"开始加载文件: {file_path}")
            # 使用 self.run_sync 来异步执行同步的 read_csv
            df = await self.run_sync(pd.read_csv, file_path)
            # 可以在这里添加更多的数据处理逻辑, 例如添加 'source' 列
            df['source_file'] = os.path.basename(file_path)
            logger.debug(f"成功加载并处理文件: {file_path}, 行数: {len(df)}")
            return df
        except Exception as e:
            logger.error(f"在线程池中加载CSV文件 {file_path} 失败: {e}", exc_info=False)
            # 返回空DataFrame，让框架优雅地处理失败
            return pd.DataFrame()

