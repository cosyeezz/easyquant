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
import socket
import logging
import pandas as pd
import httpx
from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession, async_sessionmaker
from sqlalchemy import text
from collections.abc import AsyncGenerator
from typing import List
from dotenv import load_dotenv

# --- 统一配置加载 ---
# 从 .env 文件加载环境变量
load_dotenv()

logger = logging.getLogger(__name__)

DATABASE_URL = os.getenv("DATABASE_URL")
if not DATABASE_URL:
    raise ValueError("未在环境变量中找到 DATABASE_URL，请在 .env 文件中设置。")

# --- 智能 SSH 隧道配置 ---
# 只有在配置了 SSH 用户名的情况下才尝试启用智能逻辑
SSH_USER = os.getenv("SSH_USER")
ssh_tunnel = None

if SSH_USER:
    try:
        from sshtunnel import SSHTunnelForwarder
        from sqlalchemy.engine.url import make_url

        url_obj = make_url(DATABASE_URL)
        db_host = url_obj.host
        db_port = url_obj.port or 5432
        
        # 1. 获取目标数据库域名的解析 IP
        try:
            target_ip = socket.gethostbyname(db_host)
        except Exception:
            target_ip = None
            
        # 2. 获取当前机器的公网 IP
        current_ip = None
        try:
            # 设置短超时，避免阻塞启动
            with httpx.Client(timeout=3.0) as client:
                resp = client.get("https://api.ipify.org")
                if resp.status_code == 200:
                    current_ip = resp.text.strip()
        except Exception as e:
            logger.warning(f"无法获取本机公网 IP，将默认启用 SSH 隧道: {e}")

        logger.info(f"IP 检测: 目标({db_host})={target_ip}, 本机={current_ip}")

        # 3. 决策逻辑
        is_server_local = False
        if target_ip and current_ip and target_ip == current_ip:
            is_server_local = True
        
        if is_server_local:
            # --- 场景 A: 在服务器本机 ---
            logger.info("检测到当前运行在数据库服务器本机，切换为 localhost 直连模式。")
            # 替换 Host 为 localhost，保留原端口 (通常服务器本机 5432 是开放的，或者走 local socket)
            # 如果 pg_hba.conf 限制了 socket，这里走 TCP localhost
            new_url_obj = url_obj.set(host='127.0.0.1')
            DATABASE_URL = str(new_url_obj)
            
        else:
            # --- 场景 B: 在本地/远程开发机 ---
            logger.info(f"检测到远程环境 (本机 IP != 目标 IP)，正在启动 SSH 隧道连接至 {db_host}...")
            
            ssh_host = os.getenv("SSH_HOST", db_host) # 如果没配 SSH_HOST，默认用数据库域名
            ssh_port = int(os.getenv("SSH_PORT", 22))
            ssh_password = os.getenv("SSH_PASSWORD")
            ssh_pkey = os.getenv("SSH_PKEY")
            
            ssh_args = {
                "ssh_address_or_host": (ssh_host, ssh_port),
                "ssh_username": SSH_USER,
                "remote_bind_address": ('127.0.0.1', db_port), # 假设数据库监听在服务器本地环回
            }
            
            if ssh_password:
                ssh_args["ssh_password"] = ssh_password
            if ssh_pkey:
                ssh_args["ssh_pkey"] = ssh_pkey

            ssh_tunnel = SSHTunnelForwarder(**ssh_args)
            ssh_tunnel.start()
            
            logger.info(f"SSH 隧道已建立: localhost:{ssh_tunnel.local_bind_port} -> {ssh_host} -> 127.0.0.1:{db_port}")
            
            # 替换 DATABASE_URL 指向隧道
            new_url_obj = url_obj.set(host='127.0.0.1', port=ssh_tunnel.local_bind_port)
            DATABASE_URL = str(new_url_obj)

    except ImportError:
        logger.warning("已配置 SSH_USER 但未安装 'sshtunnel'，将尝试直接连接。")
    except Exception as e:
        logger.error(f"SSH 隧道自动配置失败: {e}。将尝试直接连接。", exc_info=True)


# 确保 URL schema 是 asyncpg 兼容的
if DATABASE_URL.startswith("postgres://"):
    DATABASE_URL = DATABASE_URL.replace("postgres://", "postgresql+asyncpg://", 1)
elif DATABASE_URL.startswith("postgresql://"):
    DATABASE_URL = DATABASE_URL.replace("postgresql://", "postgresql+asyncpg://", 1)


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

    async def _insert_implementation(async_conn):
        # 获取底层的 asyncpg 连接 (Driver Connection)
        # async_conn 是 SQLAlchemy 的 AsyncConnection
        raw_conn = await async_conn.get_raw_connection()
        # raw_conn 是 asyncpg.connection.Connection (适配器)
        # 这里的 raw_conn.driver_connection 才是真正的 asyncpg connection
        # 但是 SQLAlchemy 的 adapater 代理了 copy_records_to_table 吗？
        # 通常 raw_conn 直接暴露了 driver 方法，或者我们需要 raw_conn.driver_connection
        # 经查，AsyncPGAdapter (raw_conn) 暴露了 driver_connection
        if hasattr(raw_conn, 'driver_connection'):
             pg_conn = raw_conn.driver_connection
        else:
             pg_conn = raw_conn # Fallback

        await pg_conn.copy_records_to_table(
            table_name,
            records=records,
            columns=columns,
            timeout=60
        )

    try:
        if session is not None:
            # 使用传入 session 的当前连接
            # session.connection() 是一个 AsyncConnection
            conn = await session.connection() 
            await _insert_implementation(conn)
            logger.info(f"成功向表 '{table_name}' 插入 {len(df)} 条数据（使用会话连接）。")
        else:
            # 回退：使用全局引擎
            logger.warning(f"未提供 session，使用全局引擎连接池（可能导致连接争抢）")
            async with async_engine.connect() as conn:
                async with conn.begin():
                    await _insert_implementation(conn)
                    logger.info(f"成功向表 '{table_name}' 插入 {len(df)} 条数据（使用全局引擎）。")
    except Exception as e:
        logger.error(f"向表 '{table_name}' 批量插入数据失败: {e}", exc_info=True)
        raise


async def bulk_upsert_df(
    df: pd.DataFrame,
    table_name: str,
    unique_keys: List[str],
    session: AsyncSession,
    ignore_conflicts: bool = False
):
    """
    使用临时表和 COPY 命令高性能地 "upsert" DataFrame 数据到 PostgreSQL。
    
    :param ignore_conflicts: 如果为 True，则遇到冲突时跳过 (DO NOTHING)。
                             如果为 False (默认)，则更新冲突记录 (DO UPDATE)。
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
    logger.info(f"开始向表 '{table_name}' 批量{'合并(Ignore)' if ignore_conflicts else '更新(Upsert)'} {len(df)} 条数据，使用临时表 '{temp_table_name}'...")

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
        
        # 构建 Conflict Action
        if ignore_conflicts:
             conflict_action = "DO NOTHING"
        else:
             if not update_cols:
                 # 如果没有非主键列可更新，Upsert 退化为 Ignore
                 conflict_action = "DO NOTHING"
             else:
                 update_clause = ", ".join([f"{col} = EXCLUDED.{col}" for col in update_cols])
                 conflict_action = f"DO UPDATE SET {update_clause}"

        merge_sql = text(f"""
            INSERT INTO {table_name} ({', '.join(df.columns)})
            SELECT * FROM {temp_table_name}
            ON CONFLICT ({', '.join(unique_keys)}) {conflict_action}
        """)
        
        await session.execute(merge_sql)
        logger.info(f"成功向表 '{table_name}' 批量处理 {len(df)} 条数据。")

    except Exception as e:
        logger.error(f"向表 '{table_name}' 批量更新数据失败: {e}", exc_info=True)
        raise
