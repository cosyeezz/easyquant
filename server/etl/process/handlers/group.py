import asyncio
import copy
import logging
from typing import Any, Dict, List
import pandas as pd
from server.etl.process.base import BaseHandler

logger = logging.getLogger(__name__)

# 延迟导入以避免循环依赖，将在运行时动态获取
# from server.etl.process.registry import HandlerRegistry 

class GroupHandler(BaseHandler):
    """
    组合处理器 (Group/Node Handler)
    允许将多个 Handler 组合成一个节点，支持顺序或并行执行。
    实现逻辑上的 "子 Pipeline"。
    """

    def __init__(self, handlers: List[Dict[str, Any]], mode: str = 'sequential'):
        """
        :param handlers: 子 Handler 的配置列表，例如 [{'name': '...', 'params': {...}}]
        :param mode: 执行模式，'sequential' (顺序) or 'parallel' (并行/并发)
        """
        self.handlers_config = handlers
        self.mode = mode
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
                        "description": "顺序：按顺序执行子步骤。并行：同时执行子步骤（适用于多路分发）。"
                    },
                    "handlers": {
                        "type": "array",
                        "title": "子处理器列表",
                        "items": {
                            "type": "object",
                            # 前端需要特殊处理这个字段，通过递归编辑器生成
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
        这是为了避免在模块加载阶段产生循环导入，同时也为了确保
        只有在真正运行时才实例化子对象。
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

        # 如果数据不是 DataFrame，且我们要并行处理，可能需要考虑深拷贝问题
        # 目前主要针对 Pandas DataFrame
        is_df = isinstance(data, pd.DataFrame)

        if self.mode == 'sequential':
            # === 顺序模式 ===
            # 行为同主 Pipeline：上一个输出是下一个输入
            current_data = data
            for handler in self.initialized_handlers:
                if asyncio.iscoroutinefunction(handler.handle):
                    current_data = await handler.handle(current_data, context)
                else:
                    current_data = handler.handle(current_data, context)
            return current_data

        elif self.mode == 'parallel':
            # === 并行模式 ===
            # 场景：数据分发。例如同时存入两个不同的表，或者同时做两种计算。
            # 关键点：并行执行时不应该修改原始 data，否则会产生 Race Condition。
            # 策略：给每个 Handler 一份数据的深拷贝。
            
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

            # 等待所有任务完成
            if not tasks:
                return data

            # 结果处理：
            # 目前并行模式主要用于“副作用”（如入库）。
            # 并行执行后的“返回值”是一个列表，包含每个分支的结果。
            # 但主线 Pipeline 需要一个单一的数据流继续往下走。
            # 默认行为：返回原始数据 (Pass-through)，假设并行分支只是去做了别的事。
            await asyncio.gather(*tasks)
            
            return data

        else:
            raise ValueError(f"未知的执行模式: {self.mode}")
