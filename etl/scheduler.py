import asyncio
import logging
import os
from typing import Callable, Any, List

import pandas as pd
import ray
from sqlalchemy.ext.asyncio import create_async_engine, async_sessionmaker

from config import DATABASE_URL  # 假设您的数据库URL在config.py中
from .data_loader.base import BaseLoader
from .processing.pipeline import Pipeline
from .storage.idempotency import IdempotencyChecker

logger = logging.getLogger(__name__)


@ray.remote
class PipelineExecutor:
    """
    一个 Ray Actor，用于在独立的进程中安全地初始化数据库连接并执行ETL任务。
    
    通过使用 Actor，我们可以确保每个 worker 进程只创建一个数据库引擎实例，
    极大地提高了性能和资源利用率。
    """
    def __init__(self, pipeline_factory: Callable[[], Pipeline], loader: BaseLoader):
        # 每个 Actor (worker 进程) 只在初始化时创建一次数据库引擎和会话工厂
        self.engine = create_async_engine(DATABASE_URL)
        self.AsyncSessionFactory = async_sessionmaker(self.engine, expire_on_commit=False)
        self.pipeline_factory = pipeline_factory
        self.loader = loader

    async def process_item(self, batch: List[Any]) -> List[Any]:
        """
        处理一批数据源的核心异步方法。
        
        :param batch: 数据源标识列表 (例如一批文件路径)。
        """
        results = []
        async with self.AsyncSessionFactory() as session:
            try:
                # 1. 在 Worker 进程内使用 Loader 的流式接口 (生产者-消费者模式)
                # Loader 会在后台并发加载 batch 中的数据源，并放入队列
                # 这里通过 async for 从队列中逐个消费 (source, DataFrame) 元组
                async for source, data in self.loader.stream(sources=batch):
                    
                    # 如果加载结果为空，跳过
                    if data is None or (isinstance(data, pd.DataFrame) and data.empty):
                        continue

                    # 2. 运行核心的 Pipeline 逻辑
                    pipeline = self.pipeline_factory()
                    result = await pipeline.run(data)
                    results.append(result)
                    
                    # 3. Pipeline 成功后，更新幂等性记录
                    # 现在我们有了 source 标识，可以正确更新状态了
                    checker = IdempotencyChecker(session)
                    await checker.mark_as_processed(source)
                    
                return results
            except Exception as e:
                logger.error(f"Ray worker 在处理 '{batch}' 时发生严重错误: {e}", exc_info=True)
                # 发生错误时，不更新记录，以便下次可以重试
                raise





class Scheduler:
    """
    顶层调度器，使用 Ray 进行并行处理，并集成了幂等性检查和可插拔的排序策略。
    """

    def __init__(
        self,
        loader: BaseLoader,
        pipeline_factory: Callable[[], Pipeline],
        max_workers: int = None,
        force_run: bool = False,
    ):
        """
        初始化调度器。
        :param max_workers: (可选) 最大工作进程数。默认为 CPU 核心数。
        :param force_run: (可选) 如果为 True，将绕过幂等性检查，强制处理所有任务。
        """
        self.loader = loader
        self.pipeline_factory = pipeline_factory
        # 自动检测 CPU 核心数作为默认 Worker 数量
        self.max_workers = max_workers or os.cpu_count() or 1
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
        """启动ETL调度流程 (多进程并行加载)。"""
        if not ray.is_initialized():
            ray.init(num_cpus=self.max_workers, ignore_reinit_error=True)

        logger.info("调度器启动，正在获取数据源列表...")
        
        # 1. 获取所有待处理的数据源 (例如文件路径列表)
        # 这一步非常快，因为只是获取路径，不读取文件内容
        sources = await self.loader.get_sources()
        
        # 1.1 过滤掉已经处理过的数据源 (幂等性检查)
        sources = await self._filter_processed_items(sources)

        if not sources:
            logger.warning("没有发现需要处理的数据源。调度结束。")
            return

        logger.info(f"发现 {len(sources)} 个数据源，开始分发任务...")

        # 创建 Actor 池
        # 将 loader 传递给 worker，以便 worker 可以独立加载数据
        actors = [PipelineExecutor.remote(self.pipeline_factory, self.loader) for _ in range(self.max_workers)]
        
        # 任务管理
        pending_tasks = []
        actor_index = 0
        
        # 2. 将数据源分批 (Batching)
        # 动态计算批次大小：
        # 策略：目标是让每个 Worker 处理大约 4 个批次，以便在减少调度开销的同时保持负载均衡。
        # 公式：Batch Size = ceil(Total Sources / (Workers * 4))
        # 这样即使只有 3 个任务，也会计算出 batch_size=1，生成 3 个批次，分发给 3 个 Worker。
        total_sources = len(sources)
        target_batches = self.max_workers * 4
        
        # 使用向上取整，确保批次数量接近目标值
        # 例如: 3 个任务, 16 个目标批次 -> batch_size = 1
        # 例如: 50000 个任务, 16 个目标批次 -> batch_size = 3125
        import math
        batch_size = math.ceil(total_sources / target_batches)
        # 确保至少为 1
        batch_size = max(1, batch_size)
        
        batches = [sources[i:i + batch_size] for i in range(0, total_sources, batch_size)]
        
        logger.info(f"动态批次策略: 总任务 {total_sources}, Worker数 {self.max_workers}. "
                    f"计算批次大小 {batch_size} (目标总批次 {target_batches}). "
                    f"实际生成 {len(batches)} 个批次。")

        # 3. 遍历批次并分发
        for batch in batches:
            # 简单的轮询调度
            actor = actors[actor_index % self.max_workers]
            actor_index += 1

            # 提交任务 (传递的是 batch 列表)
            future = actor.process_item.remote(batch)
            pending_tasks.append(future)

            # 背压控制 (Backpressure):
            # 如果积压的任务超过了 max_workers 的 2 倍，就等待一部分任务完成
            if len(pending_tasks) >= self.max_workers * 2:
                ready_refs, pending_tasks = ray.wait(pending_tasks, num_returns=1)

        # 等待所有剩余任务完成
        if pending_tasks:
            ray.get(pending_tasks)
            
        logger.info("所有ETL任务已在所有 Ray 进程中完成。")


