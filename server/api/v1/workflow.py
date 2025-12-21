from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, delete
from typing import List, Any, Dict

from server.storage.database import get_session
from server.storage.models.workflow_node import WorkflowNode
from pydantic import BaseModel

router = APIRouter(prefix="/workflow", tags=["Workflow"])

class WorkflowNodeSchema(BaseModel):
    id: int
    name: str
    title: str
    category: str
    type: str
    icon: str | None
    description: str | None
    parameters_schema: Dict[str, Any]
    ui_config: Dict[str, Any]
    handler_path: str
    is_active: bool

    class Config:
        from_attributes = True

@router.get("/nodes", response_model=List[WorkflowNodeSchema])
async def get_nodes(session: AsyncSession = Depends(get_session)):
    """
    获取所有可用的工作流节点。
    """
    stmt = select(WorkflowNode).order_by(WorkflowNode.category, WorkflowNode.title)
    result = await session.execute(stmt)
    nodes = result.scalars().all()
    return nodes

class WorkflowNodeUpdateSchema(BaseModel):
    title: str | None = None
    category: str | None = None
    type: str | None = None
    icon: str | None = None
    description: str | None = None
    parameters_schema: Dict[str, Any] | None = None
    ui_config: Dict[str, Any] | None = None
    handler_path: str | None = None
    is_active: bool | None = None

class WorkflowNodeCreateSchema(BaseModel):
    name: str
    title: str
    category: str
    type: str = "generic"
    icon: str | None = None
    description: str | None = None
    parameters_schema: Dict[str, Any] = {}
    ui_config: Dict[str, Any] = {}
    handler_path: str
    is_active: bool = True

@router.post("/nodes", response_model=WorkflowNodeSchema)
async def create_node(
    data: WorkflowNodeCreateSchema, 
    session: AsyncSession = Depends(get_session)
):
    """
    创建新的节点定义。
    """
    new_node = WorkflowNode(**data.dict())
    session.add(new_node)
    await session.commit()
    await session.refresh(new_node)
    return new_node

@router.put("/nodes/{node_id}")
async def update_node(
    node_id: int, 
    data: WorkflowNodeUpdateSchema, 
    session: AsyncSession = Depends(get_session)
):
    """
    更新指定的节点定义。
    """
    stmt = select(WorkflowNode).where(WorkflowNode.id == node_id)
    result = await session.execute(stmt)
    node = result.scalar_one_or_none()
    
    if not node:
        raise HTTPException(status_code=404, detail="Node not found")
    
    # 更新字段
    update_data = data.dict(exclude_unset=True)
    for key, value in update_data.items():
        setattr(node, key, value)
    
    await session.commit()
    return {"status": "success"}

@router.delete("/nodes/{node_id}")
async def delete_node(node_id: int, session: AsyncSession = Depends(get_session)):
    """
    删除指定的节点定义。
    """
    stmt = delete(WorkflowNode).where(WorkflowNode.id == node_id)
    await session.execute(stmt)
    await session.commit()
    return {"status": "success"}

@router.post("/nodes/sync")
async def sync_nodes():
    """
    手动触发从代码同步节点到数据库。
    """
    from server.etl.process.sync_nodes import sync_nodes as perform_sync
    try:
        await perform_sync()
        return {"status": "success", "message": "Nodes synchronized from code."}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
