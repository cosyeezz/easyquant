from datetime import datetime
from sqlalchemy import Column, Integer, String, DateTime, JSON, Text, Boolean, ForeignKey, Enum
from sqlalchemy.orm import relationship
from server.storage.models.base import Base
import enum


class VersionType(str, enum.Enum):
    """版本类型枚举"""
    SNAPSHOT = "SNAPSHOT"  # 快照版 - 可覆盖更新
    RELEASE = "RELEASE"    # 发行版 - 不可修改


class WorkflowNode(Base):
    """
    工作流节点定义表 (Workflow Nodes Registry)
    存储节点的基本信息和草稿配置。
    已发布的版本存储在 workflow_node_versions 表中。
    """
    __tablename__ = "workflow_nodes"

    id = Column(Integer, primary_key=True, index=True)

    # --- 身份标识 ---
    name = Column(String, unique=True, index=True, nullable=False, comment="唯一标识符 (e.g. 'csv_loader')")
    title = Column(String, nullable=False, comment="显示名称 (e.g. 'CSV 加载器')")

    # --- 分类与外观 ---
    category = Column(String, index=True, nullable=False, comment="核心分类 (e.g. 'input', 'transform')")
    icon = Column(String, nullable=True, comment="图标名称")
    description = Column(Text, nullable=True, comment="节点功能描述")

    # --- 草稿配置 (Draft) ---
    # 当前编辑中的配置，保存时更新此字段，发布时复制到版本表
    draft_parameters_schema = Column(JSON, nullable=False, default={}, comment="草稿 - 输入参数 Schema")
    draft_outputs_schema = Column(JSON, nullable=False, default={}, comment="草稿 - 输出参数 Schema")
    draft_ui_config = Column(JSON, nullable=False, default={}, comment="草稿 - UI 配置")
    draft_handler_path = Column(String, nullable=True, comment="草稿 - 后端执行器路径")

    # --- 版本信息 ---
    latest_snapshot = Column(String, nullable=True, comment="最新快照版本号 (e.g. '1.2.0-SNAPSHOT')")
    latest_release = Column(String, nullable=True, comment="最新发行版本号 (e.g. '1.1.0')")

    # --- 状态 ---
    is_deprecated = Column(Boolean, default=False, nullable=False, comment="是否已过期/废弃")

    # --- 审计字段 ---
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow, nullable=False)

    # --- 关联 ---
    versions = relationship("WorkflowNodeVersion", back_populates="node", cascade="all, delete-orphan")

    def __repr__(self):
        return f"<WorkflowNode(name='{self.name}', title='{self.title}')>"

    @property
    def has_published_version(self):
        """是否有已发布的版本"""
        return self.latest_snapshot is not None or self.latest_release is not None

    @property
    def recommended_version(self):
        """推荐使用的版本（优先发行版）"""
        return self.latest_release or self.latest_snapshot


class WorkflowNodeVersion(Base):
    """
    工作流节点版本表 (Version Snapshots)
    存储节点的已发布版本，包括快照版和发行版。
    """
    __tablename__ = "workflow_node_versions"

    id = Column(Integer, primary_key=True, index=True)

    # --- 关联 ---
    node_id = Column(Integer, ForeignKey("workflow_nodes.id", ondelete="CASCADE"), nullable=False, index=True)
    node = relationship("WorkflowNode", back_populates="versions")

    # --- 版本标识 ---
    version = Column(String, nullable=False, comment="版本号 (e.g. '1.0.0' or '1.0.0-SNAPSHOT')")
    version_type = Column(String, nullable=False, comment="版本类型: SNAPSHOT 或 RELEASE")

    # --- 版本配置快照 ---
    parameters_schema = Column(JSON, nullable=False, default={}, comment="输入参数 Schema")
    outputs_schema = Column(JSON, nullable=False, default={}, comment="输出参数 Schema")
    ui_config = Column(JSON, nullable=False, default={}, comment="UI 配置")
    handler_path = Column(String, nullable=False, comment="后端执行器路径")

    # --- 变更记录 ---
    changelog = Column(Text, nullable=True, comment="版本变更说明")

    # --- 审计字段 ---
    published_at = Column(DateTime, default=datetime.utcnow, nullable=False, comment="发布时间")

    def __repr__(self):
        return f"<WorkflowNodeVersion(node_id={self.node_id}, version='{self.version}')>"

    @property
    def is_snapshot(self):
        return self.version_type == VersionType.SNAPSHOT.value

    @property
    def is_release(self):
        return self.version_type == VersionType.RELEASE.value
