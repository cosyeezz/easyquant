# /usr/bin/env python
# -*- coding: utf-8 -*-
"""
@File    : database.py
@Time    : 2023/11/18 11:07
@Author  : dane
@Description :
数据库连接管理、会话管理以及高性能数据入库的实现。
本模块完全适配于 PostgreSQL 异步操作。
"""

import re
import pandas as pd
from sqlalchemy import text
from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession, async_sessionmaker
from collections.abc import AsyncGenerator
from typing import List
import logging

# 假设配置信息存储在 config.py 中
from config import DATABASE_URL
from etl.storage.models.base import Base

logger = logging.getLogger(__name__)

# 1. 创建异步数据库引擎
# 引擎是 SQLAlchemy 应用程序与数据库交互的入口点，负责管理连接池和方言。
# echo=False: 在生产环境中关闭 SQL 语句的打印，以减少日志噪音。
# pool_pre_ping=True: 在每次从连接池中获取连接时，检查其有效性，避免使用失效连接。
# pool_recycle=3600: 设置连接的回收时间为1小时，防止因长时间未使用而被数据库服务端断开。
async_engine = create_async_engine(
    DATABASE_URL,
    echo=False,
    pool_pre_ping=True,
    pool_recycle=3600,
)

# 2. 创建异步会话工厂 (Session Factory)
# async_sessionmaker 是创建异步数据库会话的标准方式。
# expire_on_commit=False: 防止在事务提交后，访问已提交对象时因其过期而引发 DetachedInstanceError。
# 这对于需要在提交后仍然访问对象属性的场景非常重要。
AsyncSessionFactory = async_sessionmaker(
    bind=async_engine,
    expire_on_commit=False,
    class_=AsyncSession
)


from contextlib import asynccontextmanager

# ... (le reste du code reste inchangé)

@asynccontextmanager
async def get_session() -> AsyncGenerator[AsyncSession, None]:
    """
    一个异步生成器函数，用于提供数据库会话。
    它遵循依赖注入模式，在 `async with` 语句中安全地创建和关闭会话。

    用法:
    async with get_session() as session:
        # 使用 session 进行数据库操作
    """
    async with AsyncSessionFactory() as session:
        try:
            yield session
            await session.commit()
        except Exception:
            await session.rollback()
            raise


async def bulk_insert_df(df: pd.DataFrame, table_name: str, session: AsyncSession):
    """
    使用 SQLAlchemy Core `insert` 语句将 Pandas DataFrame 高效地批量插入到数据库。
    此函数要求调用者必须提供一个有效的数据库会话 `session`。

    :param df: 需要插入的 Pandas DataFrame。
    :param table_name: 目标数据库表的名称。
    :param session: 用于执行操作的数据库会话。
    """
    if df.empty:
        logger.warning(f"尝试向表 '{table_name}' 插入一个空的 DataFrame，操作已跳过。")
        return

    logger.info(f"开始向表 '{table_name}' 批量插入 {len(df)} 条数据...")

    # 将 DataFrame 转换为字典列表，这是 `execute` 方法接受的格式。
    records = df.to_dict(orient='records')

    # 如果是临时表，则使用原始SQL插入
    if table_name.startswith("temp_"):
        try:
            # 使用 text() 构造SQL语句，避免SQL注入
            placeholders = ", ".join([f":{col}" for col in df.columns])
            columns = ", ".join(df.columns)
            sql = text(f"INSERT INTO {table_name} ({columns}) VALUES ({placeholders})")
            await session.execute(sql, records)
            logger.info(f"成功向临时表 '{table_name}' 插入 {len(df)} 条数据。")
        except Exception as e:
            logger.error(f"向临时表 '{table_name}' 批量插入数据时发生严重错误: {e}", exc_info=True)
            raise
    else:
        # 从 SQLAlchemy 的元数据中动态获取表对象。
        target_table = Base.metadata.tables.get(table_name)
        if target_table is None:
            raise ValueError(f"表 '{table_name}' 在 SQLAlchemy 元数据中未找到。请确保模型已正确导入。")

        try:
            # 执行批量插入操作
            await session.execute(target_table.insert(), records)
            logger.info(f"成功向表 '{table_name}' 插入 {len(df)} 条数据。")
        except Exception as e:
            logger.error(f"向表 '{table_name}' 批量插入数据时发生严重错误: {e}", exc_info=True)
            # 异常会向上抛出，由 get_session 的上下文管理器处理事务回滚。
            raise


async def bulk_upsert_df(
    df: pd.DataFrame,
    table_name: str,
    unique_keys: List[str],
    session: AsyncSession
):
    """
    使用 PostgreSQL 的 `INSERT ... ON CONFLICT ... DO UPDATE` 语句，
    通过临时表实现高性能的 "upsert" (update or insert) 操作。
    这种方法比逐条检查和更新效率高得多。

    核心流程:
    1. 在数据库中创建一个与目标表结构完全相同的临时表。
    2. 使用 `bulk_insert_df` 将 DataFrame 的数据高效地插入到这个临时表中。
    3. 执行一条 `INSERT INTO ... SELECT ... ON CONFLICT` 语句，
       将临时表中的数据合并到目标表中。
       - 如果记录的唯一键（由 `unique_keys` 指定）已存在，则更新指定列。
       - 如果记录不存在，则插入新行。
    4. 操作完成后，临时表会自动被数据库清理。

    :param df: 待 "upsert" 的 Pandas DataFrame。
    :param table_name: 目标数据库表的名称 (例如: 'public.stock_daily')。
    :param unique_keys: 用于判断冲突的唯一键列名列表 (例如: ['code', 'trade_date'])。
    :param session: 必须提供一个数据库会话来保证整个操作的事务原子性。
    """
    if df.empty:
        logger.warning(f"尝试向表 '{table_name}' 更新插入一个空的 DataFrame，操作已跳过。")
        return

    if not unique_keys:
        raise ValueError("`unique_keys` 不能为空，必须指定至少一个唯一键用于冲突检测。")

    # 验证 unique_keys 中的所有列都存在于 DataFrame 中
    df_columns_set = set(df.columns)
    missing_keys = [key for key in unique_keys if key not in df_columns_set]
    if missing_keys:
        raise ValueError(f"以下唯一键在 DataFrame 中不存在: {missing_keys}。DataFrame 列: {list(df.columns)}")

    # 为避免SQL注入，对表名和列名进行基本的安全验证。
    if not re.match(r'^[a-zA-Z_][a-zA-Z0-9_.]*$', table_name):
        raise ValueError(f"非法的表名: {table_name}")
    for col in df.columns:
        if not isinstance(col, str) or not re.match(r'^[a-zA-Z_][a-zA-Z0-9_]*$', col):
            raise ValueError(f"DataFrame 中包含非法的列名: {col}")

    # 生成一个唯一的临时表名
    temp_table_name = f"temp_{table_name.replace('.', '_')}_{pd.Timestamp.now().strftime('%Y%m%d%H%M%S%f')}"
    logger.info(f"开始向表 '{table_name}' 批量更新插入 {len(df)} 条数据，使用临时表 '{temp_table_name}'...")

    try:
        # 1. (PostgreSQL-specific) 使用 `LIKE` 语句创建一个与目标表结构完全一致的临时表。
        # `INCLUDING DEFAULTS` 确保默认值也被复制。
        create_temp_sql = text(f"CREATE TEMP TABLE {temp_table_name} (LIKE {table_name} INCLUDING DEFAULTS)")
        await session.execute(create_temp_sql)

        # 2. 将 DataFrame 数据高效插入临时表。
        await bulk_insert_df(df, temp_table_name, session)

        # 3. 准备 `INSERT ... ON CONFLICT` 语句。
        # 获取所有列名，并确定需要更新的列（即非唯一键的列）。
        all_cols_str = ", ".join(f'"{c}"' for c in df.columns)
        unique_keys_str = ", ".join(f'"{k}"' for k in unique_keys)
        update_cols = [col for col in df.columns if col not in unique_keys]

        if not update_cols:
            # 如果所有列都是唯一键，那么冲突时什么都不做。
            logger.warning("所有列都是唯一键，冲突时将不会执行更新操作 (DO NOTHING)。")
            merge_sql = text(f"""
                INSERT INTO {table_name} ({all_cols_str})
                SELECT {all_cols_str} FROM {temp_table_name}
                ON CONFLICT ({unique_keys_str}) DO NOTHING
            """)
        else:
            # 构建 `DO UPDATE SET` 子句。
            # `excluded` 关键字代表试图插入但发生冲突的行。
            update_clause = ", ".join(f'"{col}" = excluded."{col}"' for col in update_cols)
            merge_sql = text(f"""
                INSERT INTO {table_name} ({all_cols_str})
                SELECT {all_cols_str} FROM {temp_table_name}
                ON CONFLICT ({unique_keys_str}) DO UPDATE SET {update_clause}
            """)

        # 执行合并操作
        await session.execute(merge_sql)

        logger.info(f"成功向表 '{table_name}' 批量更新插入 {len(df)} 条数据。")

    except Exception as e:
        logger.error(f"向表 '{table_name}' 批量更新插入数据时发生严重错误: {e}", exc_info=True)
        # 异常向上抛出，由 get_session 的上下文管理器处理事务回滚。
        raise
    finally:
        # 明确地删除临时表，尽管它在会话结束时会自动删除，但这是一个好习惯。
        await session.execute(text(f"DROP TABLE IF EXISTS {temp_table_name}"))