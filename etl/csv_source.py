# easyquant/etl/csv_source.py
import asyncio
import os
import pandas as pd
from datetime import date
from typing import List
import logging

from easyquant.etl.base import AbstractDataSource

logger = logging.getLogger(__name__)

class CSVDataSource(AbstractDataSource):
    """
    Data source implementation for loading data from local CSV files.
    """

    def __init__(self, csv_folder_path: str):
        """
        Initializes the CSV data source.

        Args:
            csv_folder_path (str): The path to the folder containing the CSV files.
        """
        if not os.path.isdir(csv_folder_path):
            raise ValueError(f"The provided path '{csv_folder_path}' is not a valid directory.")
        self.csv_folder_path = csv_folder_path
        logger.info(f"CSVDataSource initialized with folder: {self.csv_folder_path}")

    async def login(self):
        """Not applicable for CSV source."""
        logger.info("Login is not required for CSVDataSource.")
        await asyncio.sleep(0)  # Maintain async consistency

    async def logout(self):
        """Not applicable for CSV source."""
        logger.info("Logout is not required for CSVDataSource.")
        await asyncio.sleep(0)

    async def download_stock_list(self, update_date: date = None) -> pd.DataFrame:
        """
        Derives a stock list from the filenames in the CSV folder.
        Assumes filenames are in the format `<code>.csv` (e.g., 'sh.600000.csv').
        """
        logger.info("Generating stock list from CSV filenames...")
        files = [f for f in os.listdir(self.csv_folder_path) if f.endswith('.csv')]
        if not files:
            logger.warning("No CSV files found in the directory.")
            return pd.DataFrame(columns=['code'])
            
        codes = [os.path.splitext(f)[0] for f in files]
        stock_list_df = pd.DataFrame(codes, columns=['code'])
        logger.info(f"Generated a list of {len(stock_list_df)} stocks.")
        return stock_list_df

    async def download_trade_calendar(self) -> pd.DataFrame:
        """
        Not applicable for CSV source. Returns an empty DataFrame.
        A separate source or pre-generated calendar should be used.
        """
        logger.warning("`download_trade_calendar` is not supported by CSVDataSource.")
        return pd.DataFrame()

    async def download_stock_data(
        self,
        codes: List[str],
        start_date: str,
        end_date: str,
        frequency: str = 'd',
        adjust_type: str = 'qfq'
    ) -> pd.DataFrame:
        """
        Loads historical market data from CSV files for a list of stocks.

        It reads each corresponding CSV file, concatenates them, and filters by date.
        
        Note: `frequency` and `adjust_type` are ignored as the data is pre-set in the CSVs.
        """
        logger.info(f"Loading stock data for {len(codes)} codes from CSV files...")
        all_data = []
        
        for code in codes:
            file_path = os.path.join(self.csv_folder_path, f"{code}.csv")
            if os.path.exists(file_path):
                try:
                    df = pd.read_csv(file_path)
                    # Basic column check - adjust as per your CSV format
                    if 'date' not in df.columns or 'code' not in df.columns:
                         logger.warning(f"CSV file for {code} is missing 'date' or 'code' column. Skipping.")
                         continue
                    all_data.append(df)
                except Exception as e:
                    logger.error(f"Failed to read or process file {file_path}: {e}")
            else:
                logger.warning(f"No CSV file found for code: {code}")

        if not all_data:
            logger.warning("No data was loaded from CSV files.")
            return pd.DataFrame()

        combined_df = pd.concat(all_data, ignore_index=True)
        
        # Ensure date column is in datetime format for filtering
        combined_df['date'] = pd.to_datetime(combined_df['date'])
        
        # Filter by date range
        start_date_dt = pd.to_datetime(start_date)
        end_date_dt = pd.to_datetime(end_date)
        
        mask = (combined_df['date'] >= start_date_dt) & (combined_df['date'] <= end_date_dt)
        filtered_df = combined_df.loc[mask].copy()

        # Convert date back to string to match expected format if necessary
        filtered_df['date'] = filtered_df['date'].dt.strftime('%Y-%m-%d')
        
        logger.info(f"Successfully loaded {len(filtered_df)} data points from CSV files.")
        return filtered_df
