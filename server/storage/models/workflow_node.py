from datetime import datetime
from sqlalchemy import Column, Integer, String, DateTime, JSON, Text, Boolean
from server.storage.models.base import Base

class WorkflowNode(Base):
    """
    工作流节点定义表 (Workflow Nodes Registry)
    存储系统中所有可用节点的元数据、能力定义和执行逻辑映射。
    作为前端组件渲染和后端执行器调度的“真理来源 (Source of Truth)”。
    """
    __tablename__ = "workflow_nodes"

    id = Column(Integer, primary_key=True, index=True)
    
    # --- 身份标识 ---
    name = Column(String, unique=True, index=True, nullable=False, comment="唯一标识符 (Internal ID, e.g. 'csv_loader')")
    title = Column(String, nullable=False, comment="显示名称 (e.g. 'CSV 加载器')")
    
    # --- 分类与外观 ---
    category = Column(String, index=True, nullable=False, comment="核心分类 (e.g. 'input', 'transform')")
    type = Column(String, default="generic", nullable=False, comment="节点类型 (generic: 通用表单, custom: 定制UI)")
    icon = Column(String, nullable=True, comment="图标名称或路径")
    description = Column(Text, nullable=True, comment="节点功能描述")
    
    # --- 能力定义 (Schema) ---
    # 定义该节点接受的输入参数结构，遵循 JSON Schema 规范
    # 前端根据此 Schema 自动生成配置表单 (GenericNode)
    parameters_schema = Column(JSON, nullable=False, default={}, comment="输入参数 JSON Schema")
    
    # --- 前端配置 ---
    # 定义节点的默认 UI 属性，如宽度、端口定义、默认值等
    ui_config = Column(JSON, nullable=False, default={}, comment="前端 UI 配置 (宽高, Handles, Defaults)")

    # --- 后端映射 ---
    # 指向后端实际执行该逻辑的 Python 类路径
    handler_path = Column(String, nullable=False, comment="后端执行器路径 (e.g. 'server.etl.process.handlers.CSVLoader')")
    
    # --- 状态 ---
    is_active = Column(Boolean, default=True, comment="是否启用")
    
    # --- 审计字段 ---
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow, nullable=False)

    def __repr__(self):
        return f"<WorkflowNode(name='{self.name}', title='{self.title}', category='{self.category}')>"
