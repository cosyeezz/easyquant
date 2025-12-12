# easyquant/etl/data_loader/base.py

import abc
import asyncio
import functools
import logging
import pandas as pd
from typing import AsyncGenerator, List, Any, Tuple

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

    def __init__(self, max_queue_size: int = 100, max_concurrent_workers: int | None = None):
        """
        初始化基类加载器。
        :param max_queue_size: 内部处理队列的最大尺寸，用于内存管理和背压。
                               该队列用于存储已加载但尚未被消费的数据块。
        :param max_concurrent_workers: 最大并发加载任务数。默认为 max_queue_size * 2。
        """
        self.max_queue_size = max_queue_size
        self.max_concurrent_workers = max_concurrent_workers or (max_queue_size * 2)
        # self._queue 已移除，改为在 stream 中创建局部 queue 以支持并发调用

    @abc.abstractmethod
    async def _get_sources(self) -> List[Any]:
        """
        [子类必须实现] 获取所有待加载的数据源标识。

        此方法应返回一个包含所有数据源标识的列表。
        例如:
        - 对于文件加载器, 返回一个文件路径的列表 `List[str]`。
        - 对于API加载器, 可能返回一个包含查询参数的字典列表。
        """
        raise NotImplementedError("子类必须实现 '_get_sources' 方法")

    @abc.abstractmethod
    async def _load_one_source(self, source: Any) -> pd.DataFrame:
        """
        [子类必须实现] 从单个数据源加载数据并返回 DataFrame。
        
        该方法是受保护的，由框架内部调用。

        :param source: `_get_sources` 方法返回的列表中的单个元素。
        :return: 一个Pandas DataFrame。如果加载失败或无数据，应返回一个空的DataFrame。
        """
        raise NotImplementedError("子类必须实现 '_load_one_source' 方法")

    async def run_sync(self, func, *args, **kwargs):
        """
        便捷方法: 在线程池中安全地运行一个同步阻塞函数。
        """
        loop = asyncio.get_running_loop()
        # 使用 partial 包装函数以支持参数传递
        wrapped_func = functools.partial(func, *args, **kwargs)
        return await loop.run_in_executor(None, wrapped_func)


    async def get_sources(self) -> List[Any]:
        """
        获取所有待加载的数据源标识。
        公开方法，代理调用内部的 `_get_sources`。
        """
        return await self._get_sources()

    async def _process_completed_task(self, task) -> Tuple[Any, pd.DataFrame | None, bool]:
        """
        处理单个完成的任务。

        :param task: 已完成的异步任务
        :return: (source, DataFrame, success) 元组。success 为 True 表示成功，False 表示失败或无数据。
                 DataFrame 在失败时为 None。
        """
        try:
            source, df, error = await task

            if error is None and df is not None and not df.empty:
                return source, df, True
            elif error is not None:
                logger.warning(f"跳过加载失败的数据源: {source}")
                return source, None, False
            else:
                logger.debug(f"数据源 {source} 返回空数据，跳过")
                return source, None, False

        except Exception as e:
            logger.exception(f"处理加载任务时发生未预期的异常: {e}")
            return None, None, False

    async def _producer(self, queue: asyncio.Queue):
        """
        生产者任务 (框架实现)。
        按需加载数据源，避免一次性创建大量任务。

        优化版本：使用工作池模式（worker pool），只维护固定数量的并发任务，
        大幅减少内存占用和事件循环开销。

        :param queue: 用于存放数据的异步队列
        """
        try:
            sources_to_process = await self._get_sources()

            if not sources_to_process:
                logger.debug("没有数据源需要加载")
                return

            # 工作池模式：限制并发数量
            # 使用配置的并发数，平衡吞吐量和资源占用
            max_concurrent = self.max_concurrent_workers
            logger.debug(f"启动生产者，最大并发数: {max_concurrent}, 总数据源: {len(sources_to_process)}")

            async def load_worker(src):
                """加载单个数据源的 Worker"""
                try:
                    df_loaded = await self._load_one_source(src)
                    return src, df_loaded, None  # (source, data, error)
                except Exception as load_error:
                    # 捕获单个数据源的加载错误，不影响其他数据源
                    logger.error(f"加载数据源 {src} 失败: {load_error}", exc_info=True)
                    return src, None, load_error

            # 使用信号量控制并发数量
            sem = asyncio.Semaphore(max_concurrent)

            async def bounded_worker(src):
                """带并发控制的 Worker"""
                async with sem:
                    return await load_worker(src)

            # 按需创建任务（使用工作池模式）
            tasks = []  # 使用列表存储任务
            completed_count = 0
            failed_count = 0

            for source in sources_to_process:
                # 创建任务
                task = asyncio.create_task(bounded_worker(source))
                tasks.append(task)

                # 当累积任务数达到阈值时，等待部分完成
                # 这样可以避免一次性创建过多任务
                if len(tasks) >= max_concurrent * 3:
                    # 等待至少一个任务完成
                    done, pending = await asyncio.wait(tasks, return_when=asyncio.FIRST_COMPLETED)

                    # 处理完成的任务
                    for task in done:
                        source, df, success = await self._process_completed_task(task)
                        if success and df is not None:
                            await queue.put((source, df))
                            completed_count += 1
                        else:
                            failed_count += 1

                    # 将 pending 转换回列表继续处理
                    tasks = list(pending)

            # 等待所有剩余任务完成
            if tasks:
                for task in asyncio.as_completed(tasks):
                    source, df, success = await self._process_completed_task(task)
                    if success and df is not None:
                        await queue.put((source, df))
                        completed_count += 1
                    else:
                        failed_count += 1

            logger.info(f"生产者任务完成: 成功 {completed_count}, 失败 {failed_count}, 总计 {len(sources_to_process)}")

        except Exception as e:
            # 捕获 _get_sources() 或其他初始化错误
            logger.exception(f"生产者初始化失败: {e}")
            # 不重新抛出异常，而是优雅地结束
        finally:
            # 确保在任何情况下都能发送结束信号
            await queue.put(None)

    async def stream(self) -> AsyncGenerator[Tuple[Any, pd.DataFrame], None]:
        """
        消费者 (框架实现)。
        以异步生成器的方式从队列中获取并产出数据。
        """
        # 创建局部队列，确保并发安全
        queue = asyncio.Queue(maxsize=self.max_queue_size)

        producer_task = asyncio.create_task(self._producer(queue))

        try:
            while True:
                item = await queue.get()
                if item is None:  # 收到结束信号
                    break

                yield item  # item 是 (source, DataFrame) 元组
                queue.task_done()
        finally:
            # 确保生产者任务被正确清理
            if not producer_task.done():
                producer_task.cancel()
                try:
                    await producer_task
                except asyncio.CancelledError:
                    pass
            elif not producer_task.cancelled():
                await producer_task