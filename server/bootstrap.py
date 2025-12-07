import logging
from sqlalchemy import select, text
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

async def check_and_bootstrap():
    """
    系统启动时的自检与引导程序。
    1. 检查数据库连接。
    2. 初始化必要的种子数据 (Seed Data)。
    """
    logger.info("Starting system bootstrap check...")
    
    async with AsyncSessionFactory() as session:
        # 1. 检查数据库连接 (Select 1)
        try:
            await session.execute(text("SELECT 1"))
            logger.info("Database connection check passed.")
        except Exception as e:
            logger.critical(f"Database connection failed: {e}")
            raise RuntimeError("Database connection failed. Cannot start application.")

        # 2. 初始化分类数据
        try:
            logger.info("Checking table categories...")
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
            # 种子数据失败通常不应阻止系统启动，但应记录严重错误
            # 取决于业务严格程度，这里选择记录并继续，或抛出异常
            raise e

    logger.info("System bootstrap completed successfully.")
