import logging
from enum import Enum
from typing import Optional

from sqlalchemy import select, update, func
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
    """

    def __init__(self, session: AsyncSession):
        self.session = session

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
        if record.status == ProcessingStatus.COMPLETED:
            logger.debug(f"[{identifier}] 已完成且内容未变，跳过")
            return False

        # 失败或待处理状态
        logger.debug(f"[{identifier}] 状态为 {record.status}，需要处理")
        return True

    async def acquire_lock(self, identifier: str, content_hash: str) -> bool:
        """
        尝试获取数据源的处理锁（原子操作）。
        
        使用 SQLAlchemy 构建 PostgreSQL UPSERT 语句。
        """
        if not content_hash:
            logger.warning(f"[{identifier}] 内容哈希为空，无法获取锁")
            return False

        # 1. 构建 INSERT 语句
        stmt = insert(ETLMetadata).values(
            source_identifier=identifier,
            source_hash=content_hash,
            status=ProcessingStatus.PROCESSING
        )

        # 2. 定义冲突更新逻辑 (ON CONFLICT DO UPDATE)
        # 如果主键冲突，且当前状态不是 PROCESSING，则更新为 PROCESSING
        stmt = stmt.on_conflict_do_update(
            index_elements=['source_identifier'],
            set_={
                'source_hash': content_hash,
                'status': ProcessingStatus.PROCESSING
            },
            where=(ETLMetadata.status != ProcessingStatus.PROCESSING)
        )

        # 3. 执行并提交
        result = await self.session.execute(stmt)
        await self.session.commit()

        success = result.rowcount > 0
        if success:
            logger.info(f"[{identifier}] ✓ 获取处理锁成功")
        else:
            logger.info(f"[{identifier}] ✗ 获取处理锁失败（已被锁定）")

        return success

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



# 为了方便导入，保持原类名
from sqlalchemy import func  # noqa: E402


