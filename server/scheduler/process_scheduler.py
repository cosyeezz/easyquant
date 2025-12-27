"""
Process Scheduler Engine

Manages multi-process execution with MQ-based communication between process groups.
"""

import logging
import os
from multiprocessing import Process
from typing import Any, Dict, List

from pydantic import BaseModel

from server.mq.base import END_SIGNAL
from server.mq.factory import MQFactory, MQType
from server.nodes.system.scheduler import ProcessGroup, NodeConfig

logger = logging.getLogger(__name__)


class SchedulerConfig(BaseModel):
    """调度器配置"""
    name: str
    process_groups: List[ProcessGroup]
    mq_type: MQType = "redis"
    mq_config: dict = {"redis_url": "redis://localhost:6379"}
    db_url: str = ""


class ProcessScheduler:
    """
    进程调度器引擎

    负责：
    - 启动/管理多个进程组
    - 初始化 MQ 连接
    - 协调进程间通信
    - 汇总执行结果
    """

    def __init__(self, config: SchedulerConfig):
        self.config = config
        self.mq_factory = MQFactory(config.mq_type, config.mq_config)
        self.processes: List[Process] = []

    def run(self) -> Dict[str, Any]:
        """启动所有进程组并等待完成"""
        logger.info(f"Starting scheduler: {self.config.name}")

        # 启动所有进程
        for group in self.config.process_groups:
            for replica_id in range(group.replicas):
                p = Process(
                    target=_run_process_group,
                    args=(
                        group.model_dump(),
                        replica_id,
                        self.config.mq_type,
                        self.config.mq_config,
                        self.config.db_url,
                    ),
                    name=f"{group.name}-{replica_id}",
                )
                p.start()
                self.processes.append(p)
                logger.info(f"Started process: {group.name}-{replica_id} (PID: {p.pid})")

        # 等待所有进程完成
        results = []
        for p in self.processes:
            p.join()
            results.append({
                "name": p.name,
                "pid": p.pid,
                "exitcode": p.exitcode,
            })
            logger.info(f"Process {p.name} finished with exitcode: {p.exitcode}")

        success_count = sum(1 for r in results if r["exitcode"] == 0)
        failed_count = len(results) - success_count

        return {
            "status": "completed",
            "total_processes": len(results),
            "success": success_count,
            "failed": failed_count,
            "details": results,
        }

    def stop(self):
        """停止所有进程"""
        for p in self.processes:
            if p.is_alive():
                p.terminate()
                logger.warning(f"Terminated process: {p.name}")


def _run_process_group(
    group_dict: dict,
    replica_id: int,
    mq_type: str,
    mq_config: dict,
    db_url: str,
):
    """
    子进程入口函数

    在独立进程中执行工作流
    """
    group = ProcessGroup(**group_dict)
    pid = os.getpid()
    logger.info(f"[{group.name}-{replica_id}] Starting (PID: {pid})")

    # 初始化 MQ
    factory = MQFactory(mq_type, mq_config)
    producer = factory.create_producer() if group.output_queue else None
    consumer = factory.create_consumer() if group.input_queue else None

    # 构建 context
    context = {
        "db_url": db_url,
        "mq_producer": producer,
        "mq_consumer": consumer,
        "threads": group.threads,
        "group_name": group.name,
        "replica_id": replica_id,
    }

    try:
        # 执行工作流
        _execute_workflow(group.workflow, context)

        # 生产者发送结束信号
        if producer and group.output_queue:
            producer.send_end_signal(group.output_queue)

        logger.info(f"[{group.name}-{replica_id}] Completed successfully")

    except Exception as e:
        logger.error(f"[{group.name}-{replica_id}] Failed: {e}")
        raise

    finally:
        # 清理资源
        if producer:
            producer.close()
        if consumer:
            consumer.close()


def _execute_workflow(workflow: List[NodeConfig], context: dict):
    """
    执行工作流中的节点序列

    简化版 Runner，串行执行节点
    """
    from server.nodes.registry import registry
    import asyncio

    data = None

    for node_config in workflow:
        # 获取节点类
        node_class = registry.get_node_class(node_config.node_type)

        # 实例化参数
        params = node_class.Parameters(**node_config.params)

        # 创建节点实例
        node = node_class()

        # 执行节点
        result = asyncio.run(node.execute(context, params, {"data": data}))

        # 处理流式节点（如 MQConsumer）
        if isinstance(result, dict) and result.get("type") == "stream":
            stream = result.get("stream")
            for chunk in stream:
                data = chunk
        else:
            data = result

    return data
