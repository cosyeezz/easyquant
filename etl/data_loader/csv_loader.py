# easyquant/etl/data_loader/csv_loader.py

import asyncio
import hashlib
import os
import logging
import pandas as pd
from glob import glob
from typing import List, Tuple
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
    def __init__(self, path: str, file_pattern: str = "**/*.csv", max_queue_size: int = 100, **kwargs):
        """
        初始化CSV加载器。

        :param path: 文件路径或文件夹路径。
        :param file_pattern: 如果 `path` 是文件夹，则使用此glob模式匹配文件 (默认支持递归搜索)。
        :param max_queue_size: 传递给基类的内部缓冲区大小。
        :param kwargs: 传递给 `pandas.read_csv` 的其他关键字参数。
        """
        super().__init__(max_queue_size)
        self.path = path
        self.file_pattern = file_pattern
        self.read_csv_kwargs = kwargs

    async def _get_sources(self) -> List[str]:
        """
        实现如何获取所有CSV文件的路径列表 (支持递归)。
        """
        if not os.path.exists(self.path):
            logger.warning(f"指定的路径不存在: {self.path}")
            return []
        if os.path.isfile(self.path):
            return [self.path]
        return glob(os.path.join(self.path, self.file_pattern), recursive=True)

    async def _load_one_source(self, source: str) -> pd.DataFrame:
        """
        实现如何从单个文件路径异步加载数据并返回DataFrame。
        """
        try:
            # 使用 run_in_executor 将同步的 pandas 读取操作放入线程池执行
            # 避免阻塞主事件循环，同时比 aiofiles + StringIO 更节省内存
            loop = asyncio.get_running_loop()
            return await loop.run_in_executor(
                None, 
                lambda: pd.read_csv(source, **self.read_csv_kwargs)
            )
        except Exception:
            # 记录错误但返回空DataFrame，以避免中断整个加载流程
            logger.warning(f"处理文件 {source} 失败", exc_info=True)
            return pd.DataFrame()

    async def get_source_metadata(self, source: str) -> Tuple[str, str]:
        """
        获取CSV文件的元数据用于幂等性检查。

        使用文件修改时间 + 文件大小作为快速哈希，避免读取整个文件。
        这种方式性能极高（只需要一次 stat 系统调用），同时能有效检测文件变化。

        :param source: 文件路径
        :return: (文件路径, 快速哈希值)
        :raises FileNotFoundError: 如果文件不存在
        """
        # 使用文件路径作为唯一标识符
        identifier = source

        # 检查文件是否存在
        if not os.path.exists(source):
            raise FileNotFoundError(f"数据源文件不存在: {source}")

        try:
            # 使用 os.stat() 获取文件元数据（非常快，不读取文件内容）
            stat_info = os.stat(source)

            # 组合文件大小和修改时间作为"指纹"
            # 这种方式比 SHA256 快 1000+ 倍，同时足够检测文件变化
            file_size = stat_info.st_size
            mtime_ns = stat_info.st_mtime_ns  # 纳秒级精度

            # 生成快速哈希（格式：size:mtime_ns）
            # 如果需要更强的唯一性，可以加上 inode
            content_hash = f"{file_size}:{mtime_ns}"

            logger.debug(f"文件元数据: {source} -> {content_hash}")

        except Exception as e:
            logger.error(f"获取文件元数据失败: {source}, 错误: {e}")
            raise

        return identifier, content_hash

