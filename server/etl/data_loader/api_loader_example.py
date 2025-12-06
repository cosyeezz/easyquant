# server/etl/data_loader/api_loader_example.py

import asyncio
import time
import pandas as pd
import random
from typing import List, Tuple, Any

from .base import BaseLoader, logger

# --- 模拟一个第三方的、同步阻塞的SDK ---
class SynchronousQMTClient:
    """
    这是一个模拟的QMT客户端SDK。
    它的方法是同步的(def)，调用时会阻塞当前线程。
    """
    def __init__(self, api_key: str):
        logger.info(f"同步客户端已连接 (API Key: ...{api_key[-4:]})")
        # 模拟一些需要时间的初始化
        time.sleep(0.1)

    def get_daily_bars(self, symbol: str, start_date: str, end_date: str) -> pd.DataFrame:
        """一个同步的、会阻塞的方法，模拟从API获取数据"""
        logger.debug(f"开始同步获取 {symbol} 从 {start_date} 到 {end_date} 的数据...")
        
        # 模拟网络延迟和处理时间
        sleep_time = random.uniform(0.1, 0.5)
        time.sleep(sleep_time)
        
        # 模拟API可能返回失败
        if random.random() < 0.05:
            raise ConnectionError(f"获取 {symbol} 数据时发生随机网络错误")

        # 生成模拟数据
        date_range = pd.date_range(start=start_date, end=end_date, freq='D')
        data = {
            'open': [100 + i + random.uniform(-1, 1) for i in range(len(date_range))],
            'high': [101 + i + random.uniform(-1, 1) for i in range(len(date_range))],
            'low': [99 + i + random.uniform(-1, 1) for i in range(len(date_range))],
            'close': [100.5 + i + random.uniform(-1, 1) for i in range(len(date_range))],
            'volume': [1000000 + random.randint(-100000, 100000) for _ in range(len(date_range))]
        }
        df = pd.DataFrame(data, index=date_range)
        df['symbol'] = symbol
        
        logger.debug(f"成功获取 {symbol} 的数据，共 {len(df)} 条")
        return df

# --- 使用 BaseLoader 实现 QMT 加载器 ---

class QMTDataLoader(BaseLoader):
    """
    一个从QMT API加载数据的具体实现。
    它演示了如何在异步框架中安全地使用同步SDK。
    """
    def __init__(self, api_key: str, symbols: List[str], start_date: str, end_date: str):
        super().__init__(max_queue_size=50)
        
        # 实例化同步客户端
        self.sync_client = SynchronousQMTClient(api_key=api_key)
        self.symbols = symbols
        self.start_date = start_date
        self.end_date = end_date

    async def _get_sources(self) -> List[str]:
        """数据源就是我们要查询的股票代码列表"""
        return self.symbols

    async def _load_one_source(self, source: str) -> pd.DataFrame:
        """
        核心优化点：使用基类提供的 run_sync 辅助方法将同步阻塞代码放入线程池执行。
        """
        symbol = source
        try:
            # 使用 self.run_sync 来代替 loop.run_in_executor
            df = await self.run_sync(
                self.sync_client.get_daily_bars, 
                symbol, 
                self.start_date, 
                self.end_date
            )
            return df
        except Exception as e:
            logger.error(f"在线程池中加载 {symbol} 失败: {e}", exc_info=False) # exc_info=False避免刷屏
            # 返回空DataFrame，让框架优雅地处理失败
            return pd.DataFrame()

# --- 使用示例 ---
async def main():
    """演示如何使用 QMTDataLoader"""
    logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(levelname)s - %(message)s')
    
    logger.info("开始演示 QMTDataLoader...")
    
    symbols_to_load = [f'STOCK_{i:03d}' for i in range(25)]
    
    qmt_loader = QMTDataLoader(
        api_key="your_secret_api_key",
        symbols=symbols_to_load,
        start_date="2023-01-01",
        end_date="2023-01-31"
    )

    # 使用 stream 方法高效处理数据
    processed_count = 0
    async for source, df in qmt_loader.stream():
        logger.info(f"消费者接收到数据: {source}, 行数: {len(df)}, DataFrame内存: {df.memory_usage(deep=True).sum() / 1024:.2f} KB")
        processed_count += 1
        # 在这里可以接上数据清洗、入库等步骤...
        
    logger.info(f"流式处理完成！共处理了 {processed_count} 个数据源。")

if __name__ == "__main__":
    asyncio.run(main())
