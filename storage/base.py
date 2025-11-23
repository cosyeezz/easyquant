# easyquant/storage/base.py
from abc import ABC, abstractmethod
import pandas as pd
from sqlalchemy.ext.asyncio import AsyncEngine

class AbstractDataStorage(ABC):
    """
    Abstract base class for data storage operations.
    Defines a common interface for saving and retrieving financial data,
    ensuring that different storage backends (e.g., PostgreSQL, CSV, Parquet)
    can be used interchangeably.
    """

    @abstractmethod
    async def save_data(self, data: pd.DataFrame, table_name: str, if_exists: str = 'append'):
        """
        Save a DataFrame to a specified table or collection.

        Args:
            data (pd.DataFrame): The DataFrame to save.
            table_name (str): The name of the table/file to save the data to.
            if_exists (str): How to behave if the table already exists.
                             Options are 'fail', 'replace', 'append'.
        """
        pass

    @abstractmethod
    async def get_data(self, table_name: str, start_date: str = None, end_date: str = None, codes: list = None) -> pd.DataFrame:
        """
        Retrieve data from a specified table or collection.

        Args:
            table_name (str): The name of the table/file to retrieve data from.
            start_date (str, optional): The start date for the data query.
            end_date (str, optional): The end date for the data query.
            codes (list, optional): A list of stock/security codes to filter by.

        Returns:
            pd.DataFrame: The retrieved data as a DataFrame.
        """
        pass

    @abstractmethod
    async def get_engine(self) -> AsyncEngine:
        """
        Provides access to the underlying database engine (if applicable).

        Returns:
            AsyncEngine: The asynchronous SQLAlchemy engine.
        """
        pass

    @abstractmethod
    async def close(self):
        """
        Close the connection or any open resources.
        """
        pass
