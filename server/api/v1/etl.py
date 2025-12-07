import os
import glob
import pandas as pd
from datetime import datetime
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, Body
from sqlalchemy import select, delete
from sqlalchemy.ext.asyncio import AsyncSession
from pydantic import BaseModel

from server.storage.database import get_session
from server.storage.models.etl_task_config import ETLTaskConfig
from server.etl.process.registry import registry

# 自动发现处理器
registry.auto_discover("server.etl.process.handlers")

router = APIRouter()

# --- Pydantic Schemas ---

class ETLTaskConfigBase(BaseModel):
    name: str
    description: Optional[str] = None
    source_type: str
    source_config: dict
    pipeline_config: List[dict]
    batch_size: Optional[int] = 1000
    schedule: Optional[str] = None

class ETLTaskConfigCreate(ETLTaskConfigBase):
    pass

class ETLTaskConfigUpdate(ETLTaskConfigBase):
    pass

class ETLTaskConfigResponse(ETLTaskConfigBase):
    id: int
    created_at: datetime
    updated_at: datetime
    
    class Config:
        from_attributes = True

# --- Handlers Discovery API ---

@router.get("/handlers")
def get_available_handlers():
    """
    获取所有可用的 ETL 处理器及其配置 Schema。
    前端可根据此接口构建动态配置表单。
    """
    return registry.get_all_handlers_metadata()

# --- Source Preview API ---

class SourcePreviewRequest(BaseModel):
    source_type: str
    source_config: dict

@router.post("/preview-source")
def preview_source(request: SourcePreviewRequest):
    """
    预览数据源列名 (用于 CSV 文件夹)。
    """
    if request.source_type == "csv_dir":
        path = request.source_config.get("path")
        if not path or not os.path.exists(path):
            raise HTTPException(status_code=400, detail="路径不存在或无效")
        
        # 查找第一个 CSV 文件
        csv_files = glob.glob(os.path.join(path, "*.csv"))
        if not csv_files:
            raise HTTPException(status_code=400, detail="该目录下没有找到 CSV 文件")
        
        try:
            # 读取第一行获取列名
            df = pd.read_csv(csv_files[0], nrows=0)
            return {"columns": list(df.columns), "preview_file": os.path.basename(csv_files[0])}
        except Exception as e:
            raise HTTPException(status_code=500, detail=f"读取 CSV 失败: {str(e)}")
            
    else:
        raise HTTPException(status_code=400, detail=f"不支持的预览源类型: {request.source_type}")

# --- ETL Task Config CRUD ---

@router.get("/etl-configs", response_model=List[ETLTaskConfigResponse])
async def list_etl_configs(session: AsyncSession = Depends(get_session)):
    result = await session.execute(select(ETLTaskConfig))
    return result.scalars().all()

@router.post("/etl-configs", response_model=ETLTaskConfigResponse)
async def create_etl_config(config: ETLTaskConfigCreate, session: AsyncSession = Depends(get_session)):
    db_config = ETLTaskConfig(**config.model_dump())
    session.add(db_config)
    await session.commit()
    await session.refresh(db_config)
    
    # 转换 datetime 为 isoformat string 以适配 Pydantic
    # (Pydantic v2通常能自动处理 datetime，但为了保险起见，如果 response model 定义了 str，FastAPI 会尝试转换)
    # 实际上 Pydantic 的 datetime 类型更安全，但这里我们先不改 Response Model 的类型定义
    # 修正: Response Model 里的 created_at 是 str? SQLAlchemy 是 datetime.
    # 最好让 Pydantic 处理转换。上面 Response Model 定义里 created_at 是 str，
    # pydantic v2 默认不会自动把 datetime 转 str 除非配置了 json_encoders 或 手动。
    # 更简单的做法是把 Response Model 的 created_at 改为 datetime 类型。
    return db_config

@router.get("/etl-configs/{config_id}", response_model=ETLTaskConfigResponse)
async def get_etl_config(config_id: int, session: AsyncSession = Depends(get_session)):
    result = await session.execute(select(ETLTaskConfig).where(ETLTaskConfig.id == config_id))
    config = result.scalar_one_or_none()
    if not config:
        raise HTTPException(status_code=404, detail="Task config not found")
    return config

@router.put("/etl-configs/{config_id}", response_model=ETLTaskConfigResponse)
async def update_etl_config(config_id: int, update_data: ETLTaskConfigUpdate, session: AsyncSession = Depends(get_session)):
    result = await session.execute(select(ETLTaskConfig).where(ETLTaskConfig.id == config_id))
    config = result.scalar_one_or_none()
    if not config:
        raise HTTPException(status_code=404, detail="Task config not found")
    
    for key, value in update_data.model_dump().items():
        setattr(config, key, value)
    
    await session.commit()
    await session.refresh(config)
    return config

@router.delete("/etl-configs/{config_id}")
async def delete_etl_config(config_id: int, session: AsyncSession = Depends(get_session)):
    result = await session.execute(select(ETLTaskConfig).where(ETLTaskConfig.id == config_id))
    config = result.scalar_one_or_none()
    if not config:
        raise HTTPException(status_code=404, detail="Task config not found")
    
    await session.delete(config)
    await session.commit()
    return {"message": "Deleted successfully"}
