import os
from logging.config import fileConfig

from sqlalchemy import engine_from_config
from sqlalchemy import pool
from dotenv import load_dotenv

from alembic import context

# this is the Alembic Config object, which provides
# access to the values within the .ini file in use.
config = context.config

# Interpret the config file for Python logging.
# This line sets up loggers basically.
if config.config_file_name is not None:
    fileConfig(config.config_file_name)

# --- CUSTOMIZATION STARTS HERE ---

# 1. Load environment variables from .env file
load_dotenv()

# 2. Add your model's MetaData object here for 'autogenerate' support
#    Import the new Base from base.py and also import all models
#    so that Base's metadata knows about them.
from server.storage.models.base import Base
import server.storage.models.event
import server.storage.models.etl_task_config
import server.storage.models.data_table_config
target_metadata = Base.metadata

# 3. Read the database URL from the server configuration (reusing SSH Tunnel logic)
def get_url():
    # Import DATABASE_URL from server.storage.database
    # This ensures we use the SSH-tunneled URL if active
    from server.storage.database import DATABASE_URL
    
    url = DATABASE_URL
    if not url:
        raise ValueError("DATABASE_URL not found in server.storage.database module.")
    
    # Alembic's sync engine needs a non-asyncpg URL
    if "asyncpg" in url:
        # e.g., postgresql+asyncpg://... -> postgresql://...
        url = url.replace("+asyncpg", "")
        
    return url

# --- CUSTOMIZATION ENDS HERE ---


# other values from the config, defined by the needs of env.py,
# can be acquired:
# my_important_option = config.get_main_option("my_important_option")
# ... etc.


def run_migrations_offline() -> None:
    """Run migrations in 'offline' mode.

    This configures the context with just a URL
    and not an Engine, though an Engine is acceptable
    here as well.  By skipping the Engine creation
    we don't even need a DBAPI to be available.

    Calls to context.execute() here emit the given string to the
    script output.

    """
    url = get_url() # Use our custom URL function
    context.configure(
        url=url,
        target_metadata=target_metadata,
        literal_binds=True,
        dialect_opts={"paramstyle": "named"},
    )

    with context.begin_transaction():
        context.run_migrations()


def run_migrations_online() -> None:
    """Run migrations in 'online' mode.

    In this scenario we need to create an Engine
    and associate a connection with the context.

    """
    # Create a new dictionary for engine_from_config
    # and set the URL from our environment-aware function.
    configuration = config.get_section(config.config_ini_section, {})
    configuration["sqlalchemy.url"] = get_url()
    
    connectable = engine_from_config(
        configuration,
        prefix="sqlalchemy.",
        poolclass=pool.NullPool,
    )

    with connectable.connect() as connection:
        context.configure(
            connection=connection, target_metadata=target_metadata
        )

        with context.begin_transaction():
            context.run_migrations()


if context.is_offline_mode():
    run_migrations_offline()
else:
    run_migrations_online()
