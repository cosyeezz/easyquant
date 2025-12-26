from typing import Any, Dict
import pandas as pd
from server.etl.process.base import BaseHandler
from server.etl.data_loader.csv_loader import CSVLoader

class CSVLoaderHandler(BaseHandler):
    """
    CSV 加载器节点。
    封装了原有的 CSVLoader，作为 Pipeline 中的一个 Source 节点使用。
    """
    
    def __init__(self, path: str, file_pattern: str = "*.csv"):
        self.loader = CSVLoader(path=path, file_pattern=file_pattern)

    @classmethod
    def metadata(cls) -> Dict[str, Any]:
        return {
            "name": "csv_loader",
            "title": "CSV 文件加载",
            "category": "input",
            "type": "generic",
            "description": "从本地目录或文件加载 CSV 数据。",
            "icon": "file-csv",
            "params_schema": {
                "type": "object",
                "properties": {
                    "path": {
                        "type": "string",
                        "title": "文件路径",
                        "description": "绝对路径，可以是目录或单个文件",
                        "default": "/data"
                    },
                    "file_pattern": {
                        "type": "string",
                        "title": "文件匹配模式",
                        "description": "如 *.csv, data_*.csv",
                        "default": "*.csv"
                    }
                },
                "required": ["path"]
            },
            "ui_config": {
                "width": 240,
                "handles": {
                    "source": [], # Source node has no input handles
                    "target": ["output"]
                }
            }
        }

    @classmethod
    def get_output_schema(cls, config: Dict[str, Any], input_schema: Dict[str, Any] | None = None) -> Dict[str, Any]:
        """
        对于 CSV 加载器，暂时返回预定义的示例列。
        """
        return {
            "columns": [
                {"name": "date", "type": "string"},
                {"name": "open", "type": "number"},
                {"name": "close", "type": "number"},
                {"name": "volume", "type": "number"}
            ]
        }

    async def handle(self, data: Any, context: Dict[str, Any] | None = None) -> Any:
        """
        作为 Source 节点，它忽略输入的 `data`，并产生数据流。
        注意：在流式架构中，Source 节点通常由 Runner 特殊调用，
        或者设计为生成器。
        
        在此 MVP 阶段，如果作为 Pipeline 的一部分被调用，
        我们假设它是一次性加载所有数据（如果数据量小）或者报错。
        
        但为了兼容 Runner 的 stream 逻辑，我们这里可能需要返回 loader 对象本身，
        或者让 Runner 识别出这是一个 Source Handler。
        """
        # 暂时返回 Loader 实例，让 Runner 决定如何使用 (stream 还是 load all)
        return self.loader
