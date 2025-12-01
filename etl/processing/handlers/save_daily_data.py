import pandas as pd
from etl.processing.base import BaseHandler
from etl.storage.database import get_session, bulk_upsert_df
from etl.storage.models.stock_daily import StockDaily


class SaveDailyDataHandler(BaseHandler):
    """
    一个用于将处理后的日线数据保存到数据库的处理器。
    """
    async def handle(self, data: pd.DataFrame):
        """
        处理数据并将日线数据高性能地保存到数据库。
        使用 `bulk_upsert_df` 函数实现高效的 "upsert" 操作。

        :param data: 包含日线数据的 pandas DataFrame。
        :return: 未经修改的数据，以传递给管道中的下一个处理器。
        """
        if not isinstance(data, pd.DataFrame) or data.empty:
            return data

        async with get_session() as session:
            await bulk_upsert_df(
                df=data,
                table_name=StockDaily.__tablename__,
                unique_keys=['code', 'trade_date'],  # <--- 修正
                session=session
            )
        
        return data
