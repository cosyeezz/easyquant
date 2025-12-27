from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, delete
from sqlalchemy.orm import selectinload
from typing import List, Any, Dict, Optional
from datetime import datetime
import re

from server.storage.database import get_session
from server.storage.models.workflow_node import WorkflowNode, WorkflowNodeVersion, VersionType
from pydantic import BaseModel

router = APIRouter(prefix="/workflow", tags=["Workflow"])


# ==================== Schemas ====================

class WorkflowNodeVersionSchema(BaseModel):
    """版本信息 Schema"""
    id: int
    version: str
    version_type: str
    changelog: str | None
    published_at: datetime

    class Config:
        from_attributes = True


class WorkflowNodeSchema(BaseModel):
    """节点信息 Schema (含草稿配置)"""
    id: int
    name: str
    title: str
    category: str
    icon: str | None
    description: str | None
    # 草稿配置
    draft_parameters_schema: Dict[str, Any]
    draft_outputs_schema: Dict[str, Any]
    draft_ui_config: Dict[str, Any]
    draft_handler_path: str | None
    # 版本信息
    latest_snapshot: str | None
    latest_release: str | None
    is_deprecated: bool = False
    # 版本列表
    versions: List[WorkflowNodeVersionSchema] = []

    class Config:
        from_attributes = True


class WorkflowNodeListSchema(BaseModel):
    """节点列表 Schema (含草稿配置)"""
    id: int
    name: str
    title: str
    category: str
    icon: str | None
    description: str | None
    latest_snapshot: str | None
    latest_release: str | None
    is_deprecated: bool = False
    # 草稿配置
    draft_parameters_schema: Dict[str, Any]
    draft_outputs_schema: Dict[str, Any]
    draft_ui_config: Dict[str, Any]
    draft_handler_path: str | None

    class Config:
        from_attributes = True


class WorkflowNodeCreateSchema(BaseModel):
    """创建节点 Schema"""
    name: str
    title: str
    category: str
    icon: str | None = None
    description: str | None = None
    draft_parameters_schema: Dict[str, Any] = {}
    draft_outputs_schema: Dict[str, Any] = {}
    draft_ui_config: Dict[str, Any] = {}
    draft_handler_path: str | None = None


class WorkflowNodeUpdateSchema(BaseModel):
    """更新节点草稿 Schema"""
    title: str | None = None
    category: str | None = None
    icon: str | None = None
    description: str | None = None
    draft_parameters_schema: Dict[str, Any] | None = None
    draft_outputs_schema: Dict[str, Any] | None = None
    draft_ui_config: Dict[str, Any] | None = None
    draft_handler_path: str | None = None


class PublishNodeSchema(BaseModel):
    """发布节点 Schema"""
    version_type: str  # "SNAPSHOT" or "RELEASE"
    version: str | None = None  # 可选，不填则自动生成
    changelog: str | None = None


class VersionConfigSchema(BaseModel):
    """版本配置详情 Schema"""
    id: int
    node_id: int
    version: str
    version_type: str
    parameters_schema: Dict[str, Any]
    outputs_schema: Dict[str, Any]
    ui_config: Dict[str, Any]
    handler_path: str
    changelog: str | None
    published_at: datetime

    class Config:
        from_attributes = True


# ==================== Helper Functions ====================

def parse_version(version_str: str) -> tuple:
    """解析版本号，返回 (major, minor, patch, is_snapshot)"""
    if not version_str:
        return (0, 0, 0, True)

    is_snapshot = version_str.endswith("-SNAPSHOT")
    clean_version = version_str.replace("-SNAPSHOT", "")

    parts = clean_version.split(".")
    major = int(parts[0]) if len(parts) > 0 else 0
    minor = int(parts[1]) if len(parts) > 1 else 0
    patch = int(parts[2]) if len(parts) > 2 else 0

    return (major, minor, patch, is_snapshot)


def generate_next_version(latest_release: str | None, latest_snapshot: str | None, version_type: str) -> str:
    """生成下一个版本号"""
    if version_type == VersionType.SNAPSHOT.value:
        # 快照版基于最新发行版 +0.1.0
        if latest_release:
            major, minor, patch, _ = parse_version(latest_release)
            return f"{major}.{minor + 1}.0-SNAPSHOT"
        elif latest_snapshot:
            # 已有快照，保持版本号
            return latest_snapshot
        else:
            return "1.0.0-SNAPSHOT"
    else:
        # 发行版：去掉 SNAPSHOT 后缀，或基于最新发行版 +0.0.1
        if latest_snapshot:
            return latest_snapshot.replace("-SNAPSHOT", "")
        elif latest_release:
            major, minor, patch, _ = parse_version(latest_release)
            return f"{major}.{minor}.{patch + 1}"
        else:
            return "1.0.0"


# ==================== API Endpoints ====================

@router.get("/nodes", response_model=List[WorkflowNodeListSchema])
async def get_nodes(session: AsyncSession = Depends(get_session)):
    """获取所有节点列表 (简化版，不含版本详情)"""
    stmt = select(WorkflowNode).order_by(WorkflowNode.category, WorkflowNode.title)
    result = await session.execute(stmt)
    nodes = result.scalars().all()
    return nodes


@router.get("/nodes/{node_id}", response_model=WorkflowNodeSchema)
async def get_node(node_id: int, session: AsyncSession = Depends(get_session)):
    """获取单个节点详情 (含版本列表)"""
    stmt = select(WorkflowNode).where(WorkflowNode.id == node_id).options(
        selectinload(WorkflowNode.versions)
    )
    result = await session.execute(stmt)
    node = result.scalar_one_or_none()

    if not node:
        raise HTTPException(status_code=404, detail="Node not found")

    return node


@router.post("/nodes", response_model=WorkflowNodeSchema)
async def create_node(
    data: WorkflowNodeCreateSchema,
    session: AsyncSession = Depends(get_session)
):
    """创建新节点 (草稿状态)"""
    # 检查名称是否已存在
    stmt = select(WorkflowNode).where(WorkflowNode.name == data.name)
    result = await session.execute(stmt)
    if result.scalar_one_or_none():
        raise HTTPException(status_code=400, detail="Node name already exists")

    new_node = WorkflowNode(**data.model_dump())
    session.add(new_node)
    await session.commit()

    # 重新查询以加载 versions 关系
    stmt = select(WorkflowNode).where(WorkflowNode.id == new_node.id).options(
        selectinload(WorkflowNode.versions)
    )
    result = await session.execute(stmt)
    return result.scalar_one()


@router.put("/nodes/{node_id}", response_model=WorkflowNodeSchema)
async def update_node(
    node_id: int,
    data: WorkflowNodeUpdateSchema,
    session: AsyncSession = Depends(get_session)
):
    """更新节点草稿配置"""
    stmt = select(WorkflowNode).where(WorkflowNode.id == node_id)
    result = await session.execute(stmt)
    node = result.scalar_one_or_none()

    if not node:
        raise HTTPException(status_code=404, detail="Node not found")

    # 更新草稿字段
    update_data = data.model_dump(exclude_unset=True)
    for key, value in update_data.items():
        setattr(node, key, value)

    await session.commit()

    # 重新查询以加载 versions 关系
    stmt = select(WorkflowNode).where(WorkflowNode.id == node_id).options(
        selectinload(WorkflowNode.versions)
    )
    result = await session.execute(stmt)
    return result.scalar_one()


@router.delete("/nodes/{node_id}")
async def delete_node(node_id: int, session: AsyncSession = Depends(get_session)):
    """删除节点 (仅允许删除无发布版本的节点)"""
    stmt = select(WorkflowNode).where(WorkflowNode.id == node_id)
    result = await session.execute(stmt)
    node = result.scalar_one_or_none()

    if not node:
        raise HTTPException(status_code=404, detail="Node not found")

    # 检查是否有发布版本
    if node.latest_release:
        raise HTTPException(
            status_code=400,
            detail="Cannot delete node with published release versions. Please deprecate instead."
        )

    await session.delete(node)
    await session.commit()
    return {"status": "success"}


@router.post("/nodes/{node_id}/deprecate", response_model=WorkflowNodeSchema)
async def deprecate_node(node_id: int, session: AsyncSession = Depends(get_session)):
    """标记节点为过期"""
    stmt = select(WorkflowNode).where(WorkflowNode.id == node_id)
    result = await session.execute(stmt)
    node = result.scalar_one_or_none()

    if not node:
        raise HTTPException(status_code=404, detail="Node not found")

    node.is_deprecated = True
    await session.commit()

    stmt = select(WorkflowNode).where(WorkflowNode.id == node_id).options(
        selectinload(WorkflowNode.versions)
    )
    result = await session.execute(stmt)
    return result.scalar_one()


@router.post("/nodes/{node_id}/undeprecate", response_model=WorkflowNodeSchema)
async def undeprecate_node(node_id: int, session: AsyncSession = Depends(get_session)):
    """取消节点过期标记"""
    stmt = select(WorkflowNode).where(WorkflowNode.id == node_id)
    result = await session.execute(stmt)
    node = result.scalar_one_or_none()

    if not node:
        raise HTTPException(status_code=404, detail="Node not found")

    node.is_deprecated = False
    await session.commit()

    stmt = select(WorkflowNode).where(WorkflowNode.id == node_id).options(
        selectinload(WorkflowNode.versions)
    )
    result = await session.execute(stmt)
    return result.scalar_one()


@router.post("/nodes/{node_id}/publish", response_model=VersionConfigSchema)
async def publish_node(
    node_id: int,
    data: PublishNodeSchema,
    session: AsyncSession = Depends(get_session)
):
    """发布节点版本"""
    stmt = select(WorkflowNode).where(WorkflowNode.id == node_id)
    result = await session.execute(stmt)
    node = result.scalar_one_or_none()

    if not node:
        raise HTTPException(status_code=404, detail="Node not found")

    # 验证 handler_path
    if not node.draft_handler_path:
        raise HTTPException(status_code=400, detail="Handler path is required before publishing")

    # 确定版本号
    version_type = data.version_type.upper()
    if version_type not in [VersionType.SNAPSHOT.value, VersionType.RELEASE.value]:
        raise HTTPException(status_code=400, detail="Invalid version type")

    if data.version:
        version = data.version
    else:
        version = generate_next_version(node.latest_release, node.latest_snapshot, version_type)

    # 如果是快照版，检查是否已存在同版本，存在则更新
    if version_type == VersionType.SNAPSHOT.value:
        stmt = select(WorkflowNodeVersion).where(
            WorkflowNodeVersion.node_id == node_id,
            WorkflowNodeVersion.version == version
        )
        result = await session.execute(stmt)
        existing_version = result.scalar_one_or_none()

        if existing_version:
            # 更新现有快照
            existing_version.parameters_schema = node.draft_parameters_schema
            existing_version.outputs_schema = node.draft_outputs_schema
            existing_version.ui_config = node.draft_ui_config
            existing_version.handler_path = node.draft_handler_path
            existing_version.changelog = data.changelog
            existing_version.published_at = datetime.utcnow()

            await session.commit()
            await session.refresh(existing_version)
            return existing_version

    # 如果是发行版，检查版本号是否已存在
    if version_type == VersionType.RELEASE.value:
        stmt = select(WorkflowNodeVersion).where(
            WorkflowNodeVersion.node_id == node_id,
            WorkflowNodeVersion.version == version
        )
        result = await session.execute(stmt)
        if result.scalar_one_or_none():
            raise HTTPException(status_code=400, detail=f"Version {version} already exists")

    # 创建新版本
    new_version = WorkflowNodeVersion(
        node_id=node_id,
        version=version,
        version_type=version_type,
        parameters_schema=node.draft_parameters_schema,
        outputs_schema=node.draft_outputs_schema,
        ui_config=node.draft_ui_config,
        handler_path=node.draft_handler_path,
        changelog=data.changelog,
        published_at=datetime.utcnow()
    )
    session.add(new_version)

    # 更新节点的最新版本信息
    if version_type == VersionType.SNAPSHOT.value:
        node.latest_snapshot = version
    else:
        node.latest_release = version

    await session.commit()
    await session.refresh(new_version)
    return new_version


@router.get("/nodes/{node_id}/versions", response_model=List[WorkflowNodeVersionSchema])
async def get_node_versions(node_id: int, session: AsyncSession = Depends(get_session)):
    """获取节点的所有版本"""
    stmt = select(WorkflowNodeVersion).where(
        WorkflowNodeVersion.node_id == node_id
    ).order_by(WorkflowNodeVersion.published_at.desc())

    result = await session.execute(stmt)
    versions = result.scalars().all()
    return versions


@router.get("/nodes/{node_id}/versions/{version}", response_model=VersionConfigSchema)
async def get_node_version(
    node_id: int,
    version: str,
    session: AsyncSession = Depends(get_session)
):
    """获取节点指定版本的配置"""
    stmt = select(WorkflowNodeVersion).where(
        WorkflowNodeVersion.node_id == node_id,
        WorkflowNodeVersion.version == version
    )
    result = await session.execute(stmt)
    version_obj = result.scalar_one_or_none()

    if not version_obj:
        raise HTTPException(status_code=404, detail="Version not found")

    return version_obj


class RollbackSchema(BaseModel):
    """回滚版本 Schema"""
    version: str


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


@router.post("/nodes/{node_id}/rollback", response_model=WorkflowNodeSchema)
async def rollback_node(
    node_id: int,
    data: RollbackSchema,
    session: AsyncSession = Depends(get_session)
):
    """将指定版本的配置回滚到草稿"""
    # 获取节点
    stmt = select(WorkflowNode).where(WorkflowNode.id == node_id)
    result = await session.execute(stmt)
    node = result.scalar_one_or_none()
    if not node:
        raise HTTPException(status_code=404, detail="Node not found")

    # 获取目标版本
    stmt = select(WorkflowNodeVersion).where(
        WorkflowNodeVersion.node_id == node_id,
        WorkflowNodeVersion.version == data.version
    )
    result = await session.execute(stmt)
    version_obj = result.scalar_one_or_none()
    if not version_obj:
        raise HTTPException(status_code=404, detail="Version not found")

    # 将版本配置复制到草稿
    node.draft_parameters_schema = version_obj.parameters_schema
    node.draft_outputs_schema = version_obj.outputs_schema
    node.draft_ui_config = version_obj.ui_config
    node.draft_handler_path = version_obj.handler_path

    await session.commit()

    # 重新查询以加载 versions 关系
    stmt = select(WorkflowNode).where(WorkflowNode.id == node_id).options(
        selectinload(WorkflowNode.versions)
    )
    result = await session.execute(stmt)
    return result.scalar_one()


@router.get("/published-nodes")
async def get_published_nodes(session: AsyncSession = Depends(get_session)):
    """获取所有已发布的节点 (用于画布节点选择器)"""
    stmt = select(WorkflowNode).where(
        (WorkflowNode.latest_snapshot != None) | (WorkflowNode.latest_release != None)
    ).order_by(WorkflowNode.category, WorkflowNode.title)

    result = await session.execute(stmt)
    nodes = result.scalars().all()

    # 返回节点及其可用版本
    response = []
    for node in nodes:
        versions_stmt = select(WorkflowNodeVersion).where(
            WorkflowNodeVersion.node_id == node.id
        ).order_by(WorkflowNodeVersion.published_at.desc())
        versions_result = await session.execute(versions_stmt)
        versions = versions_result.scalars().all()

        response.append({
            "id": node.id,
            "name": node.name,
            "title": node.title,
            "category": node.category,
            "icon": node.icon,
            "description": node.description,
            "recommended_version": node.latest_release or node.latest_snapshot,
            "versions": [
                {
                    "version": v.version,
                    "version_type": v.version_type,
                    "published_at": v.published_at
                }
                for v in versions
            ]
        })

    return response
