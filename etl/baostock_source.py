# easyquant/etl/baostock_source.py
import baostock as bs
import pandas as pd
from datetime import date, datetime
from easyquant.etl.base import AbstractDataSource
import logging

logger = logging.getLogger(__name__)

class BaoStockDataSource(AbstractDataSource):
    """
    Data source implementation for BaoStock.
    Handles data fetching from the BaoStock API.
    """

    def __init__(self):
        self._logged_in = False

    async def login(self):
        """

        Logs into the BaoStock service.
        """
        if not self._logged_in:
            result = bs.login()
            if result.error_code == '0':
                self._logged_in = True
                logger.info("BaoStock login successful.")
            else:
                logger.error(f"BaoStock login failed: {result.error_msg}")
                raise ConnectionError(f"BaoStock login failed: {result.error_msg}")

    async def logout(self):
        """
        Logs out from the BaoStock service.
        """
        if self._logged_in:
            bs.logout()
            self._logged_in = False
            logger.info("BaoStock logout successful.")

    async def download_stock_list(self, update_date: date = None) -> pd.DataFrame:
        """
        Downloads the list of all available stocks from BaoStock.
        """
        await self.login()
        request_date = update_date.strftime('%Y-%m-%d') if update_date else date.today().strftime('%Y-%m-%d')
        rs = bs.query_all_stock(day=request_date)
        if rs.error_code != '0':
            logger.error(f"Failed to download stock list: {rs.error_msg}")
            return pd.DataFrame()
        
        df = rs.get_data()
        # Filter out stocks that are suspended
        df = df[df['tradeStatus'] == '1'].copy()
        df.rename(columns={'code': 'code', 'ipoDate': 'ipo_date', 'outDate': 'out_date', 'tradeStatus': 'trade_status'}, inplace=True)
        logger.info(f"Successfully downloaded {len(df)} stocks from BaoStock.")
        return df[['code', 'ipo_date', 'out_date', 'trade_status']]


    async def download_trade_calendar(self) -> pd.DataFrame:
        """
        Downloads the trading calendar from BaoStock.
        """
        await self.login()
        rs = bs.query_trade_dates()
        if rs.error_code != '0':
            logger.error(f"Failed to download trade calendar: {rs.error_msg}")
            return pd.DataFrame()
            
        df = rs.get_data()
        df.rename(columns={'calendar_date': 'date', 'is_trading_day': 'is_trading_day'}, inplace=True)
        df['is_trading_day'] = df['is_trading_day'].astype(int)
        logger.info(f"Successfully downloaded trade calendar with {len(df)} records.")
        return df

    async def download_stock_data(
        self,
        codes: list,
        start_date: str,
        end_date: str,
        frequency: str = 'd',
        adjust_type: str = '2'  # Corresponds to 'qfq' (forward-adjusted)
    ) -> pd.DataFrame:
        """
        Downloads historical K-line data for a list of stocks from BaoStock.
        """
        await self.login()
        
        # BaoStock fields for daily K-data
        fields = "date,code,open,high,low,close,preclose,volume,amount,adjustflag,turn,tradestatus,pctChg,peTTM,pbMRQ,psTTM,pcfNcfTTM,isST"
        
        all_data = []
        for code in codes:
            try:
                rs = bs.query_history_k_data_plus(
                    code, fields,
                    start_date=start_date, end_date=end_date,
                    frequency=frequency, adjustflag=adjust_type
                )
                if rs.error_code == '0':
                    all_data.append(rs.get_data())
                else:
                    logger.warning(f"Failed to download data for {code}: {rs.error_msg}")
            except Exception as e:
                logger.error(f"An exception occurred while downloading data for {code}: {e}")

        if not all_data:
            return pd.DataFrame()

        result_df = pd.concat(all_data)
        # Data type conversion and cleaning
        numeric_cols = ['open', 'high', 'low', 'close', 'preclose', 'volume', 'amount', 'turn', 'pctChg', 'peTTM', 'pbMRQ', 'psTTM', 'pcfNcfTTM']
        for col in numeric_cols:
            result_df[col] = pd.to_numeric(result_df[col], errors='coerce')
        result_df.fillna(0, inplace=True)
        
        logger.info(f"Successfully downloaded {len(result_df)} data points for {len(codes)} stocks.")
        return result_df
