import asyncio
import logging
from typing import Callable, Any, List, Optional
import os
import pandas as pd

import ray
from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession, async_sessionmaker

from .data_loader.base import BaseLoader
from .processing.pipeline import Pipeline
from .storage.idempotency import IdempotencyChecker
from config import DATABASE_URL  # 假设您的数据库URL在config.py中

logger = logging.getLogger(__name__)


@ray.remote
class PipelineExecutor:
    """
    一个 Ray Actor，用于在独立的进程中安全地初始化数据库连接并执行ETL任务。
    
    通过使用 Actor，我们可以确保每个 worker 进程只创建一个数据库引擎实例，
    极大地提高了性能和资源利用率。
    """
    def __init__(self, pipeline_factory: Callable[[], Pipeline]):
        # 每个 Actor (worker 进程) 只在初始化时创建一次数据库引擎和会话工厂
        self.engine = create_async_engine(DATABASE_URL)
        self.AsyncSessionFactory = async_sessionmaker(self.engine, expire_on_commit=False)
        self.pipeline_factory = pipeline_factory

    async def process_item(self, item: Any) -> Any:
        """
        处理单个数据项的核心异步方法。
        """
        async with self.AsyncSessionFactory() as session:
            try:
                # 1. 运行核心的 Pipeline 逻辑
                pipeline = self.pipeline_factory()
                result = await pipeline.run(item)
                
                # 2. Pipeline 成功后，更新幂等性记录
                idempotency_checker = IdempotencyChecker(session)
                await idempotency_checker.mark_as_processed(item)
                
                return result
            except Exception as e:
                logger.error(f"Ray worker 在处理 '{item}' 时发生严重错误: {e}", exc_info=True)
                # 发生错误时，不更新记录，以便下次可以重试
                raise


def default_task_sorter(items: List[Any]) -> List[Any]:
    """默认的任务排序策略：按文件从小到大的顺序排序。"""
    if not items:
        return items
    first_item = items[0]
    if isinstance(first_item, str) and os.path.exists(first_item):
        try:
            return sorted(items, key=lambda p: os.path.getsize(p) if isinstance(p, str) and os.path.exists(p) else float('inf'))
        except Exception as e:
            logger.warning(f"默认排序器按文件大小排序失败，返回原始顺序。错误: {e}")
            return items
    return items


class Scheduler:
    """
    顶层调度器，使用 Ray 进行并行处理，并集成了幂等性检查和可插拔的排序策略。
    """

    def __init__(
        self,
        loader: BaseLoader,
        pipeline_factory: Callable[[], Pipeline],
        max_workers: int = 4,
        task_sorter: Optional[Callable[[List[Any]], List[Any]]] = default_task_sorter,
        force_run: bool = False,
    ):
        """
        初始化调度器。
        :param force_run: (可选) 如果为 True，将绕过幂等性检查，强制处理所有任务。
        """
        self.loader = loader
        self.pipeline_factory = pipeline_factory
        self.max_workers = max_workers
        self.task_sorter = task_sorter
        self.force_run = force_run
        
        # Scheduler 主进程也需要自己的数据库连接来执行前置检查
        self.engine = create_async_engine(DATABASE_URL)
        self.AsyncSessionFactory = async_sessionmaker(self.engine, expire_on_commit=False)

    async def _filter_processed_items(self, items: List[Any]) -> List[Any]:
        """使用 IdempotencyChecker 过滤掉已经处理过的项目。"""
        if self.force_run:
            logger.warning("`force_run` 已启用，将跳过幂等性检查，处理所有数据项。")
            return items

        items_to_process = []
        async with self.AsyncSessionFactory() as session:
            checker = IdempotencyChecker(session)
            # 使用 asyncio.gather 并发执行检查以提高效率
            results = await asyncio.gather(*(checker.should_process(item) for item in items))
            for item, should_process in zip(items, results):
                if should_process:
                    items_to_process.append(item)
        return items_to_process

    async def run(self):
        """启动ETL调度流程。"""
        if not ray.is_initialized():
            ray.init(num_cpus=self.max_workers, ignore_reinit_error=True)

        logger.info("调度器启动，开始从加载器获取数据...")
        all_items = [item async for item in self.loader.stream()]

        if not all_items:
            logger.warning("没有从加载器获取到需要处理的数据。调度结束。")
            return

        logger.info(f"加载器发现 {len(all_items)} 个数据项，开始进行幂等性检查...")
        
        # 1. 在分发前进行幂等性过滤
        items_to_process = await self._filter_processed_items(all_items)
        
        if not items_to_process:
            logger.info("所有数据项都已处理过，本次无任务执行。")
            return

        logger.info(f"幂等性检查完成，共 {len(items_to_process)} 个新项目待处理。")

        if self.task_sorter:
            items_to_process = self.task_sorter(items_to_process)

        # 创建 Actor 池
        actors = [PipelineExecutor.remote(self.pipeline_factory) for _ in range(self.max_workers)]
        
        task_refs = []
        # 使用轮询 (round-robin) 策略将任务均匀分配给 Actor
        for i, item in enumerate(items_to_process):
            actor = actors[i % self.max_workers]
            task_refs.append(actor.process_item.remote(item))

        results = ray.get(task_refs)
        logger.info("所有ETL任务已在所有 Ray 进程中完成。")
        return results


