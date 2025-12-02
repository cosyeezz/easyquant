#!/usr/bin/env python
# -*- coding: utf-8 -*-
"""
CSV日线数据ETL脚本

使用方法:
    python etl/scripts/run_csv_daily_etl.py --data-dir /path/to/csv_files
    python etl/scripts/run_csv_daily_etl.py --data-dir /path/to/csv_files --force
    python etl/scripts/run_csv_daily_etl.py --data-dir /path/to/csv_files --max-workers 4
"""

import asyncio
import argparse
import logging
from pathlib import Path
import sys
import os

# 添加项目根目录到Python路径
sys.path.insert(0, str(Path(__file__).parent.parent.parent))

from etl.data_loader.csv_loader import CsvLoader
from etl.scheduler import Scheduler
from etl.processing.pipeline import Pipeline
from etl.processing.handlers import (
    CsvAdapterHandler,
    CleanDataHandler,
    SaveDailyDataHandler,
)
from logging_config import setup_logging

# 配置日志
setup_logging()
logger = logging.getLogger(__name__)


async def main():
    # 解析命令行参数
    parser = argparse.ArgumentParser(description='CSV日线数据ETL任务')
    parser.add_argument(
        '--data-dir',
        type=str,
        required=True,
        help='CSV文件所在目录'
    )
    parser.add_argument(
        '--max-workers',
        type=int,
        default=4,
        help='最大并行工作进程数（默认: 4）'
    )
    parser.add_argument(
        '--force',
        action='store_true',
        help='强制重新处理所有文件，忽略幂等性检查'
    )

    args = parser.parse_args()

    # 验证数据目录
    data_path = Path(args.data_dir)
    if not data_path.exists():
        logger.error(f"数据目录不存在: {data_path}")
        return

    logger.info(f"开始ETL任务: 数据目录={data_path}, 工作进程数={args.max_workers}, 强制运行={args.force}")

    # 1. 创建CSV加载器
    # 关键配置：
    # - encoding='gbk': CSV文件使用GBK编码
    # - skiprows=1: 跳过第一行（通常是额外的表头）
    # - parse_dates=['交易日期']: 自动解析日期列
    loader = CsvLoader(
        path=str(data_path),
        file_pattern="*.csv",
        encoding='gbk',
        skiprows=1,
        parse_dates=['交易日期'],
        max_queue_size=100
    )

    # 2. 创建调度器并运行ETL流程
    async with Scheduler(
        loader=loader,
        pipeline_factory=lambda: Pipeline.create([
            CsvAdapterHandler(),      # 步骤1: 适配CSV列名（中文 -> 英文）
            CleanDataHandler(),       # 步骤2: 清洗数据和计算衍生指标
            SaveDailyDataHandler(),   # 步骤3: 高性能存入数据库
        ]),
        max_workers=args.max_workers,
        force_run=args.force
    ) as scheduler:
        # 3. 运行调度器
        await scheduler.run()

    logger.info("✅ ETL任务完成。")


if __name__ == "__main__":
    # 在Windows上，多进程代码需要放在这个保护块内
    asyncio.run(main())
