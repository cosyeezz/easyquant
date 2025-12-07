from typing import List, Optional, Dict, Any
from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel, Field, validator
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, inspect, text
from sqlalchemy.exc import IntegrityError

from server.storage.database import get_session
from server.storage.models.data_table_config import DataTableConfig, TableCategory, TableStatus
from server.storage.ddl_generator import DDLGenerator

router = APIRouter()

# --- Pydantic Models ---

class ColumnDef(BaseModel):
    name: str = Field(..., pattern="^[a-z_][a-z0-9_]*$")
    type: str
    is_pk: bool = False
    comment: str

class IndexDef(BaseModel):
    name: str
    columns: List[str]
    unique: bool = False

class DataTableCreate(BaseModel):
    name: str
    table_name: str = Field(..., pattern="^[a-z_][a-z0-9_]*$")
    category_id: int
    description: str
    columns_schema: List[ColumnDef]
    indexes_schema: List[IndexDef] = []
    
    @validator('indexes_schema')
    def validate_indexes(cls, v, values):
        # 校验索引字段是否存在于 columns_schema 中
        if 'columns_schema' not in values:
            return v
        
        col_names = {c.name for c in values['columns_schema']}
        for idx in v:
            for col in idx.columns:
                if col not in col_names:
                    raise ValueError(f"索引字段 '{col}' 未在列定义中找到")
        return v

class DataTableUpdate(DataTableCreate):
    pass

class DataTableResponse(BaseModel):
    id: int
    name: str
    table_name: str
    category_id: int
    description: str
    status: TableStatus
    columns_schema: List[Dict[str, Any]]
    indexes_schema: List[Dict[str, Any]]
    created_at: Any
    updated_at: Any

    class Config:
        orm_mode = True

class CategoryResponse(BaseModel):
    id: int
    code: str
    name: str
    description: Optional[str]

    class Config:
        orm_mode = True

# --- Categories API ---

@router.get("/categories", response_model=List[CategoryResponse])
async def get_categories(session: AsyncSession = Depends(get_session)):
    stmt = select(TableCategory).order_by(TableCategory.id)
    result = await session.execute(stmt)
    return result.scalars().all()

# --- Data Tables API ---

@router.get("/data-tables", response_model=List[DataTableResponse])
async def list_tables(session: AsyncSession = Depends(get_session)):
    stmt = select(DataTableConfig).order_by(DataTableConfig.id.desc())
    result = await session.execute(stmt)
    return result.scalars().all()

@router.get("/data-tables/{id}", response_model=DataTableResponse)
async def get_table(id: int, session: AsyncSession = Depends(get_session)):
    stmt = select(DataTableConfig).where(DataTableConfig.id == id)
    result = await session.execute(stmt)
    config = result.scalar_one_or_none()
    if not config:
        raise HTTPException(status_code=404, detail="Table config not found")
    return config

@router.post("/data-tables", response_model=DataTableResponse)
async def create_table_draft(
    data: DataTableCreate, 
    session: AsyncSession = Depends(get_session)
):
    # Check category existence
    cat_stmt = select(TableCategory).where(TableCategory.id == data.category_id)
    cat_res = await session.execute(cat_stmt)
    if not cat_res.scalar_one_or_none():
        raise HTTPException(status_code=400, detail=f"Category ID {data.category_id} not found")

    # Check table name uniqueness in Config (not DB yet)
    exist_stmt = select(DataTableConfig).where(DataTableConfig.table_name == data.table_name)
    if (await session.execute(exist_stmt)).scalar_one_or_none():
        raise HTTPException(status_code=400, detail=f"Table name '{data.table_name}' already exists in drafts")

    new_table = DataTableConfig(
        name=data.name,
        table_name=data.table_name,
        category_id=data.category_id,
        description=data.description,
        status=TableStatus.DRAFT,
        columns_schema=[c.dict() for c in data.columns_schema],
        indexes_schema=[i.dict() for i in data.indexes_schema]
    )
    session.add(new_table)
    try:
        await session.commit()
        await session.refresh(new_table)
        return new_table
    except IntegrityError:
        await session.rollback()
        raise HTTPException(status_code=400, detail="Database integrity error")

@router.put("/data-tables/{id}", response_model=DataTableResponse)
async def update_table_draft(
    id: int, 
    data: DataTableUpdate, 
    session: AsyncSession = Depends(get_session)
):
    stmt = select(DataTableConfig).where(DataTableConfig.id == id)
    result = await session.execute(stmt)
    config = result.scalar_one_or_none()
    
    if not config:
        raise HTTPException(status_code=404, detail="Table config not found")
    
    if config.status == TableStatus.CREATED:
        # 已发布表只允许修改非结构化字段（如显示名、描述）
        # 这里为了简单，如果已发布，禁止修改 schema
        if (data.table_name != config.table_name or 
            [c.dict() for c in data.columns_schema] != config.columns_schema):
             raise HTTPException(status_code=400, detail="Cannot modify schema of a published table. Use migration tools (TBD).")

    config.name = data.name
    config.description = data.description
    config.category_id = data.category_id
    # Only update schema if draft
    if config.status == TableStatus.DRAFT:
        config.table_name = data.table_name
        config.columns_schema = [c.dict() for c in data.columns_schema]
        config.indexes_schema = [i.dict() for i in data.indexes_schema]

    await session.commit()
    await session.refresh(config)
    return config

@router.post("/data-tables/{id}/publish")
async def publish_table(id: int, session: AsyncSession = Depends(get_session)):
    """
    将草稿状态的表配置应用到物理数据库。
    """
    stmt = select(DataTableConfig).where(DataTableConfig.id == id)
    result = await session.execute(stmt)
    config = result.scalar_one_or_none()
    
    if not config:
        raise HTTPException(status_code=404, detail="Table config not found")
    
    if config.status == TableStatus.CREATED:
        raise HTTPException(status_code=400, detail="Table is already published")

    # 1. Generate DDLs
    try:
        ddl_sqls = DDLGenerator.generate_create_table_sqls(
            config.table_name, 
            config.description,
            config.columns_schema
        )
        idx_sqls = DDLGenerator.generate_index_sqls(
            config.table_name, 
            config.indexes_schema
        )
        all_sqls = ddl_sqls + idx_sqls
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"DDL Generation failed: {str(e)}")

    # 2. Execute DDLs
    # 注意: execute(text(...)) 需要在事务中运行
    try:
        # Check if table physically exists
        # 简单检查：尝试 select 1 from table，如果报错则不存在
        # 或者捕获 create table 的 DuplicateTable 错误
        # 这里直接执行，依赖 DB 报错
        for sql in all_sqls:
            await session.execute(text(sql))
        
        # 3. Update Status
        config.status = TableStatus.CREATED
        await session.commit()
        
        return {"message": f"Table '{config.table_name}' published successfully", "executed_sqls": all_sqls}
        
    except Exception as e:
        await session.rollback()
        # 转换更友好的错误信息
        err_msg = str(e)
        if "already exists" in err_msg:
             raise HTTPException(status_code=400, detail=f"Physical table '{config.table_name}' already exists in database.")
        raise HTTPException(status_code=500, detail=f"Database Execution failed: {err_msg}")

@router.delete("/data-tables/{id}")
async def delete_table(id: int, session: AsyncSession = Depends(get_session)):
    stmt = select(DataTableConfig).where(DataTableConfig.id == id)
    result = await session.execute(stmt)
    config = result.scalar_one_or_none()
    
    if not config:
        raise HTTPException(status_code=404, detail="Table config not found")
        
    if config.status == TableStatus.CREATED:
        # 生产环境通常禁止删除已发布的表，或者需要特殊的 Drop 流程
        # 这里暂时允许删除配置，但不删除物理表（防止误删数据）
        # 或者：抛出错误，要求必须先归档
        raise HTTPException(status_code=400, detail="Cannot delete a published table. Please archive it first (feature TBD).")

    await session.delete(config)
    await session.commit()
    return {"message": "Draft deleted"}