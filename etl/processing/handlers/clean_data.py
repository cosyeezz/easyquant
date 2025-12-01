import pandas as pd
from etl.processing.base import BaseHandler


class CleanCsvDailyHandler(BaseHandler):
    """
    CSV源日线数据清洗处理器 (CleanCsvDailyHandler)

    **设计思想**:
    本处理器是为处理CSV格式的股票日线数据而设计的专用ETL模块。它遵循职责单一原则，
    将数据从原始CSV格式到可用于量化分析的干净、标准化格式的转换过程封装在一起。

    **核心职责**:
    1.  **格式适配**: 将不同来源CSV文件中的列名（如 'date', 'code'）映射并重命名
        为系统内部统一的标准字段（如 'trade_date', 'code'）。
    2.  **数据清洗**: 执行一系列健壮性检查和数据清理操作，确保数据质量。

    **主要清洗步骤**:
    1.  **数据类型转换**: 强制转换日期、价格、成交量等字段到正确的数值或日期类型。
    2.  **处理关键数据缺失**: 移除价格、成交量等核心字段为空的行。
    3.  **过滤无效数据**: 移除价格或成交量为非正数（<=0）的异常记录。
    4.  **移除价格异动数据**: 识别并剔除单日价格波动异常的记录（如日涨跌幅超过22%），
        以消除潜在的数据噪声或错误。

    **使用场景**:
    在ETL流程中，此处理器应作为处理CSV日线数据的第一个环节，直接消费由 `CsvLoader`
    加载的原始DataFrame，为后续的因子计算等步骤提供高质量的标准化数据输入。
    """

    # 定义从CSV列名到内部标准列名的映射
    COLUMN_MAPPING = {
        'date': 'trade_date',
        'code': 'code',
        'open': 'open',
        'high': 'high',
        'low': 'low',
        'close': 'close',
        'pre_close': 'pre_close',  # 添加前收盘价
        'volume': 'volume',
        'amount': 'amount',
    }

    async def handle(self, df: pd.DataFrame) -> pd.DataFrame:
        """
        对从CSV加载的原始DataFrame执行适配和清洗操作。

        :param df: 从CsvLoader传入的原始DataFrame。
        :return: 清洗和标准化后的DataFrame。
        """
        if df.empty:
            return df

        # --- 步骤 1: 适配CSV列名 ---
        df = df.rename(columns=self.COLUMN_MAPPING)
        standard_columns = list(self.COLUMN_MAPPING.values())
        existing_cols = [col for col in standard_columns if col in df.columns]
        df = df[existing_cols]

        # --- 步骤 2: 标准数据类型转换 ---
        # 确保后续计算的类型安全
        if 'trade_date' in df.columns:
            df['trade_date'] = pd.to_datetime(df['trade_date'], errors='coerce')
        
        numeric_cols = ['open', 'high', 'low', 'close', 'volume', 'amount', 'pre_close']
        for col in numeric_cols:
            if col in df.columns:
                df[col] = pd.to_numeric(df[col], errors='coerce')
        
        # 删除适配或类型转换后产生的核心字段空值
        df.dropna(subset=['trade_date', 'code'], inplace=True)
        if df.empty:
            return df
        
        # --- 步骤 3: 数据清洗 ---
        # 为保证后续 `pct_change` 计算的准确性，确保数据按日期升序排列。
        df = df.sort_values('trade_date').reset_index(drop=True)

        # 3.1 移除核心字段的缺失值
        essential_cols = ['open', 'high', 'low', 'close', 'volume']
        df.dropna(subset=essential_cols, inplace=True)
        if df.empty:
            return df

        # 3.2 过滤无效的负数或零值
        df = df[
            (df['open'] > 0) &
            (df['high'] > 0) &
            (df['low'] > 0) &
            (df['close'] > 0) &
            (df['volume'] >= 0)  # 成交量可以为0
        ]
        if df.empty:
            return df

        # 3.3 过滤价格异常波动的记录
        if 'pre_close' in df.columns and df['pre_close'].notna().any():
            df['pct_change'] = (df['close'] / df['pre_close']) - 1
        else:
            df['pct_change'] = df['close'].pct_change()

        if pd.isna(df['pct_change'].iloc[0]):
            if df.loc[0, 'open'] > 0:
                df.loc[0, 'pct_change'] = (df.loc[0, 'close'] / df.loc[0, 'open']) - 1
        
        # 保留第一行及涨跌幅在正常范围内的行
        mask = (df['pct_change'].abs() <= 0.22) | (df.index == 0)
        df = df[mask]

        return df.drop(columns=['pct_change'], errors='ignore')