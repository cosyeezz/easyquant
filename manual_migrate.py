import asyncio
import os
import sys
from sqlalchemy import text
from server.storage.database import AsyncSessionFactory

# Add project root to sys.path
sys.path.append(os.getcwd())

async def migrate_add_column():
    print("Starting manual migration: Adding 'last_published_at' to 'data_table_configs'...")
    
    async with AsyncSessionFactory() as session:
        try:
            # Check if column exists
            check_sql = text("""
                SELECT column_name 
                FROM information_schema.columns 
                WHERE table_name='data_table_configs' AND column_name='last_published_at';
            """)
            result = await session.execute(check_sql)
            if result.fetchone():
                print("Column 'last_published_at' already exists. Skipping.")
                return

            # Add column
            print("Adding column...")
            alter_sql = text("""
                ALTER TABLE data_table_configs 
                ADD COLUMN last_published_at TIMESTAMP WITHOUT TIME ZONE;
            """)
            await session.execute(alter_sql)
            await session.commit()
            print("Successfully added 'last_published_at' column.")
            
        except Exception as e:
            print(f"Migration failed: {e}")
            await session.rollback()

if __name__ == "__main__":
    asyncio.run(migrate_add_column())
