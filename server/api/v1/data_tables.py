import logging
from typing import List, Optional, Dict, Any
from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel, Field, validator
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, inspect, text
from sqlalchemy.exc import IntegrityError

from server.storage.database import get_session
from server.storage.models.data_table_config import DataTableConfig, TableCategory, TableStatus
from server.storage.ddl_generator import DDLGenerator

logger = logging.getLogger(__name__)

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

class CategoryCreate(BaseModel):
    code: str = Field(..., pattern="^[a-z0-9_]+$", description="唯一标识代码")
    name: str = Field(..., description="显示名称")
    description: Optional[str] = None

class CategoryUpdate(BaseModel):
    name: str
    description: Optional[str] = None

# --- Categories API ---

@router.get("/categories", response_model=List[CategoryResponse])
async def get_categories(session: AsyncSession = Depends(get_session)):
    stmt = select(TableCategory).order_by(TableCategory.id)
    result = await session.execute(stmt)
    return result.scalars().all()

@router.post("/categories", response_model=CategoryResponse)
async def create_category(data: CategoryCreate, session: AsyncSession = Depends(get_session)):
    # Check if code exists
    stmt = select(TableCategory).where(TableCategory.code == data.code)
    if (await session.execute(stmt)).scalar_one_or_none():
        raise HTTPException(status_code=400, detail=f"Category code '{data.code}' already exists")
    
    new_cat = TableCategory(
        code=data.code,
        name=data.name,
        description=data.description
    )
    session.add(new_cat)
    try:
        await session.commit()
        await session.refresh(new_cat)
        return new_cat
    except IntegrityError:
        await session.rollback()
        raise HTTPException(status_code=400, detail="Database integrity error")

@router.put("/categories/{id}", response_model=CategoryResponse)
async def update_category(id: int, data: CategoryUpdate, session: AsyncSession = Depends(get_session)):
    stmt = select(TableCategory).where(TableCategory.id == id)
    cat = (await session.execute(stmt)).scalar_one_or_none()
    if not cat:
        raise HTTPException(status_code=404, detail="Category not found")
    
    cat.name = data.name
    cat.description = data.description
    await session.commit()
    await session.refresh(cat)
    return cat

@router.delete("/categories/{id}")
async def delete_category(id: int, session: AsyncSession = Depends(get_session)):
    # Check if used
    stmt = select(DataTableConfig).where(DataTableConfig.category_id == id)
    if (await session.execute(stmt)).first():
        raise HTTPException(status_code=400, detail="Cannot delete category that is in use by tables")
        
    del_stmt = select(TableCategory).where(TableCategory.id == id)
    cat = (await session.execute(del_stmt)).scalar_one_or_none()
    if not cat:
        raise HTTPException(status_code=404, detail="Category not found")
        
    await session.delete(cat)
    await session.commit()
    return {"message": "Category deleted"}

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
async def create_data_table(data: DataTableCreate, session: AsyncSession = Depends(get_session)):
    # 1. Validate Schema Logic
    is_valid, error_msg = DDLGenerator.validate_schema(
        data.table_name, 
        [c.dict() for c in data.columns_schema],
        [i.dict() for i in data.indexes_schema]
    )
    if not is_valid:
        raise HTTPException(status_code=400, detail=f"Schema Validation Error: {error_msg}")

    # Check existing physical name
    stmt = select(DataTableConfig).where(DataTableConfig.table_name == data.table_name)
    if (await session.execute(stmt)).scalar_one_or_none():
        raise HTTPException(status_code=400, detail=f"Table name '{data.table_name}' already exists")

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
    await session.commit()
    await session.refresh(new_table)
    return new_table

@router.put("/data-tables/{table_id}", response_model=DataTableResponse)
async def update_data_table(table_id: int, data: DataTableUpdate, session: AsyncSession = Depends(get_session)):
    stmt = select(DataTableConfig).where(DataTableConfig.id == table_id)
    table = (await session.execute(stmt)).scalar_one_or_none()
    
    if not table:
        raise HTTPException(status_code=404, detail="Data table not found")

    # Validate Schema Logic
    is_valid, error_msg = DDLGenerator.validate_schema(
        data.table_name, 
        [c.dict() for c in data.columns_schema], 
        [i.dict() for i in data.indexes_schema]
    )
    if not is_valid:
        raise HTTPException(status_code=400, detail=f"Schema Validation Error: {error_msg}")

    if table.status == TableStatus.CREATED:
        # 已发布表只允许有限修改 (这里之前已经放宽了限制，但我们可以加回一些检查，或者信任用户)
        # 目前保持放宽，只检查表名变更（通常不允许变表名）
        if table.table_name != data.table_name:
             raise HTTPException(status_code=400, detail="Cannot rename a published table")
    
    table.name = data.name
    # table_name update is allowed only for DRAFT, but frontend disables it for CREATED.
    # If backend receives it, we can either ignore or error.
    if table.status == TableStatus.DRAFT:
        table.table_name = data.table_name
        
    table.category_id = data.category_id
    table.description = data.description
    table.columns_schema = [c.dict() for c in data.columns_schema]
    table.indexes_schema = [i.dict() for i in data.indexes_schema]
    
    await session.commit()
    await session.refresh(table)
    return table

@router.post("/data-tables/{table_id}/publish")
async def publish_data_table(table_id: int, session: AsyncSession = Depends(get_session)):
    stmt = select(DataTableConfig).where(DataTableConfig.id == table_id)
    table = (await session.execute(stmt)).scalar_one_or_none()
    
    if not table:
        raise HTTPException(status_code=404, detail="Data table not found")
        
    if table.status == TableStatus.CREATED:
        raise HTTPException(status_code=400, detail="Table is already published")
        
    # 1. Validate again
    is_valid, error_msg = DDLGenerator.validate_schema(
        table.table_name, 
        table.columns_schema,
        table.indexes_schema
    )
    if not is_valid:
        raise HTTPException(status_code=400, detail=error_msg)
        
    # 2. Generate DDL
    try:
        ddls = DDLGenerator.generate_create_table_sqls(
            table.table_name, 
            table.description, 
            table.columns_schema
        )
        idx_ddls = DDLGenerator.generate_index_sqls(
            table.table_name,
            table.indexes_schema
        )
        all_sqls = ddls + idx_ddls
        
        # 3. Execute DDL
        for sql in all_sqls:
            await session.execute(text(sql))
            
        # 4. Update Status
        table.status = TableStatus.CREATED
        await session.commit()
        
    except Exception as e:
        await session.rollback()
        logger.exception(f"Failed to publish table {table_id}")
        # Clean up if partial creation happened? 
        # Ideally DDLs are not transactional in some DBs, but Postgres supports transactional DDL.
        # So rollback should drop the table if created inside transaction.
        raise HTTPException(status_code=500, detail=f"Failed to publish table: {str(e)}")
        
    return {"message": "Table published successfully", "status": "CREATED"}

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
        logger.exception(f"Failed to publish table {id}")
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
        # 允许删除已发布表，同时删除物理表
        try:
            # DROP TABLE IF EXISTS ... CASCADE
            # table_name is validated by regex on creation, so injection risk is minimal
            drop_sql = text(f"DROP TABLE IF EXISTS {config.table_name} CASCADE")
            await session.execute(drop_sql)
        except Exception as e:
            await session.rollback()
            raise HTTPException(status_code=500, detail=f"Failed to drop physical table: {str(e)}")

    await session.delete(config)
    await session.commit()
    return {"message": "Table and configuration deleted successfully"}