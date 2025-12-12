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

        self.handlers_with_conf = [] # Store tuple (instance, config)
        for h_conf in self.handlers_config:
            name = h_conf.get('name')
            params = h_conf.get('params', {})
            
            # 过滤掉内部控制参数，避免传给 Handler 报错
            # 但我们需要保留它们在 conf 里以便 handle 方法使用
            # 实际上 Handler 的 __init__通常有 **kwargs 或明确参数。
            # 为了安全，我们在实例化时移除 _exec_options，但在保存 conf 时保留。
            
            clean_params = {k: v for k, v in params.items() if k != '_exec_options'}
            
            try:
                handler_cls = HandlerRegistry.get_handler_class(name)
                handler_instance = handler_cls(**clean_params)
                self.handlers_with_conf.append((handler_instance, h_conf))
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
            for handler, _ in self.handlers_with_conf:
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
            for handler, conf in self.handlers_with_conf:
                # === 智能数据准备 ===
                exec_opts = conf.get('params', {}).get('_exec_options', {})
                select_cols = exec_opts.get('select_columns', [])
                copy_mode = exec_opts.get('copy_mode', 'auto')

                sub_data = data
                
                # 1. 列切片
                if is_df and select_cols:
                    # 检查列是否存在，容错处理
                    existing_cols = [c for c in select_cols if c in data.columns]
                    if existing_cols:
                        sub_data = data[existing_cols]
                    # 如果列都不存在，可能传了个空 DF，视具体需求

                # 2. 拷贝控制
                final_input = sub_data
                
                if copy_mode == 'none':
                    # 零拷贝：直接传引用。极快。
                    # 风险：Handler 修改数据会影响主线程和其他分支。
                    pass 
                
                elif copy_mode == 'deep':
                    # 强制深拷贝
                    final_input = sub_data.copy(deep=True) if is_df else copy.deepcopy(sub_data)
                    
                else: # 'auto' (default)
                    # 如果做了列切片，Pandas 默认会返回一个新的 View 或 Copy。
                    # 为安全起见，只要是切片了，我们显式 copy 一次确保独立性。
                    # 如果没切片（全量），则必须 Deep Copy 才能并行安全。
                    if is_df:
                        if select_cols:
                             final_input = sub_data.copy() # Slice copy (memory efficient)
                        else:
                             final_input = sub_data.copy(deep=True) # Full copy
                    else:
                        final_input = copy.deepcopy(sub_data)

                tasks.append(run_safe(handler, final_input))

            if not tasks:
                return data

            # 等待所有任务完成
            results = await asyncio.gather(*tasks)
            
            # === 合并策略 ===
            if self.merge_strategy == 'passthrough':
                return data
            
            elif self.merge_strategy == 'merge_columns':
                if not is_df:
                    return data
                
                for res in results:
                    if not isinstance(res, pd.DataFrame):
                        continue
                    
                    # 将结果的列合并回 data
                    # 如果使用了 select_columns，Handler 返回的可能只是那几列的处理结果
                    # 直接赋值回去即可
                    for col in res.columns:
                        data[col] = res[col]
                
                return data

            else:
                return data

        else:
            raise ValueError(f"未知的执行模式: {self.mode}")