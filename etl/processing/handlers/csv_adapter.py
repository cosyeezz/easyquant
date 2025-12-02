import pandas as pd
from etl.processing.base import BaseHandler


class CsvAdapterHandler(BaseHandler):
    """
    CSV数据源适配器 (CsvAdapterHandler)

    **设计思想**:
    根据ETL架构的职责分离原则，Adapter的唯一职责是将特定数据源的原始格式
    转换为系统内部的标准格式。对于CSV数据源，这意味着进行列名映射。

    **核心职责**:
    将CSV文件的中文列名（如 '交易日期', '股票代码'）映射为系统内部的
    标准英文列名（如 'trade_date', 'code'），使得后续的通用清洗器
    (CleanDataHandler) 能够以统一的方式处理来自不同数据源的数据。

    **处理流程**:
    1. 接收原始CSV DataFrame（带中文列名）
    2. 根据COLUMN_MAPPING进行列名重命名
    3. 只保留映射中定义的列，丢弃其他列
    4. 返回标准格式的DataFrame供下游处理器使用

    **使用场景**:
    在ETL Pipeline中，此处理器应该是第一个环节，位于清洗器之前：
    Pipeline.create([
        CsvAdapterHandler(),      # 第一步：适配列名
        CleanDataHandler(),       # 第二步：清洗数据
        SaveDailyDataHandler(),   # 第三步：保存数据
    ])
    """

    # 定义从CSV中文列名到内部标准英文列名的映射
    COLUMN_MAPPING = {
        '交易日期': 'trade_date',
        '股票代码': 'code',
        '股票名称': 'name',
        '开盘价': 'open',
        '最高价': 'high',
        '最低价': 'low',
        '收盘价': 'close',
        '前收盘价': 'pre_close',
        '成交量': 'volume',
        '成交额': 'amount',
        '流通市值': 'circulation_market_value',
        '总市值': 'total_market_value',
    }

    async def handle(self, df: pd.DataFrame) -> pd.DataFrame:
        """
        将CSV格式的DataFrame适配为系统内部标准格式。

        :param df: 从CsvLoader传入的原始DataFrame（带中文列名）
        :return: 标准格式的DataFrame（带英文列名）
        """
        if df.empty:
            return df

        # 列名映射
        df = df.rename(columns=self.COLUMN_MAPPING)

        # 只保留映射中定义的标准列（存在于当前DataFrame中的列）
        standard_columns = list(self.COLUMN_MAPPING.values())
        existing_cols = [col for col in standard_columns if col in df.columns]
        df = df[existing_cols]

        return df
