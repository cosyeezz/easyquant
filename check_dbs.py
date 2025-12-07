import asyncio
import sys
import os
from sqlalchemy import text
from server.storage.database import AsyncSessionFactory

sys.path.append(os.getcwd())

async def list_databases():
    print("Connecting to verify databases...")
    try:
        async with AsyncSessionFactory() as session:
            # 查询 pg_database
            result = await session.execute(text("SELECT datname FROM pg_database WHERE datistemplate = false;"))
            dbs = [row[0] for row in result.fetchall()]
            
            print(f"\nFound {len(dbs)} databases on server:")
            for db in dbs:
                print(f" - {db}")
                
            # 再次确认当前连接的库
            curr = await session.execute(text("SELECT current_database()"))
            print(f"\nCurrently connected to: {curr.scalar()}")
            
    except Exception as e:
        print(f"Error: {e}")

if __name__ == "__main__":
    asyncio.run(list_databases())

