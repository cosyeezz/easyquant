import logging
from enum import Enum
from typing import Optional, List

from sqlalchemy import select, update, func, or_
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.dialects.postgresql import insert

from etl.storage.models.etl_metadata import ETLMetadata

logger = logging.getLogger(__name__)


class ProcessingStatus(str, Enum):
    """
    ETL 数据源处理状态枚举。
    """
    PENDING = "pending"       # 待处理
    PROCESSING = "processing" # 处理中（锁定状态）
    COMPLETED = "completed"   # 已完成
    FAILED = "failed"         # 处理失败
    
    @classmethod
    def can_transition(cls, from_status: Optional[str], to_status: str) -> bool:
        """检查状态转换是否合法"""
        transitions = {
            None: {cls.PENDING, cls.PROCESSING},
            cls.PENDING: {cls.PROCESSING, cls.FAILED},
            cls.PROCESSING: {cls.COMPLETED, cls.FAILED},
            cls.FAILED: {cls.PROCESSING},
            cls.COMPLETED: {cls.PROCESSING},
        }
        return to_status in transitions.get(from_status, set())


class IdempotencyChecker:
    """
    ETL 幂等性检查器 - 使用 SQLAlchemy 表达式语言实现。
    
    该检查器负责确定一个数据源（例如一个文件）是否应该被处理。
    它通过在 `etl_metadata` 表中记录每个数据源的唯一标识符、内容哈希值和处理状态来实现幂等性。
    """

    def __init__(self, session: AsyncSession, force: bool = False):
        """
        初始化幂等性检查器。

        :param session: 用于数据库操作的 SQLAlchemy 异步会话。
        :param force: 如果为 `True`，则强制处理所有数据源，忽略其历史状态。默认为 `False`。
        """
        self.session = session
        self.force = force

    async def check(self, items: List[any]) -> List[any]:
        """
        过滤给定的数据源列表，只返回需要处理的数据源。

        此方法会执行以下步骤：
        1.  如果 `force` 标志为 `True`，则跳过所有检查，直接返回所有数据源。
        2.  并发获取每个数据源的元数据（唯一标识符和内容哈希）。
        3.  批量从数据库中查询已存在的元数据记录。
        4.  根据以下规则决定每个数据源是否需要处理：
            -   **新数据源**: 如果数据库中不存在该数据源的记录，则需要处理，并为其创建一条状态为 `PENDING` 的新记录。
            -   **内容已更新**: 如果数据源的内容哈希与数据库中记录的不匹配，则需要处理。
            -   **之前处理失败**: 如果数据源之前的处理状态为 `FAILED` 或 `PENDING`，则需要重新处理。
            -   **正在处理中**: 如果数据源的状态为 `PROCESSING`，则跳过，以避免冲突。
            -   **已成功处理**: 如果状态为 `COMPLETED` 且内容哈希未变，则跳过。
        5.  批量将所有新发现的数据源插入到 `etl_metadata` 表中。

        :param items: 待检查的数据源对象列表（例如，文件路径列表）。
        :return: 一个只包含需要被处理的数据源的列表。
        """
        if self.force:
            logger.warning("`force_run` 已启用，将跳过幂等性检查，处理所有数据项。")
            return items

        # ... (le reste du code de la fonction check reste inchangé)

    async def _get_record(self, identifier: str) -> Optional[ETLMetadata]:
        """
        获取数据源的元数据记录。
        """
        stmt = select(ETLMetadata).where(
            ETLMetadata.source_identifier == identifier
        )
        result = await self.session.execute(stmt)
        return result.scalar_one_or_none()

    async def should_process(self, identifier: str, current_hash: str) -> bool:
        """
        判断数据源是否需要处理。
        """
        if not current_hash:
            logger.debug(f"[{identifier}] 哈希为空，跳过处理")
            return False

        record = await self._get_record(identifier)

        # 新数据源
        if record is None:
            logger.debug(f"[{identifier}] 新数据源，需要处理")
            return True

        # 正在处理中
        if record.status == ProcessingStatus.PROCESSING:
            logger.debug(f"[{identifier}] 正在处理中，跳过")
            return False

        # 内容已变更
        if record.source_hash != current_hash:
            logger.debug(f"[{identifier}] 内容已更新，需要重新处理")
            return True

        # 已完成且内容未变
        if record.status == Processing-Status.COMPLETED:
            logger.debug(f"[{identifier}] 已完成且内容未变，跳过")
            return False

        # 失败或待处理状态
        logger.debug(f"[{identifier}] 状态为 {record.status}，需要处理")
        return True

    async def acquire_lock(self, identifier: str, content_hash: str) -> bool:
        """
        尝试获取数据源的处理锁（原子操作）。

        使用 PostgreSQL 的 SELECT ... FOR UPDATE SKIP LOCKED 实现真正的分布式锁。
        这比 UPSERT 更安全，避免了并发竞态条件。

        注意：此方法不会提交事务，需要调用者手动提交或回滚。
        """
        if not content_hash:
            logger.warning(f"[{identifier}] 内容哈希为空，无法获取锁")
            return False

        try:
            # 方案 1: 尝试获取已存在记录的排他锁
            # 使用 FOR UPDATE SKIP LOCKED 避免等待，直接跳过已锁定的行
            stmt = select(ETLMetadata).where(
                ETLMetadata.source_identifier == identifier
            ).with_for_update(skip_locked=True)

            result = await self.session.execute(stmt)
            record = result.scalar_one_or_none()

            if record is not None:
                # 记录存在，检查状态
                if record.status == ProcessingStatus.PROCESSING.value:
                    # 已被其他 Worker 锁定
                    logger.info(f"[{identifier}] ✗ 获取处理锁失败（已被锁定）")
                    return False

                # 更新状态和哈希
                record.status = ProcessingStatus.PROCESSING.value
                record.source_hash = content_hash
                await self.session.flush()  # 刷新到数据库但不提交
                logger.info(f"[{identifier}] ✓ 获取处理锁成功（已存在记录）")
                return True

            # 方案 2: 记录不存在，插入新记录
            # 使用 INSERT ... ON CONFLICT DO NOTHING 处理并发插入
            stmt = insert(ETLMetadata).values(
                source_identifier=identifier,
                source_hash=content_hash,
                status=ProcessingStatus.PROCESSING.value
            )
            stmt = stmt.on_conflict_do_nothing(index_elements=['source_identifier'])

            insert_result = await self.session.execute(stmt)
            await self.session.flush()

            if insert_result.rowcount > 0:
                # 插入成功，说明我们获得了锁
                logger.info(f"[{identifier}] ✓ 获取处理锁成功（新记录）")
                return True
            else:
                # 插入失败（被其他 Worker 抢先插入），重试获取锁
                stmt = select(ETLMetadata).where(
                    ETLMetadata.source_identifier == identifier
                ).with_for_update(skip_locked=True)

                result = await self.session.execute(stmt)
                record = result.scalar_one_or_none()

                if record is None or record.status == ProcessingStatus.PROCESSING.value:
                    # 无法获取锁或已被锁定
                    logger.info(f"[{identifier}] ✗ 获取处理锁失败（并发冲突）")
                    return False

                # 更新状态
                record.status = ProcessingStatus.PROCESSING.value
                record.source_hash = content_hash
                await self.session.flush()
                logger.info(f"[{identifier}] ✓ 获取处理锁成功（重试成功）")
                return True

        except Exception as e:
            logger.error(f"[{identifier}] 获取锁时发生异常: {e}", exc_info=True)
            return False

    async def mark_completed(self, identifier: str):
        """标记数据源处理完成。"""
        await self._update_status(identifier, ProcessingStatus.COMPLETED)
        logger.info(f"[{identifier}] ✓ 标记为已完成")

    async def mark_failed(self, identifier: str, error_message: Optional[str] = None):
        """标记数据源处理失败。"""
        await self._update_status(identifier, ProcessingStatus.FAILED)
        logger.warning(f"[{identifier}] ✗ 标记为失败")

    async def _update_status(self, identifier: str, new_status: ProcessingStatus):
        """更新数据源状态（内部方法）。"""
        stmt = update(ETLMetadata).where(
            ETLMetadata.source_identifier == identifier
        ).values(
            status=new_status,
            processed_at=func.now() if new_status in {
                ProcessingStatus.COMPLETED,
                ProcessingStatus.FAILED
            } else None
        )

        await self.session.execute(stmt)
        # 注意：不在这里 flush/commit，由调用者控制事务边界

    async def reset_stale_tasks(self, timeout_minutes: int = 60) -> int:
        """
        重置长时间处于 PROCESSING 状态的任务为 PENDING。
        用于处理因 Worker 崩溃而遗留的僵尸任务。

        注意：PROCESSING 状态的记录在处理期间 processed_at 为 NULL，
        只有 COMPLETED 或 FAILED 状态才会更新 processed_at。
        因此我们应该查找创建时间（或最后更新时间）超时的 PROCESSING 记录。

        :param timeout_minutes: 超时时间（分钟）
        :return: 重置的任务数量
        """
        from datetime import datetime, timedelta

        # 计算超时阈值时间
        timeout_threshold = datetime.utcnow() - timedelta(minutes=timeout_minutes)

        # 查询条件：
        # 1. 状态为 PROCESSING
        # 2. processed_at 为 NULL 或者 processed_at 早于阈值时间
        #    (processed_at 可能在之前的 FAILED/COMPLETED 状态时被设置)
        stmt = update(ETLMetadata).where(
            ETLMetadata.status == ProcessingStatus.PROCESSING.value,
            # 使用 OR: processed_at 为 NULL 或者超时
            # 注意：SQLAlchemy 中 None 表示 NULL
            or_(
                ETLMetadata.processed_at.is_(None),
                ETLMetadata.processed_at < timeout_threshold
            )
        ).values(
            status=ProcessingStatus.PENDING.value,
            processed_at=None  # 清除处理时间
        )

        result = await self.session.execute(stmt)
        await self.session.commit()

        count = result.rowcount
        if count > 0:
            logger.warning(f"已重置 {count} 个超时僵尸任务为 PENDING 状态")

        return count



# 为了方便导入，保持原类名
from sqlalchemy import func  # noqa: E402


