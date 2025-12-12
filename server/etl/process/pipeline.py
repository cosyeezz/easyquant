from typing import List, Any, Callable, Dict
import asyncio
import logging
import inspect
from .base import BaseHandler

logger = logging.getLogger(__name__)

HandlerType = BaseHandler | Callable[[Any], Any]

class Pipeline:
    """
    一个异步处理管道，按顺序执行一系列的处理器 (Handler)。
    """
    def __init__(self, handlers: List[HandlerType] | None = None):
        """
        初始化一个处理管道。
        :param handlers: 一个由 Handler 组成的列表。
        """
        self._handlers = handlers or []

    def add_step(self, handler: HandlerType):
        self._handlers.append(handler)

    @classmethod
    def create(cls, handlers: List[HandlerType] | None = None) -> 'Pipeline':
        """
        创建一个 Pipeline 实例的工厂方法。
        """
        return cls(handlers)

    async def run(self, initial_data: Any, context: Dict[str, Any] | None = None) -> Any:
        """
        异步执行管道中的所有处理器。

        :param initial_data: 传递给第一个处理器的初始数据。
        :param context: 运行上下文 (Session, Logger, etc.)
        :return: 最后一个处理器的返回值。
        """
        if not self._handlers:
            return initial_data
            
        data = initial_data
        context = context or {}

        try:
            for i, handler in enumerate(self._handlers):
                # 确定调用哪个方法/函数
                if isinstance(handler, BaseHandler):
                    # BaseHandler.handle(data, context=None)
                    func = handler.handle
                else:
                    func = handler

                # 检查参数签名，看是否接受 context
                sig = inspect.signature(func)
                accepts_context = 'context' in sig.parameters

                # 调用逻辑
                if inspect.iscoroutinefunction(func):
                    if accepts_context:
                        data = await func(data, context=context)
                    else:
                        data = await func(data)
                else:
                    if accepts_context:
                        data = func(data, context=context)
                    else:
                        data = func(data)
                        
            return data
        except Exception as e:
            # 增强的错误日志
            data_info = f"Type: {type(initial_data)}"
            if hasattr(initial_data, 'shape'): 
                data_info += f", Shape: {initial_data.shape}"
            elif hasattr(initial_data, '__len__'):
                data_info += f", Len: {len(initial_data)}"
            
            logger.error(f"Pipeline error at handler #{i} ({handler}): {e}. Data Info: {data_info}", exc_info=True)
            raise