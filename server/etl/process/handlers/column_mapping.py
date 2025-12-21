from typing import Any, Dict
import pandas as pd
from server.etl.process.base import BaseHandler

class ColumnMappingHandler(BaseHandler):
    """
    列名映射处理器。
    将数据（通常是 DataFrame）的列名按照配置进行重命名。
    """

    def __init__(self, mapping: Dict[str, str]):
        self.mapping = mapping

    @classmethod
    def metadata(cls) -> Dict[str, Any]:
        return {
            "name": "column_mapping",
            "title": "列名重命名",
            "category": "transform",
            "type": "generic",
            "description": "将数据中的列名映射为系统标准列名。",
            "icon": "table-alias",
            "params_schema": {
                "type": "object",
                "properties": {
                    "mapping": {
                        "type": "object",
                        "title": "列名映射规则",
                        "description": "输入原列名(Key)和目标列名(Value)",
                        "additionalProperties": {
                            "type": "string"
                        },
                        "default": {"旧列名": "新列名"}
                    }
                },
                "required": ["mapping"]
            },
            "ui_config": {
                "width": 240,
                "handles": {
                    "source": ["input"],
                    "target": ["output"]
                }
            }
        }

    async def handle(self, data: Any, context: Dict[str, Any] | None = None) -> Any:
        """
        执行重命名操作。
        """
        if isinstance(data, pd.DataFrame):
            return data.rename(columns=self.mapping)
        
        elif isinstance(data, list) and len(data) > 0 and isinstance(data[0], dict):
            new_data = []
            for row in data:
                new_row = row.copy()
                for old_key, new_key in self.mapping.items():
                    if old_key in new_row:
                        new_row[new_key] = new_row.pop(old_key)
                new_data.append(new_row)
            return new_data
            
        return data