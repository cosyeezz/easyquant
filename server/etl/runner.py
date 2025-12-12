import logging
import time
import traceback
import pandas as pd
from typing import Dict, Any
from sqlalchemy import select

from server.storage.database import AsyncSessionFactory
from server.storage.models.etl_task_config import ETLTaskConfig
from server.common.event_service import record_event
from server.etl.data_loader.csv_loader import CSVLoader
from server.etl.process.pipeline import Pipeline
from server.etl.process.registry import HandlerRegistry

# 确保所有 Handlers 被注册
# 在 Python 中，通常需要在某处 import handler 模块才能触发注册装饰器或子类扫描
# 这里我们显式 import 以确保它们被加载
from server.etl.process.handlers import column_mapping, database_save

logger = logging.getLogger(__name__)

class ETLRunner:
    """
    ETL 任务执行引擎。
    负责加载配置、实例化组件、执行流程并记录全生命周期事件。
    """
    def __init__(self, task_id: int):
        self.task_id = task_id
        self.process_name = f"ETL_Task_{task_id}"

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
                # 目前仅支持 csv_dir / csv_file，未来可扩展
                if task_config.source_type not in ['csv_file', 'csv_dir']:
                     # 简单的兼容性处理，如果 source_type 不标准，尝试根据 config 判断
                     pass
                
                # 假设 source_config 包含 path 等 Loader 需要的参数
                # CSVLoader 只需要 path, encoding 等，这里直接传参
                # 注意：CSVLoader.load() 是同步还是异步？根据之前的代码是同步还是异步？
                # 让我们检查一下 CSVLoader
                loader = CSVLoader(**task_config.source_config)
                
                # 4. 初始化 Pipeline
                pipeline = Pipeline()
                for step_config in task_config.pipeline_config:
                    handler_name = step_config.get("name") # e.g. "ColumnMappingHandler"
                    handler_params = step_config.get("params", {})
                    
                    # 使用 Registry 实例化
                    handler_class = HandlerRegistry.get_handler(handler_name)
                    if not handler_class:
                        raise ValueError(f"Unknown handler: {handler_name}")
                    
                    handler_instance = handler_class(**handler_params)
                    pipeline.add_step(handler_instance)

                # 5. 执行数据加载与处理 (Stream Pipeline)
                await record_event(session, self.process_name, "loader.started", {"source": task_config.source_config})
                await record_event(session, self.process_name, "pipeline.started", {"steps": len(task_config.pipeline_config)})

                total_rows_loaded = 0
                total_rows_saved = 0
                
                # Context 注入 Session 和 统计信息
                context = {
                    "session": session, 
                    "stats": {"saved_rows": 0}
                }

                # 使用 loader.stream() 逐块处理数据
                async for source, df in loader.stream():
                    if df is None or df.empty:
                        continue
                        
                    batch_size = len(df)
                    total_rows_loaded += batch_size
                    
                    # 记录批次加载事件 (可选: 仅每隔一定数量记录，避免日志爆炸)
                    # await record_event(session, self.process_name, "loader.batch", {"source": source, "rows": batch_size})

                    # 运行 Pipeline (Handler 会更新 context["stats"]["saved_rows"])
                    await pipeline.run(df, context)
                    
                    # 更新总保存行数
                    # 注意：pipeline.run 返回的是处理后的 df，但 DatabaseSaveHandler 是副作用操作
                    # 具体的保存行数已经在 DatabaseSaveHandler 中更新到了 context["stats"]
                    # 这里我们不需要手动加，直接取 context 的最新值即可
                    # 但为了逻辑清晰，我们可以从 context 获取增量，或者直接信任 context 的累计值
                    # 让我们统一使用 context['stats']['saved_rows'] 作为当前批次的累计值
                    
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
                
                # Re-raise to let caller know
                raise e
