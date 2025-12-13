import logging
import os
import subprocess
import sys
from sqlalchemy import select, text
from alembic import command
from alembic.config import Config

from server.storage.database import AsyncSessionFactory
from server.storage.models.data_table_config import TableCategory

logger = logging.getLogger(__name__)

DEFAULT_CATEGORIES = [
    {"code": "market_data", "name": "行情数据", "description": "股票、期货等标的的价格行情数据 (OHLCV)"},
    {"code": "financial_report", "name": "财务报表", "description": "上市公司财务报表、业绩快报等"},
    {"code": "feature", "name": "因子特征", "description": "用于模型训练的计算因子"},
    {"code": "trade_record", "name": "交易记录", "description": "实盘或回测的成交明细"},
    {"code": "system", "name": "系统配置", "description": "系统内部使用的配置表"},
]

def run_db_migrations():
    """
    使用 Alembic 自动执行数据库迁移，确保表结构最新。
    注意：在 Windows 环境下，迁移操作已移交至 manage.py 启动脚本中执行，
    此处仅作为日志占位，或保留给非 Windows 环境的兼容性。
    """
    logger.info("Database migrations should have been handled by the startup script (manage.py).")
    # 之前这里尝试使用 command.upgrade 或 subprocess 调用 alembic，但在 SSH 隧道场景下
    # 极易导致进程锁死或崩溃。因此现在架构上改为由外部串行执行。
    pass

async def check_and_bootstrap():
    """
    系统启动时的自检与引导程序。
    1. 检查数据库连接。
    2. 自动运行数据库迁移 (创建/更新表结构)。
    3. 初始化必要的种子数据 (Seed Data)。
    """
    logger.info("Starting system bootstrap check...")
    
    # 1. 检查数据库连接
    # 虽然 Alembic 也会连接，但这里先快速检查一下连通性比较稳妥
    async with AsyncSessionFactory() as session:
        try:
            await session.execute(text("SELECT 1"))
            logger.info("Database connection check passed.")
        except Exception as e:
            logger.critical(f"Database connection failed: {e}")
            raise RuntimeError("Database connection failed. Cannot start application.")

    # 2. 运行数据库迁移 (同步操作)
    # Alembic 命令通常是阻塞的，放在这里运行是安全的，因为我们需要等待 DB 就绪
    run_db_migrations()

    # 3. 初始化种子数据
    async with AsyncSessionFactory() as session:
        try:
            logger.info("Checking table categories...")
            # 此时表肯定已经存在了，因为刚才运行了迁移
            stmt = select(TableCategory)
            result = await session.execute(stmt)
            existing = result.scalars().first()
            
            if not existing:
                logger.info("No table categories found. Initializing default categories...")
                for cat_data in DEFAULT_CATEGORIES:
                    category = TableCategory(
                        code=cat_data["code"],
                        name=cat_data["name"],
                        description=cat_data["description"]
                    )
                    session.add(category)
                await session.commit()
                logger.info(f"Initialized {len(DEFAULT_CATEGORIES)} default categories.")
            else:
                logger.info("Table categories already exist. Skipping initialization.")
                
        except Exception as e:
            logger.error(f"Failed to initialize seed data: {e}")
            raise e

    logger.info("System bootstrap completed successfully.")