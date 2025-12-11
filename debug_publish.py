import asyncio
import os
import sys

# 设置环境路径
sys.path.append(os.getcwd())

from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession
from sqlalchemy.orm import sessionmaker
from sqlalchemy import text, inspect
from server.storage.models.data_table_config import DataTableConfig, TableStatus
from server.storage.ddl_generator import DDLGenerator
from sqlalchemy import select

# 从 .env 读取 DB URL
from dotenv import load_dotenv
load_dotenv()
DATABASE_URL = os.getenv("DATABASE_URL")

async def test_publish():
    engine = create_async_engine(DATABASE_URL, echo=True)
    async_session = sessionmaker(engine, class_=AsyncSession, expire_on_commit=False)

    async with async_session() as session:
        # 1. 找一个 status=DRAFT 的表，且名字包含 'copy'
        print("Searching for draft table...")
        stmt = select(DataTableConfig).where(
            DataTableConfig.status == TableStatus.DRAFT,
            DataTableConfig.table_name.like('%copy%')
        ).limit(1)
        result = await session.execute(stmt)
        config = result.scalar_one_or_none()

        if not config:
            print("No matching draft table found.")
            return

        print(f"Found table: {config.table_name}, ID: {config.id}")

        # 2. Check if table physically exists
        def check_table_exists(session):
            # run_sync passes a Session, we need a connection or engine for inspect
            # inspect(session.connection()) works if session is bound
            bind = session.get_bind()
            insp = inspect(bind)
            return insp.has_table(config.table_name)
        
        table_exists = await session.run_sync(check_table_exists)
        print(f"Physical table exists: {table_exists}")

        sqls_to_execute = []
        try:
            if table_exists:
                print("--- Entering Sync Mode ---")
                def get_db_info(session):
                    bind = session.get_bind()
                    insp = inspect(bind)
                    cols = insp.get_columns(config.table_name)
                    indexes = insp.get_indexes(config.table_name) 
                    return cols, indexes

                db_cols, db_indexes = await session.run_sync(get_db_info)
                
                # Sync Cols
                sqls = DDLGenerator.generate_sync_sqls(config.table_name, db_cols, config.columns_schema)
                print(f"Generated Column SQLs: {sqls}")
                sqls_to_execute.extend(sqls)

                # Sync Indexes
                for idx in db_indexes:
                    sqls_to_execute.append(f"DROP INDEX IF EXISTS {idx['name']};")
                
                idx_sqls = DDLGenerator.generate_index_sqls(config.table_name, config.indexes_schema)
                print(f"Generated Index SQLs: {idx_sqls}")
                sqls_to_execute.extend(idx_sqls)
                
            else:
                print("--- Entering Create Mode ---")
                ddl_sqls = DDLGenerator.generate_create_table_sqls(
                    config.table_name, 
                    config.description,
                    config.columns_schema
                )
                idx_sqls = DDLGenerator.generate_index_sqls(
                    config.table_name, 
                    config.indexes_schema
                )
                sqls_to_execute = ddl_sqls + idx_sqls
                print(f"Generated SQLs: {sqls_to_execute}")

            # 3. Dry Run Execution
            print("--- Executing SQLs (Dry Run) ---")
            for sql in sqls_to_execute:
                print(f"Executing: {sql}")
                # await session.execute(text(sql)) # Commented out for safety unless requested
            
            print("Test finished successfully.")

        except Exception as e:
            print(f"!!! Error occurred: {e}")
            import traceback
            traceback.print_exc()

if __name__ == "__main__":
    asyncio.run(test_publish())
