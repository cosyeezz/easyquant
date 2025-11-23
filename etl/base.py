# easyquant/etl/base.py
from abc import ABC, abstractmethod
import pandas as pd
from datetime import date

class AbstractDataSource(ABC):
    """
    Abstract base class for data sources.
    Defines a standard interface for fetching financial data from various sources,
    such as online APIs (BaoStock, Tushare) or local files.
    """

    @abstractmethod
    async def login(self):
        """
        Logs into the data source service if required.
        """
        pass

    @abstractmethod
    async def logout(self):
        """
        Logs out from the data source service.
        """
        pass

    @abstractmethod
    async def download_stock_list(self, update_date: date = None) -> pd.DataFrame:
        """
        Downloads the list of all available stocks.

        Args:
            update_date (date, optional): The date to retrieve the stock list for.
                                          If None, gets the latest list.

        Returns:
            pd.DataFrame: A DataFrame containing the stock list,
                          typically with columns like 'code', 'name', 'ipo_date'.
        """
        pass

    @abstractmethod
    async def download_trade_calendar(self) -> pd.DataFrame:
        """
        Downloads the trading calendar.

        Returns:
            pd.DataFrame: A DataFrame containing the trading calendar with columns
                          like 'date' and 'is_trading_day'.
        """
        pass

    @abstractmethod
    async def download_stock_data(
        self,
        codes: list,
        start_date: str,
        end_date: str,
        frequency: str = 'd',
        adjust_type: str = 'qfq'
    ) -> pd.DataFrame:
        """
        Downloads historical market data for a list of stocks.

        Args:
            codes (list): A list of stock codes to download data for.
            start_date (str): The start date of the data range (e.g., 'YYYY-MM-DD').
            end_date (str): The end date of the data range (e.g., 'YYYY-MM-DD').
            frequency (str): The data frequency ('d' for daily, 'w' for weekly, etc.).
            adjust_type (str): The price adjustment type ('qfq' for forward-adjusted,
                               'hfq' for backward-adjusted, 'none' for no adjustment).

        Returns:
            pd.DataFrame: A DataFrame containing the historical stock data.
        """
        pass
