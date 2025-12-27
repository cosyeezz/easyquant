from fastapi import APIRouter, HTTPException
from typing import Dict, Any, Optional
from pydantic import BaseModel

router = APIRouter(prefix="/workflow", tags=["Workflow"])

class InferSchemaRequest(BaseModel):
    """Schema 推导请求"""
    node_name: str
    config: Dict[str, Any]
    input_schema: Dict[str, Any] | None = None

@router.post("/nodes/infer-schema")
async def infer_node_schema(
    data: InferSchemaRequest
):
    """根据节点配置和输入 Schema 推导输出 Schema"""
    from server.etl.process.registry import registry
    
    # 确保已加载 Handlers
    registry.auto_discover("server.etl.process.handlers")
    
    try:
        handler_class = registry.get_handler(data.node_name)
        output_schema = handler_class.get_output_schema(data.config, data.input_schema)
        return output_schema
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Inference error: {str(e)}")