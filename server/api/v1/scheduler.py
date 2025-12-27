"""
Scheduler API endpoints

Provides REST API for managing and running process schedulers.
"""

from typing import List
from fastapi import APIRouter, HTTPException, BackgroundTasks
from pydantic import BaseModel

from server.nodes.system.scheduler import ProcessGroup
from server.scheduler.process_scheduler import ProcessScheduler, SchedulerConfig

router = APIRouter(prefix="/scheduler", tags=["scheduler"])


class CreateSchedulerRequest(BaseModel):
    """创建调度器请求"""
    name: str
    process_groups: List[ProcessGroup]
    mq_type: str = "redis"
    mq_config: dict = {"redis_url": "redis://localhost:6379"}


class RunSchedulerRequest(BaseModel):
    """运行调度器请求"""
    name: str
    process_groups: List[ProcessGroup]
    mq_type: str = "redis"
    mq_config: dict = {"redis_url": "redis://localhost:6379"}
    db_url: str = ""


# 存储运行中的调度器
_running_schedulers: dict = {}


@router.post("/run")
async def run_scheduler(request: RunSchedulerRequest, background_tasks: BackgroundTasks):
    """
    启动进程调度器

    在后台运行，立即返回任务 ID
    """
    import uuid

    task_id = str(uuid.uuid4())[:8]

    config = SchedulerConfig(
        name=request.name,
        process_groups=request.process_groups,
        mq_type=request.mq_type,
        mq_config=request.mq_config,
        db_url=request.db_url,
    )

    scheduler = ProcessScheduler(config)
    _running_schedulers[task_id] = {"scheduler": scheduler, "status": "running"}

    def run_and_update():
        try:
            result = scheduler.run()
            _running_schedulers[task_id]["status"] = "completed"
            _running_schedulers[task_id]["result"] = result
        except Exception as e:
            _running_schedulers[task_id]["status"] = "failed"
            _running_schedulers[task_id]["error"] = str(e)

    background_tasks.add_task(run_and_update)

    return {"task_id": task_id, "status": "started"}


@router.get("/status/{task_id}")
async def get_scheduler_status(task_id: str):
    """获取调度器运行状态"""
    if task_id not in _running_schedulers:
        raise HTTPException(status_code=404, detail="Task not found")

    task = _running_schedulers[task_id]
    return {
        "task_id": task_id,
        "status": task["status"],
        "result": task.get("result"),
        "error": task.get("error"),
    }


@router.post("/stop/{task_id}")
async def stop_scheduler(task_id: str):
    """停止运行中的调度器"""
    if task_id not in _running_schedulers:
        raise HTTPException(status_code=404, detail="Task not found")

    task = _running_schedulers[task_id]
    if task["status"] == "running":
        task["scheduler"].stop()
        task["status"] = "stopped"

    return {"task_id": task_id, "status": task["status"]}
