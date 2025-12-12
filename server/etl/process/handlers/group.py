import asyncio
import copy
import logging
from typing import Any, Dict, List
import pandas as pd
from server.etl.process.base import BaseHandler

logger = logging.getLogger(__name__)

class GroupHandler(BaseHandler):
    """
    组合处理器 (Group/Node Handler)
    允许将多个 Handler 组合成一个节点，支持顺序或并行执行。
    实现逻辑上的 "子 Pipeline"。
    """

    def __init__(self, handlers: List[Dict[str, Any]], mode: str = 'sequential', merge_strategy: str = 'passthrough'):
        """
        :param handlers: 子 Handler 的配置列表，例如 [{'name': '...', 'params': {...}}]
        :param mode: 执行模式，'sequential' (顺序) or 'parallel' (并行/并发)
        :param merge_strategy: 并行模式下的合并策略，'passthrough' or 'merge_columns'
        """
        self.handlers_config = handlers
        self.mode = mode
        self.merge_strategy = merge_strategy
        self.initialized_handlers = []
        self._is_initialized = False

    @classmethod
    def metadata(cls) -> Dict[str, Any]:
        return {
            "name": "GroupHandler",
            "label": "逻辑分组/节点 (Group Node)",
            "description": "容器节点。可包含多个子处理器，支持串行或并行执行。",
            "params_schema": {
                "type": "object",
                "properties": {
                    "mode": {
                        "type": "string",
                        "title": "执行模式",
                        "enum": ["sequential", "parallel"],
                        "enumNames": ["顺序执行 (Sequential)", "并行执行 (Parallel)"],
                        "default": "sequential",
                        "description": "顺序：按顺序执行子步骤。并行：同时执行子步骤。"
                    },
                    "merge_strategy": {
                        "type": "string",
                        "title": "并行合并策略",
                        "enum": ["passthrough", "merge_columns"],
                        "enumNames": ["忽略结果 (Passthrough)", "合并列 (Merge Columns)"],
                        "default": "passthrough",
                        "description": "仅在并行模式下有效。\n忽略结果：并行分支仅用于副作用（如入库），主流程使用原始数据继续。\n合并列：将各分支计算产生的新列/修改列合并回主数据流（要求各分支处理不同的列）。"
                    },
                    "handlers": {
                        "type": "array",
                        "title": "子处理器列表",
                        "items": {
                            "type": "object",
                        },
                        "default": []
                    }
                },
                "required": ["mode", "handlers"]
            }
        }

    def _lazy_init(self):
        """
        延迟初始化子 Handlers。
        """
        if self._is_initialized:
            return

        from server.etl.process.registry import HandlerRegistry

        self.initialized_handlers = []
        for h_conf in self.handlers_config:
            name = h_conf.get('name')
            params = h_conf.get('params', {})
            
            try:
                handler_cls = HandlerRegistry.get_handler_class(name)
                handler_instance = handler_cls(**params)
                self.initialized_handlers.append(handler_instance)
            except Exception as e:
                logger.error(f"GroupHandler 初始化子处理器 '{name}' 失败: {e}")
                raise ValueError(f"无法初始化子处理器 {name}: {str(e)}")
        
        self._is_initialized = True

    async def handle(self, data: Any, context: Dict[str, Any] | None = None) -> Any:
        self._lazy_init()

        if data is None:
            return None

        is_df = isinstance(data, pd.DataFrame)

        if self.mode == 'sequential':
            # === 顺序模式 ===
            current_data = data
            for handler in self.initialized_handlers:
                if asyncio.iscoroutinefunction(handler.handle):
                    current_data = await handler.handle(current_data, context)
                else:
                    current_data = handler.handle(current_data, context)
            return current_data

        elif self.mode == 'parallel':
            # === 并行模式 ===
            
            async def run_safe(handler, input_data):
                try:
                    if asyncio.iscoroutinefunction(handler.handle):
                        return await handler.handle(input_data, context)
                    else:
                        return handler.handle(input_data, context)
                except Exception as e:
                    logger.error(f"并行节点执行失败 ({handler.__class__.__name__}): {e}")
                    raise

            tasks = []
            for handler in self.initialized_handlers:
                # 创建副本
                data_copy = data.copy(deep=True) if is_df else copy.deepcopy(data)
                tasks.append(run_safe(handler, data_copy))

            if not tasks:
                return data

            # 等待所有任务完成
            results = await asyncio.gather(*tasks)
            
            # === 合并策略 ===
            if self.merge_strategy == 'passthrough':
                # 忽略结果，返回原始数据
                return data
            
            elif self.merge_strategy == 'merge_columns':
                if not is_df:
                    logger.warning("GroupHandler: 'merge_columns' 策略仅支持 pandas DataFrame，已退化为 passthrough。")
                    return data
                
                # 开始合并
                # 简单策略：遍历 result 的所有列，直接赋值回原 data
                for res in results:
                    if not isinstance(res, pd.DataFrame):
                        continue
                    
                    for col in res.columns:
                        data[col] = res[col]
                
                return data

            else:
                logger.warning(f"GroupHandler: 未知的合并策略 '{self.merge_strategy}'，已退化为 passthrough。")
                return data

        else:
            raise ValueError(f"未知的执行模式: {self.mode}")