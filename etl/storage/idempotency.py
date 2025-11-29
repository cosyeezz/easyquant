import hashlib
import logging
from typing import Any
import aiofiles

from sqlalchemy import select, func
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.dialects.postgresql import insert

from etl.storage.models.etl_metadata import ETLMetadata

logger = logging.getLogger(__name__)

class IdempotencyChecker:
    """
    封装ETL幂等性检查和更新逻辑的服务。
    """

    def __init__(self, session: AsyncSession):
        self.session = session

    async def _calculate_hash(self, file_path: str) -> str:
        """计算文件的SHA256哈希值 (异步)。"""
        sha256_hash = hashlib.sha256()
        try:
            async with aiofiles.open(file_path, "rb") as f:
                while chunk := await f.read(4096):
                    sha256_hash.update(chunk)
            return sha256_hash.hexdigest()
        except FileNotFoundError:
            logger.error(f"计算哈希值失败：文件未找到 {file_path}")
            return ""

    async def should_process(self, item: Any) -> bool:
        """
        检查一个数据项（例如文件路径）是否应该被处理。

        :param item: 数据项，当前实现只支持字符串类型的文件路径。
        :return: 如果数据源是新的、内容已更改或从未成功处理过，则返回 True。
        """
        if not isinstance(item, str):
            logger.debug(f"数据项 '{item}' 非字符串，默认需要处理。")
            return True

        file_path = item
        current_hash = await self._calculate_hash(file_path)
        if not current_hash:
            return False # 文件不存在，不处理

        # 查询数据库中是否存在该文件的记录
        stmt = select(ETLMetadata).where(ETLMetadata.source_identifier == file_path)
        result = await self.session.execute(stmt)
        metadata_record = result.scalar_one_or_none()

        if metadata_record is None:
            logger.info(f"新文件，需要处理: {file_path}")
            return True
        
        if metadata_record.source_hash != current_hash:
            logger.info(f"文件内容已更新，需要重新处理: {file_path}")
            return True
        
        logger.info(f"文件内容未变且已处理过，跳过: {file_path}")
        return False

    async def mark_as_processed(self, item: Any):
        """
        将一个数据项标记为已成功处理。

        :param item: 数据项，当前实现只支持字符串类型的文件路径。
        """
        if not isinstance(item, str):
            return # 只为文件路径记录元数据

        file_path = item
        current_hash = await self._calculate_hash(file_path)
        if not current_hash:
            return

        # 使用 PostgreSQL 的 "ON CONFLICT" 实现 Upsert (插入或更新)
        stmt = insert(ETLMetadata).values(
            source_identifier=file_path,
            source_hash=current_hash
        )
        
        # 如果 source_identifier 已存在，则更新 source_hash 和 processed_at 字段
        update_stmt = stmt.on_conflict_do_update(
            index_elements=['source_identifier'],
            set_=dict(source_hash=current_hash, processed_at=func.now())
        )
        
        await self.session.execute(update_stmt)
        await self.session.commit()
        logger.info(f"已成功更新处理记录: {file_path}")
