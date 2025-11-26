from abc import ABC, abstractmethod
from typing import Any
import logging

logger = logging.getLogger(__name__)

class BaseHandler(ABC):
    """
    处理管道中处理器的抽象基类。

    每个具体的处理器都必须继承自该类，并实现 handle 方法。
    这确保了管道中的所有组件都具有统一的、可调用的接口。
    """

    @abstractmethod
    async def handle(self, data: Any) -> Any:
        """
        处理传入的数据并返回处理结果。

        这是每个处理器必须实现的核心方法。
        上一个处理器的输出将是下一个处理器的输入。

        :param data: 从上一个处理器或管道初始调用传入的数据。
        :return: 处理后的数据，将传递给下一个处理器。
        """
        raise NotImplementedError
