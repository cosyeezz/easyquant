import pandas as pd
import logging
from etl.processing.base import BaseHandler
from etl.storage.database import get_session, bulk_upsert_df
from etl.storage.models.stock_daily import StockDaily

logger = logging.getLogger(__name__)

class SaveDailyDataHandler(BaseHandler):
    """
    数据保存处理器，负责将清洗和转换后的日线数据高效地存入数据库。
    """
    async def handle(self, data: pd.DataFrame) -> pd.DataFrame:
        """
        处理给定的 DataFrame，并将其内容 "upsert" 到 `stock_daily` 表中。

        "Upsert" 操作意味着：
        - 如果数据库中已存在具有相同唯一键（`code` 和 `trade_date`）的记录，则更新该记录。
        - 如果不存在，则插入新记录。

        此方法通过调用 `bulk_upsert_df` 函数来利用数据库的 `INSERT ... ON CONFLICT`
        功能，从而实现高性能的数据合并。

        :param data: 包含待保存日线数据的 Pandas DataFrame。
                     DataFrame 必须包含 `code` 和 `trade_date` 列。
        :return: 返回未经修改的原始 DataFrame，以便管道中的后续处理器可以继续使用。
        """
        if not isinstance(data, pd.DataFrame) or data.empty:
            logger.warning("输入数据不是有效的 DataFrame 或为空，跳过数据库保存操作。")
            return data

        logger.info(f"准备将 {len(data)} 条日线数据保存到数据库...")

        # 使用 "async with" 结构从 get_session() 上下文管理器中获取会话。
        # 这确保了数据库会话在使用后能被正确关闭和资源释放，
        # 并且在发生异常时能自动回滚事务。
        async with get_session() as session:
            logger.info(f"开始调用 bulk_upsert_df，处理 {len(data)} 条数据...")
            await bulk_upsert_df(
                df=data,
                table_name=StockDaily.__tablename__,
                # unique_keys 定义了判断数据是否冲突的业务逻辑。
                # 在日线数据场景下，股票代码和交易日期的组合是唯一的。
                unique_keys=['code', 'trade_date'],
                session=session
            )
            logger.info(f"bulk_upsert_df 调用成功。")

        logger.info(f"数据保存成功。")
        return data
