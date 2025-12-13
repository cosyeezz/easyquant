import logging
from datetime import datetime
from typing import List, Dict, Any
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
    last_published_at: Any | None = None
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
    description: str | None

    class Config:
        orm_mode = True

class CategoryCreate(BaseModel):
    code: str = Field(..., pattern="^[a-z0-9_]+$", description="唯一标识代码")
    name: str = Field(..., description="显示名称")
    description: str | None = None

class CategoryUpdate(BaseModel):
    name: str
    description: str | None = None

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

from typing import List, Dict, Any, Optional
from sqlalchemy import func

# ... (Previous Pydantic Models)

class DataTableListResponse(BaseModel):
    total: int
    items: List[DataTableResponse]

# ...

@router.get("/data-tables", response_model=DataTableListResponse)
async def list_tables(
    page: int = 1,
    page_size: int = 20,
    search: Optional[str] = None,
    category_id: Optional[int] = None,
    status: Optional[TableStatus] = None,
    session: AsyncSession = Depends(get_session)
):
    # Base query
    query = select(DataTableConfig)
    
    # Filters
    filters = []
    if search:
        search_term = f"%{search}%"
        filters.append(
            (DataTableConfig.name.ilike(search_term)) | 
            (DataTableConfig.table_name.ilike(search_term)) |
            (DataTableConfig.description.ilike(search_term))
        )
    if category_id is not None:
        filters.append(DataTableConfig.category_id == category_id)
    if status is not None:
        filters.append(DataTableConfig.status == status)
    
    if filters:
        query = query.where(*filters)
    
    # Count total (before pagination)
    count_stmt = select(func.count()).select_from(query.subquery())
    total_result = await session.execute(count_stmt)
    total = total_result.scalar() or 0
    
    # Pagination
    offset = (page - 1) * page_size
    stmt = query.order_by(DataTableConfig.id.desc()).offset(offset).limit(page_size)
    
    result = await session.execute(stmt)
    items = result.scalars().all()
    
    return {"total": total, "items": items}

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

    # --- Snapshot Comparison ---
    old_table_name = table.table_name
    old_cols = table.columns_schema
    old_idxs = table.indexes_schema
    old_desc = table.description
    
    new_table_name = data.table_name
    new_cols = [c.dict() for c in data.columns_schema]
    new_idxs = [i.dict() for i in data.indexes_schema]
    new_desc = data.description
    
    has_renamed = old_table_name != new_table_name
    has_schema_changed = (old_cols != new_cols) or (old_idxs != new_idxs) or (old_desc != new_desc)
    
    # Check physical existence
    physical_exists = (table.status == TableStatus.CREATED) or (table.last_published_at is not None)

    logger.info(f"Update Table {table_id} | Renamed: {has_renamed} ({old_table_name}->{new_table_name}) | SchemaChanged: {has_schema_changed} | Physical: {physical_exists} | Status: {table.status}")

    # 1. Handle Physical Rename Immediately
    if physical_exists and has_renamed:
        try:
            rename_sql = text(f"ALTER TABLE {old_table_name} RENAME TO {new_table_name}")
            await session.execute(rename_sql)
            logger.info(f"Renamed physical table {old_table_name} to {new_table_name}")
        except Exception as e:
            await session.rollback()
            err = str(e)
            if "does not exist" in err:
                logger.warning(f"Failed to rename {old_table_name} (does not exist?), proceeding with config update.")
            else:
                raise HTTPException(status_code=400, detail=f"Failed to rename physical table: {err}")

    # 2. Update Config Fields
    table.name = data.name
    table.table_name = new_table_name 
    table.category_id = data.category_id
    table.description = new_desc
    table.columns_schema = new_cols
    table.indexes_schema = new_idxs
    
    # 3. Update Status Logic
    # If any physical attribute changed, force DRAFT to trigger Sync flow
    if physical_exists and (has_renamed or has_schema_changed):
        table.status = TableStatus.DRAFT
    
    await session.commit()
    await session.refresh(table)
    return table



from datetime import datetime

# ... (imports remain same, just ensure datetime is there)

@router.post("/data-tables/{id}/publish")
async def publish_table(id: int, session: AsyncSession = Depends(get_session)):
    stmt = select(DataTableConfig).where(DataTableConfig.id == id)
    result = await session.execute(stmt)
    config = result.scalar_one_or_none()
    
    if not config:
        raise HTTPException(status_code=404, detail="Table config not found")
    
    if config.status == TableStatus.CREATED:
        raise HTTPException(status_code=400, detail="Table is already published/synced")

    # Determine mode: Create or Sync
    # Check if physical table exists
    def check_table_exists(sync_session):
        # run_sync provides a synchronous Session object
        insp = inspect(sync_session.connection())
        return insp.has_table(config.table_name)
    
    table_exists = await session.run_sync(check_table_exists)
    
    sqls_to_execute = []

    try:
        if table_exists:
            # --- Sync Mode ---
            def get_db_info(sync_session):
                insp = inspect(sync_session.connection())
                cols = insp.get_columns(config.table_name)
                # Filter out PK index usually named {table}_pkey
                indexes = insp.get_indexes(config.table_name) 
                return cols, indexes

            db_cols, db_indexes = await session.run_sync(get_db_info)

            # 0. Sync Table Comment
            if config.description:
                safe_desc = config.description.replace("'", "''")
                sqls_to_execute.append(f"COMMENT ON TABLE {config.table_name} IS '{safe_desc}';")

            # 1. Sync Columns (Add/Drop/Comment)
            sqls_to_execute.extend(DDLGenerator.generate_sync_sqls(config.table_name, db_cols, config.columns_schema))
            
            # 2. Sync Indexes (Drop All + Re-create All) - Brutal but effective
            for idx in db_indexes:
                # Avoid dropping Primary Key index (usually ends with _pkey or matches PK constraint)
                # Inspect returns indexes, PK is separate usually.
                idx_name = idx['name']
                sqls_to_execute.append(f"DROP INDEX IF EXISTS {idx_name};")
            
            sqls_to_execute.extend(DDLGenerator.generate_index_sqls(config.table_name, config.indexes_schema))
            
        else:
            # --- Create Mode ---
            ddl_sqls = DDLGenerator.generate_create_table_sqls(
                config.table_name, 
                config.description,
                config.columns_schema
            )
            idx_sqls = DDLGenerator.generate_index_sqls(
                config.table_name, 
                config.indexes_schema
            )
            sqls_to_execute = ddl_sqls + idx_sqls

        # Execute SQLs
        logger.info(f"Executing SQLs for table {config.table_name}: {sqls_to_execute}")
        for sql in sqls_to_execute:
            await session.execute(text(sql))
        
        # Update Status
        config.status = TableStatus.CREATED
        config.last_published_at = datetime.utcnow()
        await session.commit()
        
        return {
            "message": f"Table '{config.table_name}' {'synced' if table_exists else 'published'} successfully", 
            "executed_sqls": sqls_to_execute
        }
        
    except Exception as e:
        await session.rollback()
        logger.exception(f"Failed to publish/sync table {id}")
        err_msg = str(e)
        if "already exists" in err_msg:
             raise HTTPException(status_code=400, detail=f"Conflict: {err_msg}")
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