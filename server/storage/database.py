# /usr/bin/env python
# -*- coding: utf-8 -*-
"""
@Time    : 2023/11/18 11:07
@Author  : dane
@File    : database.py
@Description :
数据库连接管理、会话管理以及高性能数据入库的实现。
"""
import os
import re
import pandas as pd
from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession, async_sessionmaker
from sqlalchemy import text
import logging
from collections.abc import AsyncGenerator
from typing import List
from dotenv import load_dotenv

# --- 统一配置加载 ---
# 从 .env 文件加载环境变量
load_dotenv()

DATABASE_URL = os.getenv("DATABASE_URL")
if not DATABASE_URL:
    raise ValueError("未在环境变量中找到 DATABASE_URL，请在 .env 文件中设置。")

# 确保 URL schema 是 asyncpg 兼容的
if DATABASE_URL.startswith("postgres://"):
    DATABASE_URL = DATABASE_URL.replace("postgres://", "postgresql+asyncpg://", 1)
elif DATABASE_URL.startswith("postgresql://"):
    DATABASE_URL = DATABASE_URL.replace("postgresql://", "postgresql+asyncpg://", 1)

logger = logging.getLogger(__name__)


# --- 异步引擎和会话工厂 (采纳您的优秀实现) ---

# 1. 创建异步数据库引擎
async_engine = create_async_engine(
    DATABASE_URL,
    echo=False,
    pool_pre_ping=True,  # 检查连接有效性
    pool_recycle=3600,   # 每小时回收一次连接
)

# 2. 创建异步会话工厂
AsyncSessionFactory = async_sessionmaker(
    bind=async_engine,
    expire_on_commit=False,
)


# --- FastAPI 依赖和会话管理 ---

async def get_session() -> AsyncGenerator[AsyncSession, None]:
    """
    FastAPI 依赖，用于在每个请求中获取一个数据库会话。
    确保会话在使用后被正确关闭。
    """
    async with AsyncSessionFactory() as session:
        yield session


# --- 高性能批量操作 ---

async def bulk_insert_df(df: pd.DataFrame, table_name: str, session: AsyncSession = None):
    """
    使用 COPY 命令将 DataFrame 高效地批量插入到 PostgreSQL 数据库。
    """
    if df.empty:
        logger.warning(f"尝试向表 '{table_name}' 插入一个空的 DataFrame，操作已跳过。")
        return

    logger.info(f"开始向表 '{table_name}' 批量插入 {len(df)} 条数据...")
    records = list(df.itertuples(index=False, name=None))
    columns = list(df.columns)

    async def _insert(conn):
        # 获取底层的 asyncpg 连接
        raw_conn = await conn.get_raw_connection()
        await raw_conn.copy_records_to_table(
            table_name,
            records=records,
            columns=columns,
            timeout=60
        )

    try:
        if session is not None:
            # 推荐：使用传入的 session
            await _insert(session)
            logger.info(f"成功向表 '{table_name}' 插入 {len(df)} 条数据（使用会话连接）。")
        else:
            # 回退：使用全局引擎
            logger.warning(f"未提供 session，使用全局引擎连接池（可能导致连接争抢）")
            async with async_engine.connect() as conn:
                async with conn.begin():
                    await _insert(conn)
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
    """
    if df.empty:
        logger.warning(f"尝试向表 '{table_name}' 更新一个空的 DataFrame，操作已跳过。")
        return

    if not unique_keys:
        raise ValueError("unique_keys 不能为空，必须指定至少一个唯一键用于冲突检测")

    df_columns_set = set(df.columns)
    for key in unique_keys:
        if key not in df_columns_set:
            raise ValueError(f"unique_key '{key}' 不存在于 DataFrame 列中: {list(df.columns)}")

    temp_table_name = f"temp_{table_name}_{pd.Timestamp.now().strftime('%Y%m%d%H%M%S%f')}"
    logger.info(f"开始向表 '{table_name}' 批量更新 {len(df)} 条数据，使用临时表 '{temp_table_name}'...")

    # 安全校验
    if not re.match(r'^[a-zA-Z_][a-zA-Z0-9_]*$', table_name):
        raise ValueError(f"非法的表名: {table_name}")
    for col in df.columns:
        if not isinstance(col, str) or not re.match(r'^[a-zA-Z_][a-zA-Z0-9_]*$', col):
            raise ValueError(f"非法的列名: {col}")

    try:
        create_temp_sql = text(f"""
            CREATE TEMP TABLE {temp_table_name}
            (LIKE {table_name} INCLUDING DEFAULTS)
            ON COMMIT DROP
        """)
        await session.execute(create_temp_sql)

        await bulk_insert_df(df, temp_table_name, session)

        update_cols = [col for col in df.columns if col not in unique_keys]
        if not update_cols:
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
        logger.info(f"成功向表 '{table_name}' 批量更新 {len(df)} 条数据。")

    except Exception as e:
        logger.error(f"向表 '{table_name}' 批量更新数据失败: {e}", exc_info=True)
        raise
