import asyncio
import sys
import os
from sqlalchemy import text, update, select
from server.storage.database import AsyncSessionFactory
from server.storage.models.data_table_config import DataTableConfig, TableStatus

# 确保能找到 server 模块
sys.path.append(os.getcwd())

async def fix_orphan_tables():
    print("Fixing inconsistent table states...")
    
    async with AsyncSessionFactory() as session:
        # 1. 查找所有 CREATED 状态的表配置 (使用 ORM)
        stmt = select(DataTableConfig).where(DataTableConfig.status == TableStatus.CREATED)
        result = await session.execute(stmt)
        configs = result.scalars().all()
        
        fixed_count = 0
        
        for config in configs:
            table_name = config.table_name
            
            # 2. 检查物理表是否存在 (使用 text, 这部分没问题)
            check_sql = text(
                "SELECT EXISTS (SELECT FROM information_schema.tables WHERE table_schema = 'public' AND table_name = :t)"
            )
            exists_res = await session.execute(check_sql, {"t": table_name})
            exists = exists_res.scalar()
            
            if not exists:
                print(f" -> Found inconsistency: Table '{table_name}' (ID {config.id}) is CREATED but physically missing.")
                print(f"    Resetting status to DRAFT...")
                
                # 3. 更新状态为 DRAFT
                config.status = TableStatus.DRAFT
                session.add(config)
                fixed_count += 1
        
        if fixed_count > 0:
            await session.commit()
            print(f"Successfully fixed {fixed_count} tables.")
        else:
            print("No inconsistencies found.")

if __name__ == "__main__":
    asyncio.run(fix_orphan_tables())
