from sqlalchemy import Column, Integer, String, Boolean, ForeignKey, Enum, Text
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.orm import relationship
import enum

from server.storage.models.base import Base, TimestampMixin

class TableStatus(str, enum.Enum):
    DRAFT = "draft"
    CREATED = "created"
    ARCHIVED = "archived"

class TableCategory(Base, TimestampMixin):
    """
    数据表分类
    e.g., Market Data, Fundamental, Alternative, System
    """
    __tablename__ = "table_categories"

    id = Column(Integer, primary_key=True, index=True)
    code = Column(String, unique=True, nullable=False, comment="分类编码 (e.g., market_data)")
    name = Column(String, nullable=False, comment="显示名称")
    description = Column(String, nullable=True)

    # Relationship
    tables = relationship("DataTableConfig", back_populates="category")


class DataTableConfig(Base, TimestampMixin):
    """
    数据表元数据配置
    定义了系统中的数据表结构，用于自动建表和 ETL 映射。
    """
    __tablename__ = "data_table_configs"

    id = Column(Integer, primary_key=True, index=True)
    category_id = Column(Integer, ForeignKey("table_categories.id"), nullable=False)
    
    # Basic Info
    name = Column(String, nullable=False, comment="显示名称")
    table_name = Column(String, unique=True, nullable=False, comment="物理表名")
    description = Column(Text, nullable=False, comment="详细描述")
    status = Column(Enum(TableStatus), default=TableStatus.DRAFT, nullable=False)

    # Schema Definitions (JSONB for PostgreSQL)
    # 存储列定义列表: [{"name": "ts_code", "type": "VARCHAR(20)", "is_pk": true, "comment": "..."}]
    columns_schema = Column(JSONB, nullable=False, default=list, comment="列定义元数据")
    
    # 存储索引定义列表: [{"name": "idx_...", "columns": ["c1", "c2"], "unique": true}]
    indexes_schema = Column(JSONB, nullable=False, default=list, comment="索引定义元数据")

    # Optional: Partitioning config
    partition_config = Column(JSONB, nullable=True, comment="分区策略配置")

    # Relationship
    category = relationship("TableCategory", back_populates="tables")