from abc import ABC, abstractmethod
from typing import Any, Dict
import logging

logger = logging.getLogger(__name__)

class BaseHandler(ABC):
    """
    处理管道中处理器的抽象基类。

    每个具体的处理器都必须继承自该类，并实现 handle 方法。
    为了支持前端动态配置，还需要实现 metadata 类方法。
    """

    @classmethod
    @abstractmethod
    def metadata(cls) -> Dict[str, Any]:
        """
        返回处理器的元数据，用于前端生成配置表单。
        
        应返回包含以下字段的字典:
        - name: 处理器唯一名称 (e.g., "ColumnMapping")
        - description: 简短描述
        - params_schema: JSON Schema 格式的参数定义
        """
        raise NotImplementedError

    @classmethod
    def get_output_schema(cls, config: Dict[str, Any], input_schema: Dict[str, Any] | None = None) -> Dict[str, Any]:
        """
        根据当前节点配置和输入 Schema，推导输出 Schema。
        默认行为是直接传递输入 Schema (Pass-through)。
        
        :param config: 节点的参数配置 (draft_parameters)
        :param input_schema: 上游节点的输出 Schema
        :return: 当前节点的输出 Schema
        """
        return input_schema or {"columns": []}

    @abstractmethod
    async def handle(self, data: Any, context: Dict[str, Any] | None = None) -> Any:
        """
        处理传入的数据并返回处理结果。
        
        :param data: 输入数据
        :param context: 运行上下文 (包含 session, task_info 等)
        """
        raise NotImplementedError
