import asyncio
import argparse
import logging
from pathlib import Path
import os

# 配置日志
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(levelname)s - %(message)s')

from etl.data_loader.csv_loader import CsvLoader
from etl.processing.pipeline import Pipeline
# 具体的 Handler 实现需要被重新创建
# from etl.processing.handlers import ... 
# from etl.storage.database import DatabaseManager
from config import DATABASE_URL
from etl.scheduler import Scheduler

def create_pipeline() -> Pipeline:
    """
    工厂函数，用于创建和配置一个新的Pipeline实例。
    每个子进程都会调用这个函数来获取自己的Pipeline。
    """
    # 注意：这里我们不能复用一个db_manager实例，
    # 因为它不能在进程间安全地共享。
    # 正确的做法是在Handler内部或这个工厂函数内部
    # 为每个进程创建新的数据库连接。
    #
    # 为简单起见，暂时假设Handler能够自己处理数据库连接，
    # 或者我们可以在这里创建一个同步的db_manager并传入。
    # 
    # handlers = [
    #     ReadFileHandler(),
    #     ParseCsvContentHandler(),
    #     TransformDataHandler(),
    #     SaveToDatabaseHandler(db_uri=DATABASE_URL, table_name="some_table"), # Handler需要调整
    # ]
    # return Pipeline(handlers)
    
    # 由于 handlers.py 已被删除，这里返回一个空的pipeline作为占位符
    # 实际使用时需要重新实现 handlers 并在此处构造 pipeline
    logging.warning("注意: 'handlers.py' 不存在, 当前返回一个空的占位 Pipeline。")
    return Pipeline(handlers=[])


async def main():
    """
    ETL 执行主函数
    """
    parser = argparse.ArgumentParser(description="运行ETL任务")
    parser.add_argument("--data-dir", type=str, required=True, help="包含CSV文件的目录路径")
    parser.add_argument("--max-workers", type=int, default=os.cpu_count(), help="最大工作进程数")
    parser.add_argument("--force", action="store_true", help="强制执行ETL，忽略幂等性检查")
    args = parser.parse_args()

    # 1. 初始化数据加载器
    loader = CsvLoader(path=args.data_dir)
    
    # 2. 创建调度器
    #    我们传递 create_pipeline 工厂函数，而不是一个 pipeline 实例
    scheduler = Scheduler(
        loader=loader,
        pipeline_factory=create_pipeline,
        max_workers=args.max_workers,
        force_run=args.force  # 将 --force 参数传递给调度器
    )

    # 3. 运行调度器
    await scheduler.run()

    # TODO: Task 1.7 - 更新元数据表
    # 成功后，更新 etl_metadata 表，记录处理时间和哈希值

    logging.info("ETL任务完成。")

if __name__ == "__main__":
    # 在Windows上，多进程代码需要放在这个保护块内
    asyncio.run(main())
