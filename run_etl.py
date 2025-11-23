# easyquant/run_etl.py
import asyncio
import logging
from datetime import datetime
# from easyquant.etl.baostock_source import BaoStockDataSource
from easyquant.etl.csv_source import CSVDataSource
from easyquant.storage.postgresql import PostgreSQLStorage
from easyquant.etl.executor import ETLExecutor
from easyquant.logging_config import setup_logging
from easyquant.config import CSV_FOLDER_PATH

async def main():
    """
    Main asynchronous function to run the ETL process.
    """
    setup_logging()
    logger = logging.getLogger(__name__)

    # --- Choose your data source here ---
    # source = BaoStockDataSource()
    source = CSVDataSource(csv_folder_path=CSV_FOLDER_PATH)
    
    storage = PostgreSQLStorage()
    executor = ETLExecutor(data_source=source, data_storage=storage)

    start_time = datetime.now()
    logger.info(f"Starting ETL process from CSV folder: {CSV_FOLDER_PATH}")

    try:
        # Step 1: Get Stock List from CSV filenames
        await executor.run_stock_list_etl()

        # Step 2: Load Daily K-Data from CSV files
        # Define the date range for K-data loading.
        start_date = "2020-01-01"
        end_date = "2025-11-23" # Adjust as needed
        await executor.run_daily_k_data_etl(start_date=start_date, end_date=end_date)

    except Exception as e:
        logger.error(f"An error occurred during the ETL process: {e}", exc_info=True)
    finally:
        await executor.close_connections()
        end_time = datetime.now()
        logger.info(f"ETL process finished in {end_time - start_time}.")

if __name__ == "__main__":
    # Ensure you have a .env file with your PostgreSQL credentials and CSV path, e.g.:
    # DB_USER=your_user
    # DB_PASSWORD=your_password
    # DB_HOST=localhost
    # DB_PORT=5432
    # DB_NAME=easyquant_db
    # CSV_FOLDER_PATH=F:/path/to/your/csv_data
    
    asyncio.run(main())
