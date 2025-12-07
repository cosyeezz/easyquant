from typing import Any, Dict, Optional, List
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
        self._table_config_cache: Optional[Dict[str, Any]] = None

    @classmethod
    def metadata(cls) -> Dict[str, Any]:
        return {
            "name": "DatabaseSaveHandler",
            "label": "数据库入库 (Save to DB)",
            "description": "将数据保存到指定的物理表。",
            "params_schema": {
                "type": "object",
                "properties": {
                    "target_table_id": {
                        "type": "integer",
                        "title": "目标数据表",
                        "description": "选择要在其中存储数据的数据表配置",
                        # 前端应使用下拉框渲染此字段，数据源来自 /api/v1/data-tables
                        "widget": "select", 
                        "dataSource": "/api/v1/data-tables"
                    }
                },
                "required": ["target_table_id"]
            }
        }

    async def _get_table_config(self, session: AsyncSession) -> Dict[str, Any]:
        """
        获取并缓存表配置元数据
        """
        if self._table_config_cache:
            return self._table_config_cache

        stmt = select(DataTableConfig).where(DataTableConfig.id == self.target_table_id)
        result = await session.execute(stmt)
        config = result.scalar_one_or_none()
        
        if not config:
            raise ValueError(f"DatabaseSaveHandler: 找不到 ID 为 {self.target_table_id} 的数据表配置")
        
        unique_keys = config.schema_definition.get("unique_keys", []) if config.schema_definition else []
        
        self._table_config_cache = {
            "table_name": config.table_name,
            "unique_keys": unique_keys
        }
        return self._table_config_cache

    async def handle(self, data: Any, context: Optional[Dict[str, Any]] = None) -> Any:
        if not isinstance(data, pd.DataFrame):
            # 如果不是 DataFrame，跳过或记录警告？
            # 对于 ETL，如果上一步没产生数据（None），这里应该直接返回
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
                # 如果定义了唯一键，使用 Upsert
                await bulk_upsert_df(data, table_name, unique_keys, session)
            else:
                # 否则使用普通 Insert
                await bulk_insert_df(data, table_name, session)
            
            # 记录处理行数到 context (可选，供 Runner 统计)
            if "stats" in context and isinstance(context["stats"], dict):
                 context["stats"]["saved_rows"] = context["stats"].get("saved_rows", 0) + len(data)

        except Exception as e:
            logger.error(f"入库失败 (Table: {table_name}): {e}")
            raise

        # 返回数据以便后续可能的 Handler 继续使用
        return data
