import logging
import time
import traceback
from typing import Dict, Any, List
from sqlalchemy import select

from server.storage.database import AsyncSessionFactory
from server.storage.models.etl_task_config import ETLTaskConfig
from server.common.event_service import record_event
from server.etl.data_loader.csv_loader import CSVLoader
from server.etl.process.pipeline import Pipeline
from server.etl.process.registry import registry

logger = logging.getLogger(__name__)

class ETLRunner:
    """
    ETL 任务执行引擎。
    负责加载配置、实例化组件、执行流程并记录全生命周期事件。
    """
    def __init__(self, task_id: int):
        self.task_id = task_id
        self.process_name = f"ETL_Task_{task_id}"
        # 自动发现并注册所有 Handlers
        registry.auto_discover("server.etl.process.handlers")

    async def run(self):
        """
        执行 ETL 任务的主入口
        """
        start_time = time.time()
        
        # 使用独立的 Session，确保资源隔离
        async with AsyncSessionFactory() as session:
            try:
                # 1. 记录任务启动
                await record_event(
                    session, 
                    self.process_name, 
                    "task.started", 
                    {"task_id": self.task_id, "status": "running"}
                )

                # 2. 读取任务配置
                stmt = select(ETLTaskConfig).where(ETLTaskConfig.id == self.task_id)
                result = await session.execute(stmt)
                task_config = result.scalar_one_or_none()

                if not task_config:
                    raise ValueError(f"Task ID {self.task_id} not found in database.")

                logger.info(f"开始执行任务: {task_config.name} (ID: {task_config.id})")

                # 3. 初始化 Loader
                # 目前仅支持 csv_dir / csv_file
                source_config = task_config.source_config or {}
                loader = self._create_loader(task_config.source_type, source_config)
                
                # 4. 初始化 Pipeline
                pipeline = Pipeline()
                pipeline_config = task_config.pipeline_config or []
                
                for step_config in pipeline_config:
                    handler_name = step_config.get("name")
                    handler_params = step_config.get("params", {})
                    
                    if not handler_name:
                        continue

                    # 使用 Registry 实例化
                    try:
                        handler_class = registry.get_handler(handler_name)
                        handler_instance = handler_class(**handler_params)
                        pipeline.add_step(handler_instance)
                    except ValueError as e:
                        logger.error(f"Failed to initialize handler {handler_name}: {e}")
                        raise

                # 5. 执行数据加载与处理 (Stream Pipeline)
                await record_event(session, self.process_name, "loader.started", {"source": source_config})
                await record_event(session, self.process_name, "pipeline.started", {"steps": len(pipeline_config)})

                total_rows_loaded = 0
                
                # Context 注入 Session 和 统计信息
                context = {
                    "session": session, 
                    "stats": {"saved_rows": 0},
                    "task_id": self.task_id
                }

                # 使用 loader.stream() 逐块处理数据
                async for source, df in loader.stream():
                    if df is None or df.empty:
                        continue
                        
                    batch_size = len(df)
                    total_rows_loaded += batch_size
                    
                    # 运行 Pipeline
                    # 注意: Pipeline 可能会修改 df 或者由 Handler (如 DatabaseSave) 执行副作用
                    await pipeline.run(df, context)
                    
                # 循环结束，读取最终统计
                total_rows_saved = context["stats"].get("saved_rows", 0)

                # 6. 任务完成
                duration = time.time() - start_time
                
                logger.info(f"任务完成。耗时: {duration:.2f}s, 加载: {total_rows_loaded} 行, 入库: {total_rows_saved} 行")
                
                await record_event(
                    session, 
                    self.process_name, 
                    "task.completed", 
                    {
                        "rows_loaded": total_rows_loaded, 
                        "rows_saved": total_rows_saved, 
                        "duration_seconds": round(duration, 2)
                    }
                )

            except Exception as e:
                duration = time.time() - start_time
                error_msg = str(e)
                stack_trace = traceback.format_exc()
                
                logger.error(f"任务执行失败: {error_msg}\n{stack_trace}")
                
                # 尝试记录错误
                try:
                    await record_event(
                        session, 
                        self.process_name, 
                        "task.error", 
                        {"error": error_msg, "stack_trace": stack_trace}
                    )
                except Exception as inner_e:
                    logger.error(f"无法记录错误事件: {inner_e}")
                
                raise e

    def _create_loader(self, source_type: str, config: Dict[str, Any]) -> CSVLoader:
        """
        工厂方法：创建 Loader 实例，过滤不支持的参数。
        """
        # 目前主要支持 CSVLoader
        if source_type in ['csv_file', 'csv_dir']:
            # CSVLoader 只接受 path, file_pattern, max_queue_size
            # 我们从 config 中提取这些参数，忽略其他参数（如 encoding，暂不支持）
            valid_args = {}
            if "path" in config:
                valid_args["path"] = config["path"]
            else:
                raise ValueError("Source config must contain 'path' for CSVLoader.")
            
            if "file_pattern" in config:
                valid_args["file_pattern"] = config["file_pattern"]
            
            if "max_queue_size" in config:
                valid_args["max_queue_size"] = config["max_queue_size"]

            return CSVLoader(**valid_args)
        
        else:
            # 简单的回退或抛出异常
            logger.warning(f"Unknown source_type '{source_type}', defaulting to CSVLoader logic.")
            if "path" in config:
                return CSVLoader(path=config["path"])
            raise ValueError(f"Unsupported source_type: {source_type}")