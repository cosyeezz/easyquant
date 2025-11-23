# easyquant/storage/postgresql.py
import pandas as pd
from sqlalchemy.ext.asyncio import create_async_engine, AsyncEngine
from easyquant.config import DATABASE_URL
from easyquant.storage.base import AbstractDataStorage
import logging

logger = logging.getLogger(__name__)

class PostgreSQLStorage(AbstractDataStorage):
    """
    PostgreSQL implementation of the AbstractDataStorage.
    Handles data storage and retrieval operations with a PostgreSQL database.
    """
    _engine: AsyncEngine = None

    def __init__(self):
        if PostgreSQLStorage._engine is None:
            try:
                PostgreSQLStorage._engine = create_async_engine(DATABASE_URL, echo=False)
                logger.info("PostgreSQL engine created successfully.")
            except Exception as e:
                logger.error(f"Failed to create PostgreSQL engine: {e}")
                raise

    async def get_engine(self) -> AsyncEngine:
        """
        Returns the singleton instance of the async engine.
        """
        return self._engine

    async def save_data(self, data: pd.DataFrame, table_name: str, if_exists: str = 'append'):
        """
        Save a DataFrame to a specified PostgreSQL table.

        Args:
            data (pd.DataFrame): The DataFrame to save.
            table_name (str): The name of the table to save the data to.
            if_exists (str): How to behave if the table already exists.
                             'fail', 'replace', or 'append'.
        """
        if data.empty:
            logger.warning(f"Data for table '{table_name}' is empty. Nothing to save.")
            return

        engine = await self.get_engine()
        try:
            # Use a context manager to ensure the connection is closed
            async with engine.begin() as conn:
                await conn.run_sync(
                    lambda sync_conn: data.to_sql(
                        name=table_name,
                        con=sync_conn,
                        if_exists=if_exists,
                        index=False,
                        chunksize=1000  # Efficiently insert in chunks
                    )
                )
            logger.info(f"Successfully saved {len(data)} rows to table '{table_name}'.")
        except Exception as e:
            logger.error(f"Error saving data to table '{table_name}': {e}")
            raise

    async def get_data(self, table_name: str, start_date: str = None, end_date: str = None, codes: list = None) -> pd.DataFrame:
        """
        Retrieve data from a specified PostgreSQL table.

        Args:
            table_name (str): The name of the table to retrieve data from.
            start_date (str, optional): The start date for the data query.
            end_date (str, optional): The end date for the data query.
            codes (list, optional): A list of security codes to filter by.

        Returns:
            pd.DataFrame: The retrieved data.
        """
        engine = await self.get_engine()
        query_params = {}
        conditions = []

        if start_date:
            conditions.append("date >= %(start_date)s")
            query_params['start_date'] = start_date
        if end_date:
            conditions.append("date <= %(end_date)s")
            query_params['end_date'] = end_date
        if codes:
            conditions.append("code IN %(codes)s")
            query_params['codes'] = tuple(codes)

        where_clause = f"WHERE {' AND '.join(conditions)}" if conditions else ""
        query = f'SELECT * FROM "{table_name}" {where_clause} ORDER BY date'

        try:
            async with engine.connect() as conn:
                result_df = await conn.run_sync(
                    lambda sync_conn: pd.read_sql_query(query, sync_conn, params=query_params)
                )
            logger.info(f"Successfully retrieved {len(result_df)} rows from table '{table_name}'.")
            return result_df
        except Exception as e:
            logger.error(f"Error retrieving data from table '{table_name}': {e}")
            # If the table doesn't exist, it's not an error, just return empty DataFrame
            if "does not exist" in str(e):
                logger.warning(f"Table '{table_name}' does not exist. Returning empty DataFrame.")
                return pd.DataFrame()
            raise

    async def close(self):
        """
        Dispose of the engine connection pool.
        """

        if self._engine:
            await self._engine.dispose()
            PostgreSQLStorage._engine = None
            logger.info("PostgreSQL engine disposed.")
