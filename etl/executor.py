from easyquant.etl.base import AbstractDataSource
from easyquant.storage.base import AbstractDataStorage
from datetime import date
import logging

logger = logging.getLogger(__name__)

class ETLExecutor:
    """
    Coordinates the ETL process by fetching data from a source
    and loading it into a storage backend.
    """

    def __init__(self, data_source: AbstractDataSource, data_storage: AbstractDataStorage):
        self.data_source = data_source
        self.data_storage = data_storage
        logger.info(f"ETLExecutor initialized with source '{data_source.__class__.__name__}' and storage '{data_storage.__class__.__name__}'.")

    async def run_stock_list_etl(self, table_name: str = 'stock_list'):
        """
        Downloads the latest stock list and saves it to storage.
        """
        logger.info("Starting stock list ETL...")
        try:
            stock_list_df = await self.data_source.download_stock_list()
            if not stock_list_df.empty:
                await self.data_storage.save_data(stock_list_df, table_name, if_exists='replace')
                logger.info("Stock list ETL completed successfully.")
            else:
                logger.warning("Stock list was empty. Nothing saved.")
        except Exception as e:
            logger.error(f"Stock list ETL failed: {e}")
            raise

    async def run_trade_calendar_etl(self, table_name: str = 'trade_calendar'):
        """
        Downloads the trading calendar and saves it to storage.
        """
        logger.info("Starting trade calendar ETL...")
        try:
            trade_calendar_df = await self.data_source.download_trade_calendar()
            if not trade_calendar_df.empty:
                await self.data_storage.save_data(trade_calendar_df, table_name, if_exists='replace')
                logger.info("Trade calendar ETL completed successfully.")
            else:
                logger.warning("Trade calendar was empty. Nothing saved.")
        except Exception as e:
            logger.error(f"Trade calendar ETL failed: {e}")
            raise

    async def run_daily_k_data_etl(
        self,
        start_date: str,
        end_date: str = None,
        table_name: str = 'stock_daily_k_data'
    ):
        """
        Downloads daily K-line data for all stocks and saves it to storage.
        It fetches the list of stocks from the database.
        """
        logger.info(f"Starting daily K-data ETL from {start_date} to {end_date or 'today'}...")
        if end_date is None:
            end_date = date.today().strftime('%Y-%m-%d')
            
        try:
            # 1. Get the list of stocks from storage
            stock_list_df = await self.data_storage.get_data('stock_list')
            if stock_list_df.empty:
                logger.error("Stock list is not available in the database. Please run `run_stock_list_etl` first.")
                return
            
            codes = stock_list_df['code'].tolist()
            
            # 2. Download data from source
            # Note: This downloads all data in one go. For very large datasets,
            # this might need to be chunked.
            k_data_df = await self.data_source.download_stock_data(
                codes=codes,
                start_date=start_date,
                end_date=end_date,
            )
            
            # 3. Save data to storage
            if not k_data_df.empty:
                await self.data_storage.save_data(k_data_df, table_name, if_exists='append')
                logger.info("Daily K-data ETL completed successfully.")
            else:
                logger.warning("No K-line data was downloaded. Nothing saved.")

        except Exception as e:
            logger.error(f"Daily K-data ETL failed: {e}")
            raise
    
    async def close_connections(self):
        """
        Closes connections for both data source and storage.
        """
        logger.info("Closing all connections...")
        await self.data_source.logout()
        await self.data_storage.close()
        logger.info("Connections closed.")
