from logging.config import fileConfig

from sqlalchemy import engine_from_config, create_engine
from sqlalchemy import pool

from alembic import context

# 这是 Alembic 的配置对象，它提供了
# 访问 .ini 文件中值的途径。
from config import DATABASE_URL
config = context.config

# 为 Python 日志系统解释配置文件。
# 这行代码基本上是用来设置日志记录器的。
if config.config_file_name is not None:
    fileConfig(config.config_file_name)

# 在这里添加你的模型的 MetaData 对象
# 以支持 'autogenerate' 功能。
# 例如:
# from myapp import mymodel
# target_metadata = mymodel.Base.metadata
import os
import sys
# 将项目根目录添加到 sys.path，以便 Alembic 能找到我们的模型模块。
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))

from etl.storage.models import Base
# 将我们 SQLAlchemy 模型的元数据赋值给 target_metadata。
# autogenerate 命令会使用这个元数据来检测数据库表结构的变化。
target_metadata = Base.metadata

# 其他来自配置文件的值，可以根据 env.py 的需要获取：
# my_important_option = config.get_main_option("my_important_option")
# ... 等等。


def run_migrations_offline() -> None:
    """在 'offline' 模式下运行迁移。

    这种模式下，我们只配置一个 URL 而不是一个 Engine。
    因为跳过了 Engine 的创建，我们甚至不需要数据库API（DBAPI）可用。
    
    在这里调用 context.execute() 会将给定的字符串输出到脚本文件中。
    这通常用于生成SQL迁移脚本，以便手动应用。
    """
    url = config.get_main_option("sqlalchemy.url")
    context.configure(
        url=url,
        target_metadata=target_metadata,
        literal_binds=True,
        dialect_opts={"paramstyle": "named"},
    )

    with context.begin_transaction():
        context.run_migrations()


def run_migrations_online() -> None:
    """在 'online' 模式下运行迁移。

    在这种模式下，我们需要创建一个 Engine，并将一个数据库连接
    与 context 关联起来。
    """
    # 使用从 config.py 导入的 DATABASE_URL
    # 并将 'postgresql+asyncpg' 替换为 'postgresql' 以进行同步操作
    db_url = DATABASE_URL.replace("postgresql+asyncpg", "postgresql")
    connectable = create_engine(db_url)


    with connectable.connect() as connection:
        context.configure(
            connection=connection, target_metadata=target_metadata
        )

        with context.begin_transaction():
            context.run_migrations()


# 判断当前是在离线模式还是在线模式，并调用相应函数
if context.is_offline_mode():
    run_migrations_offline()
else:
    run_migrations_online()
