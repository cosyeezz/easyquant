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

    @classmethod
    def get_output_schema(cls, config: Dict[str, Any], input_schema: Dict[str, Any] | None = None) -> Dict[str, Any]:
        """
        推导重命名后的 Schema。
        """
        if not input_schema or "columns" not in input_schema:
            return {"columns": []}
            
        mapping = config.get("mapping", {})
        output_columns = []
        
        for col in input_schema["columns"]:
            col_name = col["name"]
            # 如果该列在映射中，则重命名
            if col_name in mapping:
                new_col = col.copy()
                new_col["name"] = mapping[col_name]
                output_columns.append(new_col)
            else:
                # 否则保持原样
                output_columns.append(col)
                
        return {"columns": output_columns}

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