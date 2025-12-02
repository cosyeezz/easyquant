import asyncio
import logging
import math
import os
from typing import Callable, Any, List

import ray
from sqlalchemy import select
from sqlalchemy.ext.asyncio import create_async_engine, async_sessionmaker
from sqlalchemy.dialects.postgresql import insert
from config import DATABASE_URL  # 假设您的数据库URL在config.py中
from .data_loader.base import BaseLoader
from .processing.pipeline import Pipeline
from .processing.executor import PipelineExecutor
from .storage.models.etl_metadata import ETLMetadata
from .storage.idempotency import ProcessingStatus, IdempotencyChecker

logger = logging.getLogger(__name__)





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
        self.engine = None  # 初始化为 None，防止 __init__ 失败时 dispose() 出错
        self.AsyncSessionFactory = None

        self.engine = create_async_engine(
            DATABASE_URL,
            execution_options={"schema_translate_map": {None: "public"}},
        )
        self.AsyncSessionFactory = async_sessionmaker(self.engine, expire_on_commit=False)
    
    async def dispose(self):
        """清理数据库引擎资源，释放连接池。"""
        if self.engine:
            await self.engine.dispose()
            logger.info("Scheduler 数据库引擎已清理")
    
    async def __aenter__(self):
        """支持异步上下文管理器。"""
        return self
    
    async def __aexit__(self, exc_type, exc_val, exc_tb):
        """退出时自动清理资源。"""
        await self.dispose()

    async def _filter_processed_items(self, items: List[Any]) -> List[Any]:
        """
        使用 IdempotencyChecker 过滤掉已经处理过的项目。

        优化版本：使用 Semaphore 限制并发数，避免创建大量协程。
        """
        if self.force_run:
            logger.warning("`force_run` 已启用，将跳过幂等性检查，处理所有数据项。")
            return items

        if not items:
            return []

        # 1. 使用 Semaphore 限制并发数，避免创建过多协程
        # 对于 10000 个文件，限制为 500 个并发，减少内存占用
        MAX_CONCURRENT_STAT = 500
        sem = asyncio.Semaphore(MAX_CONCURRENT_STAT)

        async def get_metadata(item):
            """获取单个数据源的元数据（带并发控制）"""
            async with sem:
                try:
                    item_identifier, item_content_hash = await self.loader.get_source_metadata(item)
                    return item, item_identifier, item_content_hash
                except Exception as e:
                    logger.error(f"获取数据源 {item} 元数据失败: {e}")
                    return item, None, None

        # 并发计算所有数据源的元数据（受 Semaphore 限制）
        metadata_tasks = [get_metadata(item) for item in items]
        metadata_results = await asyncio.gather(*metadata_tasks, return_exceptions=True)

        # 过滤出有效的元数据
        valid_metadata = []
        for result in metadata_results:
            if isinstance(result, Exception):
                logger.error(f"获取元数据时发生异常: {result}")
                continue
            item, identifier, content_hash = result
            if identifier and content_hash:
                valid_metadata.append((item, identifier, content_hash))

        if not valid_metadata:
            logger.warning("没有有效的数据源元数据，跳过幂等性检查")
            return []

        # 2. 批量查询数据库（优化：如果数据量很大，分批查询）
        identifiers = [identifier for _, identifier, _ in valid_metadata]

        # 如果标识符数量超过 1000，分批查询数据库（避免 SQL IN 子句过长）
        MAX_BATCH_SIZE = 1000
        existing_records = {}

        for i in range(0, len(identifiers), MAX_BATCH_SIZE):
            batch_identifiers = identifiers[i:i + MAX_BATCH_SIZE]

            async with self.AsyncSessionFactory() as session:
                stmt = select(
                    ETLMetadata.source_identifier,
                    ETLMetadata.source_hash,
                    ETLMetadata.status
                ).where(
                    ETLMetadata.source_identifier.in_(batch_identifiers)
                )
                result = await session.execute(stmt)
                batch_records = {
                    row.source_identifier: (row.source_hash, row.status)
                    for row in result
                }
                existing_records.update(batch_records)

        # 3. 过滤需要处理的项目并收集新项目
        items_to_process = []
        new_items_to_insert = []  # 待插入的新项目

        for item, identifier, content_hash in valid_metadata:
            if identifier not in existing_records:
                # 新数据源 -> 记录下来准备批量插入 PENDING
                items_to_process.append(item)
                new_items_to_insert.append({
                    "source_identifier": identifier,
                    "source_hash": content_hash,
                    "status": ProcessingStatus.PENDING.value
                })
                logger.debug(f"新数据源 (PENDING): {identifier}")
            else:
                existing_hash, status = existing_records[identifier]

                # 如果正在处理中，跳过
                if status == ProcessingStatus.PROCESSING.value:
                    logger.debug(f"数据源正在处理中，跳过: {identifier}")
                    continue

                # 如果内容已更新，需要重新处理
                if existing_hash != content_hash:
                    items_to_process.append(item)
                    logger.debug(f"数据源内容已更新: {identifier}")
                # 如果状态为 failed 或 pending，需要重新处理
                elif status in (ProcessingStatus.FAILED.value, ProcessingStatus.PENDING.value):
                    items_to_process.append(item)
                    logger.debug(f"数据源状态为 {status}，需要处理: {identifier}")
                # 否则（status == 'completed' 且哈希相同），跳过
                else:
                    logger.debug(f"数据源已完成且内容未变，跳过: {identifier}")

        # 4. 批量插入新发现的数据源 (标记为 PENDING)
        # 优化：如果新项目过多，分批插入
        if new_items_to_insert:
            try:
                for i in range(0, len(new_items_to_insert), MAX_BATCH_SIZE):
                    batch_items = new_items_to_insert[i:i + MAX_BATCH_SIZE]

                    async with self.AsyncSessionFactory() as session:
                        # 使用 SQLAlchemy Core 的 insert 进行批量插入
                        stmt = insert(ETLMetadata).values(batch_items)
                        # 如果并发导致主键冲突，则忽略（do nothing），因为说明已经被记录了
                        stmt = stmt.on_conflict_do_nothing(index_elements=['source_identifier'])

                        await session.execute(stmt)
                        await session.commit()

                logger.info(f"已注册 {len(new_items_to_insert)} 个新数据源为 PENDING 状态")
            except Exception as e:
                logger.error(f"批量注册新数据源失败: {e}")
                # 即使注册失败，也不阻碍处理，Worker 会尝试 acquire_lock (upsert)

        logger.info(f"幂等性检查完成: 总计 {len(items)} 个数据源，需要处理 {len(items_to_process)} 个 "
                    f"(最大并发: {MAX_CONCURRENT_STAT})")
        return items_to_process

    async def run(self):
        """启动ETL调度流程 (多进程并行加载)。"""
        ray_initialized = False
        actors = []  # 初始化为空列表，避免 NameError
        try:
            if not ray.is_initialized():
                ray.init(num_cpus=self.max_workers, ignore_reinit_error=True)
                ray_initialized = True

            logger.info("调度器启动，正在获取数据源列表...")

            # 1. 获取所有待处理的数据源 (例如文件路径列表)
            # 这一步非常快，因为只是获取路径，不读取文件内容
            sources = await self.loader.get_sources()

            # 1.1 重置僵尸任务 (防止上次运行崩溃导致任务卡死)
            async with self.AsyncSessionFactory() as session:
                checker = IdempotencyChecker(session, force=self.force_run)
                await checker.reset_stale_tasks()

            # 1.2 过滤掉已经处理过的数据源 (幂等性检查)
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
            batch_size = math.ceil(total_sources / target_batches)
            # 确保至少为 1
            batch_size = max(1, batch_size)

            batches = [sources[i:i + batch_size] for i in range(0, total_sources, batch_size)]

            logger.info(f"动态批次策略: 总任务 {total_sources}, Worker数 {self.max_workers}. "
                        f"计算批次大小 {batch_size} (目标总批次 {target_batches}). "
                        f"实际生成 {len(batches)} 个批次。")

            # 3. 遍历批次并分发
            for i, batch in enumerate(batches):
                # 简单的轮询调度
                actor_index = i % self.max_workers
                actor = actors[actor_index]

                logger.info(f"分发批次 {i+1}/{len(batches)} (大小: {len(batch)}) 到 Worker {actor_index}...")
                
                # 提交任务 (传递的是 batch 列表)
                future = actor.process_item.remote(batch)
                pending_tasks.append(future)

                # 背压控制 (Backpressure):
                # 如果积压的任务超过了 max_workers 的 2 倍，就等待一部分任务完成
                if len(pending_tasks) >= self.max_workers * 2:
                    logger.debug(f"任务积压达到 {len(pending_tasks)}，等待一个任务完成...")
                    ready_refs, pending_tasks = ray.wait(pending_tasks, num_returns=1)
                    # 检查已完成任务的结果，确保异常被捕获
                    try:
                        ray.get(ready_refs)
                    except Exception as e:
                        logger.error(f"Worker 任务执行失败: {e}", exc_info=True)

            # 等待所有剩余任务完成
            if pending_tasks:
                logger.info(f"等待剩余的 {len(pending_tasks)} 个任务完成...")
                try:
                    ray.get(pending_tasks)
                except Exception as e:
                    logger.error(f"等待剩余任务时发生错误: {e}", exc_info=True)

            logger.info("所有ETL任务已在所有 Ray 进程中完成。")

            # 清理所有 Actor 的数据库连接
            if actors:
                logger.info("开始清理 Ray Actor 的数据库连接...")
                try:
                    dispose_tasks = [actor.dispose.remote() for actor in actors]
                    ray.get(dispose_tasks)
                    logger.info("Ray Actor 数据库连接已清理")
                except Exception as e:
                    logger.error(f"清理 Actor 数据库连接时出错: {e}", exc_info=True)

        finally:
            # 确保无论成功或失败都清理资源
            try:
                await self.dispose()
            finally:
                # 清理 Ray 集群（只有当前进程初始化的才清理）
                if ray_initialized and ray.is_initialized():
                    ray.shutdown()
                    logger.info("Ray 集群已关闭")


