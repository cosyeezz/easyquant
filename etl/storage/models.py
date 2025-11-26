from sqlalchemy import (
    create_engine,
    MetaData,
    Table,
    Column,
    BigInteger,
    String,
    Date,
    DECIMAL,
    Boolean,
    UniqueConstraint,
    Index,
)
from sqlalchemy.orm import declarative_base

# 创建所有模型共享的声明式基类
Base = declarative_base()

class StockDailyData(Base):
    """
    股票日度数据 ORM 模型
    """
    __tablename__ = 'stock_daily_data'

    id = Column(BigInteger, primary_key=True, autoincrement=True, comment='自增ID')
    
    # 基础信息
    stock_code = Column(String(10), nullable=False, comment='股票代码')
    stock_name = Column(String(50), comment='股票名称')
    trade_date = Column(Date, nullable=False, comment='交易日期')

    # 行情数据
    open_price = Column(DECIMAL(18, 4), comment='开盘价')
    high_price = Column(DECIMAL(18, 4), comment='最高价')
    low_price = Column(DECIMAL(18, 4), comment='最低价')
    close_price = Column(DECIMAL(18, 4), comment='收盘价')
    prev_close_price = Column(DECIMAL(18, 4), comment='前收盘价')
    volume = Column(BigInteger, comment='成交量(股)')
    amount = Column(DECIMAL(20, 4), comment='成交额(元)')

    # 预处理数据
    open_price_fq = Column(DECIMAL(18, 4), comment='后复权开盘价')
    high_price_fq = Column(DECIMAL(18, 4), comment='后复权最高价')
    low_price_fq = Column(DECIMAL(18, 4), comment='后复权最低价')
    close_price_fq = Column(DECIMAL(18, 4), comment='后复权收盘价')
    fq_factor = Column(DECIMAL(20, 10), comment='后复权因子')
    zt_price = Column(DECIMAL(18, 4), comment='涨停价')
    dt_price = Column(DECIMAL(18, 4), comment='跌停价')
    is_one_word_zt = Column(Boolean, comment='是否一字涨停')
    is_one_word_dt = Column(Boolean, comment='是否一字跌停')
    is_open_zt = Column(Boolean, comment='是否开盘涨停')
    is_open_dt = Column(Boolean, comment='是否开盘跌停')
    is_trading = Column(Boolean, comment='是否交易 (1:是, 0:否)')

    # 市值与估值
    circulating_market_cap = Column(DECIMAL(20, 4), comment='流通市值')
    total_market_cap = Column(DECIMAL(20, 4), comment='总市值')
    net_profit_ttm = Column(DECIMAL(20, 4), comment='净利润TTM')
    cash_flow_ttm = Column(DECIMAL(20, 4), comment='现金流TTM')
    net_assets = Column(DECIMAL(20, 4), comment='净资产')
    total_assets = Column(DECIMAL(20, 4), comment='总资产')
    total_liabilities = Column(DECIMAL(20, 4), comment='总负债')
    net_profit_quarter = Column(DECIMAL(20, 4), comment='净利润(当季)')

    # ... 其他字段可以按照同样的方式添加 ...

    # 主键与索引
    __table_args__ = (
        UniqueConstraint('stock_code', 'trade_date', name='uk_stock_date'),
        Index('idx_trade_date', 'trade_date'),
    )

    def __repr__(self):
        return f"<StockDailyData(stock_code='{self.stock_code}', trade_date='{self.trade_date}')>"
