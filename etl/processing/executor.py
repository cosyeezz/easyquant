import logging
from typing import Callable, Any, List, Tuple, TYPE_CHECKING

import pandas as pd
import ray
from sqlalchemy.ext.asyncio import create_async_engine, async_sessionmaker

from config import DATABASE_URL
from etl.data_loader.base import BaseLoader
from etl.processing.pipeline import Pipeline
from etl.storage.idempotency import IdempotencyChecker, ProcessingStatus

if TYPE_CHECKING:
    from ray.actor import ActorHandle

logger = logging.getLogger(__name__)


@ray.remote
class PipelineExecutor:
    if TYPE_CHECKING:
        @classmethod
        def remote(cls, *args, **kwargs) -> "ActorHandle": ...

    """
    一个 Ray Actor，用于在独立的进程中安全地初始化数据库连接并执行ETL任务。

    通过使用 Actor，我们可以确保每个 worker 进程只创建一个数据库引擎实例，
    极大地提高了性能和资源利用率。
    """
    def __init__(self, pipeline_factory: Callable[[], Pipeline], loader: BaseLoader):
        # 每个 Actor (worker 进程) 只在初始化时创建一次数据库引擎和会话工厂
        self.engine = None  # 初始化为 None，防止 __init__ 失败时 dispose() 出错
        self.AsyncSessionFactory = None

        self.engine = create_async_engine(DATABASE_URL)
        self.AsyncSessionFactory = async_sessionmaker(self.engine, expire_on_commit=False)
        self.pipeline_factory = pipeline_factory
        self.loader = loader

        # 元数据缓存：避免重复计算同一数据源的元数据
        # 格式: {source: (identifier, content_hash)}
        self._metadata_cache = {}

    async def dispose(self):
        """清理数据库引擎资源，释放连接池。"""
        if self.engine:
            await self.engine.dispose()
            logger.info("PipelineExecutor 数据库引擎已清理")

    async def _get_cached_metadata(self, source: Any) -> Tuple[str, str]:
        """
        获取数据源元数据（带缓存）。

        对于同一个 Worker 处理的批次，相同的数据源不会重复计算元数据。
        """
        if source in self._metadata_cache:
            return self._metadata_cache[source]

        identifier, content_hash = await self.loader.get_source_metadata(source)
        self._metadata_cache[source] = (identifier, content_hash)
        return identifier, content_hash

    async def process_item(self, batch: List[Any]) -> List[Any]:
        """
        处理一批数据源的核心异步方法。

        每个数据源使用独立的事务，避免批次失败影响所有数据。

        :param batch: 数据源标识列表 (例如一批文件路径)。
        """
        results = []

        # 为每个数据源使用独立的事务
        async for source, data in self.loader.stream(sources=batch):
            # 如果加载结果为空，跳过
            if data is None or (isinstance(data, pd.DataFrame) and data.empty):
                logger.warning(f"数据源 {source} 加载结果为空，跳过处理")
                continue

            # 每个数据源独立的事务
            async with self.AsyncSessionFactory() as session:
                try:
                    checker = IdempotencyChecker(session)

                    # 1. 获取数据源元数据（使用缓存）
                    identifier, content_hash = await self._get_cached_metadata(source)

                    # 2. 尝试获取处理锁（防止重复处理）
                    locked = await checker.acquire_lock(identifier, content_hash)
                    if not locked:
                        logger.info(f"数据源 {identifier} 正在被其他 worker 处理，跳过")
                        continue

                    # 3. 运行核心的 Pipeline 逻辑
                    pipeline = self.pipeline_factory()
                    result = await pipeline.run(data)
                    results.append(result)

                    # 4. 标记为已完成
                    await checker.mark_completed(identifier)
                    await session.commit()

                    logger.info(f"数据源 {identifier} 处理成功")

                except Exception as e:
                    logger.error(f"处理数据源 {source} 时发生错误: {e}", exc_info=True)

                    # 标记为失败状态
                    try:
                        identifier, _ = await self._get_cached_metadata(source)
                        await checker.mark_failed(identifier)
                        await session.commit()
                    except Exception as mark_error:
                        logger.error(f"标记失败状态时出错: {mark_error}")

                    await session.rollback()
                    # 继续处理下一个数据源，而不是让整个 batch 失败

        # 清理缓存（避免内存累积）
        self._metadata_cache.clear()

        logger.info(f"Batch 处理完成，成功处理 {len(results)} 个数据源")
        return results
