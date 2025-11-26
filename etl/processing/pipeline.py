from typing import List, Any
import asyncio
import logging
from .base import BaseHandler

logger = logging.getLogger(__name__)

import inspect

class Pipeline:
    """
    一个异步处理管道，按顺序执行一系列的处理器 (Handler)。

    该管道接收一系列 BaseHandler 的实例，并依次调用它们的 handle 方法。
    它能自动识别 handle 方法是同步还是异步，并以正确的方式调用。
    """
    def __init__(self, handlers: List[BaseHandler]):
        """
        初始化一个处理管道。
        :param handlers: 一个由 BaseHandler 实例组成的列表。
        """
        if not handlers:
            raise ValueError("处理器列表不能为空")
        self._handlers = handlers

    async def run(self, initial_data: Any) -> Any:
        """
        异步执行管道中的所有处理器。

        会检查每个 handle 方法是同步还是异步：
        - 如果是异步 (async def)，则用 await 调用。
        - 如果是同步 (def)，则直接调用。

        上一个处理器的输出将作为下一个处理器的输入。
        :param initial_data: 传递给第一个处理器的初始数据。
        :return: 最后一个处理器的返回值。
        """
        data = initial_data
        try:
            for handler in self._handlers:
                handle_method = handler.handle
                if inspect.iscoroutinefunction(handle_method):
                    data = await handle_method(data)
                else:
                    data = handle_method(data)
            return data
        except Exception as e:
            logger.error(f"管道在处理数据 '{initial_data}' 时出错: {e}", exc_info=True)
            raise
