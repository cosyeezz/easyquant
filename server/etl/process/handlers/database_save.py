from typing import Any, Dict, List
import pandas as pd
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
import logging

from server.etl.process.base import BaseHandler
from server.storage.models.data_table_config import DataTableConfig
from server.storage.database import bulk_upsert_df, bulk_insert_df

logger = logging.getLogger(__name__)

class DatabaseSaveHandler(BaseHandler):
    """
    数据库入库处理器。
    将 DataFrame 数据保存到指定的数据表（通过 DataTableConfig 配置）。
    支持 Upsert（如果配置了唯一键）或 Insert。
    """

    def __init__(self, target_table_id: int):
        self.target_table_id = target_table_id
        # 简单的内存缓存，避免每批次都查数据库元数据
        self._table_config_cache: Dict[str, Any] | None = None

    @classmethod
    def metadata(cls) -> Dict[str, Any]:
        return {
            "name": "DatabaseSaveHandler",
            "label": "数据库入库 (Save to DB)",
            "description": "将数据保存到指定的物理表。如果表定义了主键或唯一索引，将自动使用 Upsert 模式。",
            "params_schema": {
                "type": "object",
                "properties": {
                    "target_table_id": {
                        "type": "integer",
                        "title": "目标数据表",
                        "description": "选择要在其中存储数据的数据表",
                        "widget": "select", 
                        "dataSource": "/api/v1/data-tables"
                    }
                },
                "required": ["target_table_id"]
            }
        }

    async def _get_table_config(self, session: AsyncSession) -> Dict[str, Any]:
        """
        获取并缓存表配置元数据，智能推断 Upsert 的冲突键
        """
        if self._table_config_cache:
            return self._table_config_cache

        stmt = select(DataTableConfig).where(DataTableConfig.id == self.target_table_id)
        result = await session.execute(stmt)
        config = result.scalar_one_or_none()
        
        if not config:
            raise ValueError(f"DatabaseSaveHandler: 找不到 ID 为 {self.target_table_id} 的数据表配置")
        
        if not config.table_name:
            raise ValueError(f"数据表 '{config.name}' 尚未发布，没有物理表名")

        # 确定 Upsert Key
        # 优先级 1: 主键 (PK)
        unique_keys = []
        if config.columns_schema:
            pk_cols = [col["name"] for col in config.columns_schema if col.get("is_pk")]
            if pk_cols:
                unique_keys = pk_cols
        
        # 优先级 2: 如果没有主键，找第一个唯一索引
        if not unique_keys and config.indexes_schema:
            for idx in config.indexes_schema:
                if idx.get("unique") and idx.get("columns"):
                    unique_keys = idx["columns"]
                    break
        
        logger.info(f"Handler Init: Table '{config.table_name}', Upsert Keys: {unique_keys}")

        self._table_config_cache = {
            "table_name": config.table_name,
            "unique_keys": unique_keys
        }
        return self._table_config_cache

    async def handle(self, data: Any, context: Dict[str, Any] | None = None) -> Any:
        if not isinstance(data, pd.DataFrame):
            if data is None:
                return None
            logger.warning(f"DatabaseSaveHandler 接收到了非 DataFrame 数据类型: {type(data)}，已跳过入库。")
            return data

        if data.empty:
            return data

        if not context or "session" not in context:
            raise RuntimeError("DatabaseSaveHandler 需要在 context 中提供 'session' 对象")

        session: AsyncSession = context["session"]
        
        # 获取表信息
        table_info = await self._get_table_config(session)
        table_name = table_info["table_name"]
        unique_keys = table_info["unique_keys"]

        try:
            if unique_keys:
                # 智能校验：确保 DataFrame 包含所有 unique keys
                missing_keys = [k for k in unique_keys if k not in data.columns]
                if missing_keys:
                    raise ValueError(f"Upsert 失败: DataFrame 缺少唯一键列 {missing_keys}。请检查 Pipeline 之前的步骤是否正确映射了列名。")

                await bulk_upsert_df(data, table_name, unique_keys, session)
            else:
                await bulk_insert_df(data, table_name, session)
            
            # 记录处理行数
            if "stats" in context and isinstance(context["stats"], dict):
                 context["stats"]["saved_rows"] = context["stats"].get("saved_rows", 0) + len(data)

        except Exception as e:
            logger.error(f"入库失败 (Table: {table_name}): {e}")
            raise

        # 返回数据以便后续可能的 Handler 继续使用
        return data
