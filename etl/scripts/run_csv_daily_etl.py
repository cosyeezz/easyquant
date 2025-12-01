import asyncio
import argparse
import logging
from pathlib import Path
import os

from etl.processing.pipeline import Pipeline
from etl.processing.handlers import (
    CsvAdapterHandler,
    CleanDataHandler,
    SaveDailyDataHandler,
)

# ... (imports)

# ... (argparse)

    # 2. 创建调度器
    async with Scheduler(
        loader=loader,
        pipeline_factory=lambda: Pipeline.create([
            CsvAdapterHandler(),      # 步骤1: 适配CSV数据源格式
            CleanDataHandler(),       # 步骤2: 执行通用数据清洗
            SaveDailyDataHandler(),   # 步骤3: 高性能存入数据库
        ]),
        max_workers=args.max_workers,
        force_run=args.force
    ) as scheduler:
        # 3. 运行调度器
        await scheduler.run()

    logging.info("ETL任务完成。")

if __name__ == "__main__":
    # 在Windows上，多进程代码需要放在这个保护块内
    asyncio.run(main())

