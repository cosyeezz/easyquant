import asyncio
import sys
import os
from sqlalchemy import text
from server.storage.database import AsyncSessionFactory
from server.storage.models.data_table_config import TableStatus

# 确保能找到 server 模块
sys.path.append(os.getcwd())

async def inspect_tables():

    print(f"{'='*20} Table Status Inspector {'='*20}")

    

    async with AsyncSessionFactory() as session:

        # 0. 显示连接信息

        print("\n[0] Connection Info:")

        try:

            conn_info = await session.execute(text("SELECT current_database(), inet_server_addr(), inet_server_port()"))

            db_name, db_host, db_port = conn_info.fetchone()

            print(f"    Database: {db_name}")

            print(f"    Host:     {db_host}")

            print(f"    Port:     {db_port}")

        except Exception as e:

            print(f"    Error querying connection info: {e}")



        # 1. 查询配置表 (前端显示的数据来源)

        print("\n[1] Configured Tables (from data_table_configs):")
        print(f"{ 'ID':<5} {'Name':<15} {'Table Name':<20} {'Status':<10} {'Physical Exists?'}")
        print("-" * 70)
        
        try:
            # 获取所有配置
            result = await session.execute(text(
                "SELECT id, name, table_name, status FROM data_table_configs"
            ))
            configs = result.fetchall()
            
            if not configs:
                print("(No table configurations found)")
            
            for row in configs:
                conf_id, name, table_name, status = row
                
                # 检查物理表是否存在
                check_sql = text(
                    "SELECT EXISTS (SELECT FROM information_schema.tables WHERE table_schema = 'public' AND table_name = :t)"
                )
                exists_res = await session.execute(check_sql, {"t": table_name})
                exists = exists_res.scalar()
                
                exists_str = "YES" if exists else "NO"
                
                # 高亮显示问题
                status_display = status
                if status == "draft" and not exists:
                    status_display = "DRAFT (Normal)"
                elif status == "created" and not exists:
                    status_display = "CREATED [MISSING!]" # 状态是已创建，但物理表没了 -> 异常
                elif status == "draft" and exists:
                    status_display = "DRAFT [ORPHAN!]"    # 状态是草稿，但物理表存在 -> 异常
                
                print(f"{conf_id:<5} {name:<15} {table_name:<20} {status_display:<15} {exists_str}")
                
        except Exception as e:
            print(f"Error querying configs: {e}")

    print("\n" + "="*60)
    print("Explanation:")
    print(" - DRAFT (Normal): You defined the table but haven't clicked 'Publish' yet.")
    print("                   Physical table does NOT exist. This is expected.")
    print(" - CREATED:        Table is published and physical table exists.")
    print(" - [MISSING!]:     System thinks table is created, but physical table is gone.")
    print("                   (Did you drop tables manually?)")
    print("============================================================")

if __name__ == "__main__":
    asyncio.run(inspect_tables())
