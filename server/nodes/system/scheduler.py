"""
Process Scheduler Node

The core system node that orchestrates multi-process execution with MQ-based communication.
This node wraps entire workflows and manages process groups.
"""

from typing import Optional, Dict, Any, List, Literal
from pydantic import Field, BaseModel
from server.nodes.base import BaseNode, NodeCategory


class NodeConfig(BaseModel):
    """节点配置"""
    id: str
    node_type: str
    params: dict = {}
    position: dict = {"x": 0, "y": 0}


class ProcessGroup(BaseModel):
    """进程组配置"""
    id: str
    name: str
    replicas: int = Field(default=1, ge=1, le=32, description="进程数")
    threads: int = Field(default=1, ge=1, le=16, description="线程数")
    input_queue: Optional[str] = Field(default=None, description="输入队列（消费者）")
    output_queue: Optional[str] = Field(default=None, description="输出队列（生产者）")
    workflow: List[NodeConfig] = Field(default_factory=list, description="内部工作流")


class ProcessSchedulerNode(BaseNode):
    """
    进程调度节点 - 管理多进程组的编排与执行

    特点：
    - 可视化配置进程组
    - 通过 MQ 解耦进程间通信
    - 支持生产者/消费者模式
    - 弹性扩缩容
    """

    category = NodeCategory.SYSTEM

    class Parameters(BaseModel):
        name: str = Field(default="Scheduler", description="调度器名称")
        process_groups: List[ProcessGroup] = Field(
            default_factory=list, description="进程组列表"
        )
        mq_type: Literal["redis", "rocketmq"] = Field(
            default="redis", description="消息队列类型"
        )
        mq_config: dict = Field(
            default_factory=lambda: {"redis_url": "redis://localhost:6379"},
            description="MQ 连接配置",
        )

    async def execute(
        self,
        context: Any,
        params: Parameters,
        input_data: Optional[Dict[str, Any]] = None,
    ) -> Any:
        """
        执行进程调度

        实际执行由 ProcessScheduler 引擎完成，
        此方法返回配置供引擎使用。
        """
        return {
            "type": "scheduler",
            "name": params.name,
            "process_groups": [g.model_dump() for g in params.process_groups],
            "mq_type": params.mq_type,
            "mq_config": params.mq_config,
        }
