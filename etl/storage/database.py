# /usr/bin/env python
# -*- coding: utf-8 -*-
"""
@Time    : 2023/11/18 11:07
@Author  : dane
@File    : database.py
@Description :
数据库连接管理、会话管理以及高性能数据入库的实现。
"""
import re
import pandas as pd
from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession, async_sessionmaker
from sqlalchemy import text
import logging
from collections.abc import AsyncGenerator
from typing import List

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


async def bulk_insert_df(df: pd.DataFrame, table_name: str, session: AsyncSession = None):
    """
    使用 COPY 命令将 DataFrame 高效地批量插入到 PostgreSQL 数据库。

    这是 PostgreSQL 最高效的数据导入方式，比逐条 INSERT 快几个数量级。
    此实现使用了 asyncpg 的 `copy_records_to_table` 方法，它需要元组列表作为输入。

    :param df: 待插入的 pandas DataFrame。
    :param table_name: 目标数据库表的名称。
    :param session: (可选) 如果提供，将使用该会话的连接；否则使用全局引擎。
                    推荐：在 Worker 中传入 session，避免连接池争抢。
    """
    if df.empty:
        logger.warning(f"尝试向表 '{table_name}' 插入一个空的 DataFrame，操作已跳过。")
        return

    logger.info(f"开始向表 '{table_name}' 批量插入 {len(df)} 条数据...")

    # 将 DataFrame 转换为元组列表，这是 copy_records_to_table 需要的格式
    # 使用 itertuples(index=False, name=None) 比 to_numpy() 更节省内存
    records = list(df.itertuples(index=False, name=None))
    columns = list(df.columns)

    try:
        if session is not None:
            # 方案 1：使用传入的 session（推荐，避免连接池争抢）
            # 获取底层连接
            connection = await session.connection()
            raw_conn = await connection.get_raw_connection()

            # asyncpg 连接对象
            # 注意：在 SQLAlchemy 2.0+ 中，raw_conn 直接是 asyncpg 连接
            if hasattr(raw_conn, 'driver_connection'):
                asyncpg_conn = raw_conn.driver_connection
            else:
                asyncpg_conn = raw_conn

            # 使用 asyncpg 的 copy_records_to_table 方法
            await asyncpg_conn.copy_records_to_table(
                table_name,
                records=records,
                columns=columns,
                timeout=60  # 设置一个合理的超时时间
            )
            logger.info(f"成功向表 '{table_name}' 插入 {len(df)} 条数据（使用会话连接）。")
        else:
            # 方案 2：使用全局引擎（回退方案，仅用于兼容旧代码）
            logger.warning(f"未提供 session，使用全局引擎连接池（可能导致连接争抢）")
            async with async_engine.connect() as conn:
                # 使用 conn.begin() 启动一个显式事务，确保操作的原子性
                async with conn.begin():
                    # 获取底层的 asyncpg 连接
                    raw_conn = await conn.get_raw_connection()

                    # 使用 asyncpg 的 copy_records_to_table 方法
                    await raw_conn.copy_records_to_table(
                        table_name,
                        records=records,
                        columns=columns,
                        timeout=60  # 设置一个合理的超时时间
                    )
                    logger.info(f"成功向表 '{table_name}' 插入 {len(df)} 条数据（使用全局引擎）。")
    except Exception as e:
        logger.error(f"向表 '{table_name}' 批量插入数据失败: {e}", exc_info=True)
        raise


async def bulk_upsert_df(
    df: pd.DataFrame,
    table_name: str,
    unique_keys: List[str],
    session: AsyncSession
):
    """
    使用临时表和 COPY 命令高性能地 "upsert" DataFrame 数据到 PostgreSQL。

    这是实现大批量数据 "upsert" 的最高效方法之一。
    1. 创建一个与目标表结构相同的临时表。
    2. 使用 `bulk_insert_df` (COPY 命令) 将 DataFrame 数据高效导入临时表。
    3. 执行 `INSERT INTO ... ON CONFLICT ... DO UPDATE`，将临时表数据合并到目标表。
    4. 删除临时表。

    :param df: 待 "upsert" 的 pandas DataFrame。
    :param table_name: 目标数据库表的名称。
    :param unique_keys: 用于判断冲突的唯一键（列名列表）。
    :param session: 必须提供一个数据库会话来保证事务的原子性。
    """
    if df.empty:
        logger.warning(f"尝试向表 '{table_name}' 更新一个空的 DataFrame，操作已跳过。")
        return

    if not unique_keys:
        raise ValueError("unique_keys 不能为空，必须指定至少一个唯一键用于冲突检测")

    # 验证 unique_keys 中的所有列都存在于 DataFrame 中
    df_columns_set = set(df.columns)
    for key in unique_keys:
        if key not in df_columns_set:
            raise ValueError(f"unique_key '{key}' 不存在于 DataFrame 列中: {list(df.columns)}")

    # 生成临时表名（使用时间戳确保唯一性）
    temp_table_name = f"temp_{table_name}_{pd.Timestamp.now().strftime('%Y%m%d%H%M%S%f')}"
    logger.info(f"开始向表 '{table_name}' 批量更新 {len(df)} 条数据，使用临时表 '{temp_table_name}'...")

    # 验证表名和列名（防止 SQL 注入）
    if not re.match(r'^[a-zA-Z_][a-zA-Z0-9_]*$', table_name):
        raise ValueError(f"非法的表名: {table_name}")
    if not re.match(r'^[a-zA-Z_][a-zA-Z0-9_]*$', temp_table_name):
        raise ValueError(f"非法的临时表名: {temp_table_name}")
    for col in df.columns:
        # 确保列名是字符串类型
        if not isinstance(col, str):
            raise ValueError(f"列名必须是字符串类型: {col} (类型: {type(col).__name__})")
        if not re.match(r'^[a-zA-Z_][a-zA-Z0-9_]*$', col):
            raise ValueError(f"非法的列名: {col}")
    for key in unique_keys:
        if not re.match(r'^[a-zA-Z_][a-zA-Z0-9_]*$', key):
            raise ValueError(f"非法的唯一键名: {key}")

    try:
        # 1. 在事务中创建临时表（使用 text() 包装 SQL）
        create_temp_sql = text(f"""
            CREATE TEMP TABLE {temp_table_name}
            (LIKE {table_name} INCLUDING DEFAULTS)
            ON COMMIT DROP
        """)
        await session.execute(create_temp_sql)

        # 2. 使用 COPY 命令高效插入数据到临时表
        await bulk_insert_df(df, temp_table_name, session)

        # 3. 从临时表合并到目标表
        update_cols = [col for col in df.columns if col not in unique_keys]

        if not update_cols:
            logger.warning(f"所有列都是唯一键，无需更新，仅插入新记录")
            # 如果没有需要更新的列，只执行 ON CONFLICT DO NOTHING
            merge_sql = text(f"""
                INSERT INTO {table_name} ({', '.join(df.columns)})
                SELECT * FROM {temp_table_name}
                ON CONFLICT ({', '.join(unique_keys)}) DO NOTHING
            """)
        else:
            update_clause = ", ".join([f"{col} = EXCLUDED.{col}" for col in update_cols])
            merge_sql = text(f"""
                INSERT INTO {table_name} ({', '.join(df.columns)})
                SELECT * FROM {temp_table_name}
                ON CONFLICT ({', '.join(unique_keys)}) DO UPDATE
                SET {update_clause}
            """)

        await session.execute(merge_sql)

        # 注意：不在这里 commit，由调用者控制事务边界
        # 这样可以让 upsert 操作和其他操作在同一个事务中

        logger.info(f"成功向表 '{table_name}' 批量更新 {len(df)} 条数据。")

    except Exception as e:
        logger.error(f"向表 '{table_name}' 批量更新数据失败: {e}", exc_info=True)
        # 不在这里 rollback，由调用者控制
        raise

