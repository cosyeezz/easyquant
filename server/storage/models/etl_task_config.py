from datetime import datetime
from sqlalchemy import Column, Integer, String, DateTime, JSON, Text
from server.storage.models.base import Base

class ETLTaskConfig(Base):
    """
    ETL 任务配置表
    存储 ETL 任务的元数据、数据源配置以及处理链路配置。
    """
    __tablename__ = "etl_task_configs"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, index=True, nullable=False, comment="任务名称")
    description = Column(Text, nullable=True, comment="任务描述")
    
    # --- Loader / 数据源配置 ---
    # source_type 示例: 'csv_dir', 'db_query', 'api'
    source_type = Column(String, nullable=False, comment="数据源类型")
    # source_config 示例: {"path": "F:/data/stocks"}
    source_config = Column(JSON, nullable=False, default={}, comment="数据源详细配置参数")
    
    # --- 任务类型 ---
    # 示例: 'etl', 'backtest', 'live'
    type = Column(String, nullable=False, default='etl', server_default='etl', comment="任务类型")

    # --- Pipeline / 处理链路配置 ---
    # pipeline_config 示例: [{"name": "ColumnMapping", "params": {...}}, ...]
    # 这是一个有序列表，定义了处理器链
    pipeline_config = Column(JSON, nullable=False, default=[], comment="处理链路配置")

    # --- Graph / 前端图编辑器配置 ---
    # 存储 ReactFlow 的 nodes, edges, viewport 等信息，用于前端还原画布
    graph_config = Column(JSON, nullable=True, default={}, comment="前端图编辑器数据")
    
    # --- 运行参数 ---
    batch_size = Column(Integer, default=1000, comment="批次处理大小")
    # 预留字段，未来用于并行处理或定时任务
    schedule = Column(String, nullable=True, comment="Crontab 定时表达式")
    
    # --- 审计字段 ---
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow, nullable=False)

    def __repr__(self):
        return f"<ETLTaskConfig(id={self.id}, name='{self.name}', source_type='{self.source_type}')>"
