from enum import Enum
from typing import Any, Dict, Optional, Type, TypeVar, Generic
from pydantic import BaseModel, Field
from abc import ABC, abstractmethod

class NodeCategory(str, Enum):
    SYSTEM = "system"
    LOGIC = "logic"
    ETL = "etl"
    QUANT = "quant"

TParams = TypeVar("TParams", bound=BaseModel)

class BaseNode(ABC, Generic[TParams]):
    """
    EasyQuant Node Base Class (v2)
    All nodes should inherit from this class and define their own Parameters model.
    """
    
    # Each node class must define its category
    category: NodeCategory
    
    # Each node class must define its parameters schema
    class Parameters(BaseModel):
        pass

    @abstractmethod
    async def execute(self, context: Any, params: TParams, input_data: Optional[Dict[str, Any]] = None) -> Any:
        """
        The main execution logic of the node.
        
        :param context: Execution context (e.g., workflow state, global services)
        :param params: Validated parameters for this node instance
        :param input_data: Data passed from preceding nodes
        :return: Node execution result
        """
        pass

    @classmethod
    def get_metadata(cls) -> Dict[str, Any]:
        """
        Returns the metadata of the node for the frontend registry.
        """
        return {
            "name": cls.__name__,
            "category": cls.category.value,
            "description": cls.__doc__ or "",
            "parameters_schema": cls.Parameters.model_json_schema()
        }
