# easyquant/etl/data_loader/base.py

import abc
import asyncio
import logging
import pandas as pd
from typing import AsyncGenerator, List

# 获取一个模块级别的 logger
logger = logging.getLogger(__name__)

class BaseLoader(abc.ABC):
    """
    数据加载器抽象基类 (内置生产者-消费者模式)。

    本基类内置了一个高效、内存安全的异步流处理框架。子类不再需要
    手动管理并发和内存，只需实现两个核心的抽象方法：
    1. `_get_sources()`: 定义从哪里加载数据 (例如，获取文件路径列表)。
    2. `_load_one_source()`: 定义如何加载单个数据源。

    框架会自动处理并行调度、背压(backpressure)和内存管理。
    """

    def __init__(self, max_queue_size: int = 100):
        """
        初始化基类加载器。
        :param max_queue_size: 内部处理队列的最大尺寸，用于内存管理和背压。
                               该队列用于存储已加载但尚未被消费的数据块。
        """
        self.queue = asyncio.Queue(maxsize=max_queue_size)

    @abc.abstractmethod
    async def _get_sources(self) -> List[any]:
        """
        [子类必须实现] 获取所有待加载的数据源标识。

        此方法应返回一个包含所有数据源标识的列表。
        例如:
        - 对于文件加载器, 返回一个文件路径的列表 `List[str]`。
        - 对于API加载器, 可能返回一个包含查询参数的字典列表。
        """
        raise NotImplementedError("子类必须实现 '_get_sources' 方法")

    @abc.abstractmethod
    async def _load_one_source(self, source: any) -> pd.DataFrame:
        """
        [子类必须实现] 从单个数据源加载数据并返回 DataFrame。

        :param source: `_get_sources` 方法返回的列表中的单个元素。
        :return: 一个Pandas DataFrame。如果加载失败或无数据，应返回一个空的DataFrame。
        """
        raise NotImplementedError("子类必须实现 '_load_one_source' 方法")

    async def _producer(self):
        """
        生产者任务 (框架实现)。
        并行加载所有数据源，并将结果放入队列。
        """
        try:
            sources = await self._get_sources()
            if not sources:
                await self.queue.put(None) # 如果没有源，直接发送结束信号
                return

            tasks = [asyncio.create_task(self._load_one_source(src)) for src in sources]
            
            for future in asyncio.as_completed(tasks):
                try:
                    df = await future
                    if df is not None and not df.empty:
                        await self.queue.put(df)
                except Exception:
                    logger.exception("加载单个数据源时发生未预料的异常")
            
        except Exception:
            logger.exception("获取数据源列表时发生未预料的异常")
        finally:
            await self.queue.put(None)  # 确保在任何情况下都能发送结束信号

    async def stream(self) -> AsyncGenerator[pd.DataFrame, None]:
        """
        消费者 (框架实现)。
        以异步生成器的方式从队列中获取并产出数据。
        """
        producer_task = asyncio.create_task(self._producer())

        while True:
            df = await self.queue.get()
            if df is None: # 收到结束信号
                break
            
            yield df
            self.queue.task_done()

        await producer_task # 等待生产者任务完全结束

    async def load(self) -> pd.DataFrame:
        """
        便捷方法 (框架实现)。
        聚合所有流式数据。警告: 可能消耗大量内存。
        """
        all_dfs = [df async for df in self.stream()]
        if not all_dfs:
            return pd.DataFrame()
        return pd.concat(all_dfs, ignore_index=True)