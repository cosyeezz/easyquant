import pandas as pd
import numpy as np
from etl.processing.base import BaseHandler


class CleanDataHandler(BaseHandler):
    """
    通用数据清洗处理器 (CleanDataHandler)

    **设计思想**:
    根据ETL架构的职责分离原则，Cleaner的唯一职责是对已经标准化的数据
    进行清洗、验证和衍生指标计算。它假设输入的DataFrame已经过Adapter
    处理，使用统一的标准列名。

    **核心职责**:
    1. **数据类型转换**: 将字段转换为正确的类型（日期、数值等）
    2. **数据验证**: 移除无效数据（空值、负值、异常值等）
    3. **衍生指标计算**: 计算涨跌幅、换手率、均价、交易天数等
    4. **异常过滤**: 根据不同板块的涨跌停规则过滤异常波动
    5. **退市处理**: 正确处理退市股票的数据截断

    **主要清洗步骤**:
    1. 数据类型转换和排序
    2. 移除核心字段缺失值
    3. 过滤无效的负数或零值
    4. 计算衍生指标（涨跌幅、换手率、均价、交易天数）
    5. 过滤价格异常波动（根据板块动态阈值）：
       - 普通股票: 10% (ST股票: 5%)
       - 科创板(sh68)和创业板(sz30, 2020年8月24日后): 20%
       - 北交所(bj): 30%
    6. 处理退市股票数据

    **使用场景**:
    在ETL Pipeline中，此处理器位于Adapter之后、Saver之前：
    Pipeline.create([
        CsvAdapterHandler(),      # 第一步：适配列名
        CleanDataHandler(),       # 第二步：清洗数据（本处理器）
        SaveDailyDataHandler(),   # 第三步：保存数据
    ])

    **输入要求**:
    - DataFrame必须已经过Adapter处理，使用标准英文列名
    - 必需字段：trade_date, code, open, high, low, close, volume

    **输出保证**:
    - 所有必需字段均为有效值（非空、正数）
    - 包含衍生字段：pct_change, turnover_rate, avg_price, trading_days
    - 数据按trade_date升序排列
    """

    async def handle(self, df: pd.DataFrame) -> pd.DataFrame:
        """
        对标准格式的DataFrame执行清洗操作。

        :param df: 已经过Adapter处理的标准格式DataFrame
        :return: 清洗后的DataFrame，包含衍生指标
        """
        if df.empty:
            return df

        # --- 步骤 1: 数据类型转换 ---
        if 'trade_date' in df.columns:
            df['trade_date'] = pd.to_datetime(df['trade_date'], errors='coerce')

        numeric_cols = ['open', 'high', 'low', 'close', 'volume', 'amount', 'pre_close',
                       'circulation_market_value', 'total_market_value']
        for col in numeric_cols:
            if col in df.columns:
                df[col] = pd.to_numeric(df[col], errors='coerce')

        # 删除核心标识字段的空值
        essential_identifier_cols = ['trade_date', 'code']
        df.dropna(subset=essential_identifier_cols, inplace=True)
        if df.empty:
            return df

        # 按日期升序排列，确保时间序列计算正确
        df = df.sort_values('trade_date').reset_index(drop=True)

        # --- 步骤 2: 移除核心价格字段的缺失值 ---
        essential_price_cols = ['open', 'high', 'low', 'close', 'volume']
        df.dropna(subset=essential_price_cols, inplace=True)
        if df.empty:
            return df

        # --- 步骤 3: 过滤无效的负数或零值 ---
        df = df[
            (df['open'] > 0) &
            (df['high'] > 0) &
            (df['low'] > 0) &
            (df['close'] > 0) &
            (df['volume'] >= 0)  # 成交量可以为0（停牌等情况）
        ]
        if df.empty:
            return df

        # --- 步骤 4: 计算衍生指标 ---

        # 4.1 计算涨跌幅
        if 'pre_close' in df.columns and df['pre_close'].notna().any():
            # 使用前收盘价计算，避免除以0
            df['pct_change'] = np.where(
                df['pre_close'] > 0,
                (df['close'] / df['pre_close']) - 1,
                0
            )
        else:
            # 如果没有前收盘价，使用pct_change计算
            df['pct_change'] = df['close'].pct_change().fillna(0)

        # 第一天如果没有前收盘价，使用开盘价计算
        if len(df) > 0 and (pd.isna(df['pct_change'].iloc[0]) or df['pct_change'].iloc[0] == 0):
            if df.loc[0, 'open'] > 0:
                df.loc[0, 'pct_change'] = (df.loc[0, 'close'] / df.loc[0, 'open']) - 1

        # 4.2 计算换手率（成交额/流通市值）
        if 'amount' in df.columns and 'circulation_market_value' in df.columns:
            df['turnover_rate'] = np.where(
                df['circulation_market_value'] > 0,
                df['amount'] / df['circulation_market_value'],
                0
            )

        # 4.3 计算均价（成交额/成交量）
        if 'amount' in df.columns and 'volume' in df.columns:
            df['avg_price'] = np.where(
                df['volume'] > 0,
                df['amount'] / df['volume'],
                df['close']  # 成交量为0时用收盘价
            )

        # 4.4 计算上市至今交易天数
        df['trading_days'] = (df.index + 1).astype(int)

        # --- 步骤 5: 过滤价格异常波动 ---
        # 根据不同板块设置不同的涨跌停阈值
        df['price_limit_threshold'] = 0.10  # 默认普通股票10%

        if 'code' in df.columns:
            # 北交所: 30%
            mask_bj = df['code'].str.startswith('bj', na=False)
            df.loc[mask_bj, 'price_limit_threshold'] = 0.30

            # 科创板: 20%
            mask_kcb = df['code'].str.startswith('sh68', na=False)
            df.loc[mask_kcb, 'price_limit_threshold'] = 0.20

            # 创业板: 2020年8月24日后为20%
            mask_cyb = df['code'].str.startswith('sz30', na=False)
            mask_new_cyb = mask_cyb & (df['trade_date'] > pd.to_datetime('2020-08-23'))
            df.loc[mask_new_cyb, 'price_limit_threshold'] = 0.20

        # ST股票: 5%（除科创板和创业板外）
        if 'name' in df.columns:
            mask_st = df['name'].str.contains('ST', na=False)
            mask_not_kcb_cyb = ~(mask_kcb | mask_new_cyb) if 'mask_kcb' in locals() and 'mask_new_cyb' in locals() else True
            df.loc[mask_st & mask_not_kcb_cyb, 'price_limit_threshold'] = 0.05

        # 保留第一行及涨跌幅在正常范围内的行
        # 允许略微超过涨跌停阈值（+2%容错），因为某些特殊情况下可能会略超
        mask = (df['pct_change'].abs() <= df['price_limit_threshold'] + 0.02) | (df.index == 0)
        df = df[mask]

        # --- 步骤 6: 处理退市股票 ---
        if df.empty:
            return df

        if 'name' in df.columns and 'amount' in df.columns:
            last_name = df['name'].iloc[-1]
            if '退' in last_name or 'S' in last_name:
                # 检查最后一天是否有成交额
                if df['amount'].iloc[-1] == 0:
                    # 如果整个股票都没有成交额，返回空
                    if (df['amount'] == 0).all():
                        return pd.DataFrame(columns=df.columns)

                    # 找到最后一个有成交额的日期
                    df_tmp = df[(df['amount'] != 0) & (df['amount'].shift(-1) == 0)]
                    if not df_tmp.empty:
                        end_date = df_tmp.iloc[-1]['trade_date']
                        df = df[df['trade_date'] <= end_date]

        # 删除临时列
        df = df.drop(columns=['price_limit_threshold'], errors='ignore')

        return df
