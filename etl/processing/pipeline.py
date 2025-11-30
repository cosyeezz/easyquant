from typing import List, Any, Callable, Union
import asyncio
import logging
import inspect
from .base import BaseHandler

logger = logging.getLogger(__name__)

HandlerType = Union[BaseHandler, Callable[[Any], Any]]

class Pipeline:
    """
    一个异步处理管道，按顺序执行一系列的处理器 (Handler)。

    该管道接收一系列 Handler (BaseHandler 实例或可调用对象)，并依次调用它们。
    它能自动识别 handle 方法是同步还是异步，并以正确的方式调用。
    """
    def __init__(self, handlers: List[HandlerType]):
        """
        初始化一个处理管道。
        :param handlers: 一个由 Handler 组成的列表。
        """
        self._handlers = handlers

    async def run(self, initial_data: Any) -> Any:
        """
        异步执行管道中的所有处理器。

        会检查每个 handler 是同步还是异步：
        - 如果是异步 (async def)，则用 await 调用。
        - 如果是同步 (def)，则直接调用。

        上一个处理器的输出将作为下一个处理器的输入。
        :param initial_data: 传递给第一个处理器的初始数据。
        :return: 最后一个处理器的返回值。
        """
        # 如果没有定义处理器，直接返回原始数据
        if not self._handlers:
            return initial_data
            
        data = initial_data
        try:
            for handler in self._handlers:
                # 确定调用哪个方法/函数
                if isinstance(handler, BaseHandler):
                    func = handler.handle
                else:
                    func = handler

                # 检查是否为协程函数
                if inspect.iscoroutinefunction(func):
                    data = await func(data)
                else:
                    data = func(data)
            return data
        except Exception as e:
            # 避免打印完整数据，只打印类型信息，防止日志污染
            data_info = f"Type: {type(initial_data)}"
            if hasattr(initial_data, 'shape'): # pandas DataFrame/Series
                data_info += f", Shape: {initial_data.shape}"
            elif hasattr(initial_data, '__len__'):
                data_info += f", Len: {len(initial_data)}"
            
            logger.error(f"管道在处理数据 ({data_info}) 时出错: {e}", exc_info=True)
            raise
