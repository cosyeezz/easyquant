# /usr/bin/env python
# -*- coding: utf-8 -*-
"""
@Time    : 2023/11/18 11:07
@Author  : dane
@File    : database.py
@Description :
数据库连接管理、会话管理以及高性能数据入库的实现。
"""
import pandas as pd
from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession, async_sessionmaker
import logging
from collections.abc import AsyncGenerator

# 假设配置信息存储在 config.py 中
from config import DATABASE_URL

logger = logging.getLogger(__name__)

# 1. 创建异步数据库引擎
# 引擎是应用程序与数据库的连接池和方言的接口。
# echo=True 会打印所有执行的SQL语句，便于调试，生产环境建议关闭。
async_engine = create_async_engine(
    DATABASE_URL,
    echo=False,
    pool_pre_ping=True,  # 检查连接有效性
    pool_recycle=3600,   # 每小时回收一次连接
)

# 2. 创建异步会话工厂
# 使用 async_sessionmaker 是 SQLAlchemy 2.0+ 中创建异步会话的标准方式。
# expire_on_commit=False 防止在提交后访问对象时出现DetachedInstanceError。
AsyncSessionFactory = async_sessionmaker(
    bind=async_engine,
    expire_on_commit=False,
)


async def get_session() -> AsyncGenerator[AsyncSession, None]:
    """
    获取一个数据库会话的依赖函数。
    """
    async with AsyncSessionFactory() as session:
        yield session


async def bulk_insert_df(df: pd.DataFrame, table_name: str):
    """
    使用 COPY 命令将 DataFrame 高效地批量插入到 PostgreSQL 数据库。

    这是 PostgreSQL 最高效的数据导入方式，比逐条 INSERT 快几个数量级。
    此实现使用了 asyncpg 的 `copy_records_to_table` 方法，它需要元组列表作为输入。

    :param df: 待插入的 pandas DataFrame。
    :param table_name: 目标数据库表的名称。
    """
    if df.empty:
        logger.warning(f"尝试向表 '{table_name}' 插入一个空的 DataFrame，操作已跳过。")
        return

    logger.info(f"开始向表 '{table_name}' 批量插入 {len(df)} 条数据...")
    
    # 将 DataFrame 转换为元组列表，这是 copy_records_to_table 需要的格式
    records = [tuple(x) for x in df.to_numpy()]
    columns = list(df.columns)

    async with async_engine.connect() as conn:
        # 使用 conn.begin() 启动一个显式事务，确保操作的原子性
        async with conn.begin():
            try:
                # 获取底层的 asyncpg 连接
                raw_conn = await conn.get_raw_connection()
                
                # 使用 asyncpg 的 copy_records_to_table 方法
                await raw_conn.copy_records_to_table(
                    table_name,
                    records=records,
                    columns=columns,
                    timeout=60  # 设置一个合理的超时时间
                )
                logger.info(f"成功向表 '{table_name}' 插入 {len(df)} 条数据。")
            except Exception as e:
                # conn.begin() 会在异常时自动回滚事务
                logger.error(f"向表 '{table_name}' 批量插入数据失败: {e}", exc_info=True)
                raise

