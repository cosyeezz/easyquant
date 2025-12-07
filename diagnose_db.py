import asyncio
import sys
import os
from sqlalchemy import text
from alembic import command
from alembic.config import Config
from server.storage.database import AsyncSessionFactory

# 确保能找到 server 模块
sys.path.append(os.getcwd())

async def diagnose_db():
    print("--- Database Diagnosis ---")
    
    async with AsyncSessionFactory() as session:
        # 1. 列出所有表
        print("\n[1] Current Tables:")
        try:
            result = await session.execute(text(
                "SELECT table_name FROM information_schema.tables WHERE table_schema = 'public'"
            ))
            tables = [row[0] for row in result.fetchall()]
            if not tables:
                print("    (No tables found)")
            else:
                for t in tables:
                    print(f"    - {t}")
        except Exception as e:
            print(f"    Error querying tables: {e}")

        # 2. 检查 alembic_version
        print("\n[2] Alembic Version:")
        if 'alembic_version' in tables:
            try:
                result = await session.execute(text("SELECT version_num FROM alembic_version"))
                version = result.scalar()
                print(f"    Current version: {version}")
            except Exception as e:
                print(f"    Error querying version: {e}")
        else:
            print("    (alembic_version table not found)")

    # 3. 尝试运行 Alembic Upgrade
    print("\n[3] Running Alembic Upgrade (Dry Run Check)...")
    try:
        alembic_cfg = Config("alembic.ini")
        # 捕获输出比较麻烦，直接运行看控制台
        command.upgrade(alembic_cfg, "head")
        print("    Alembic command executed.")
    except Exception as e:
        print(f"    Alembic execution failed: {e}")

if __name__ == "__main__":
    asyncio.run(diagnose_db())
