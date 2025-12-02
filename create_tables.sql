-- 删除已存在的表，以确保一个干净的开始
DROP TABLE IF EXISTS public.etl_metadata CASCADE;
DROP TABLE IF EXISTS public.stock_minute CASCADE;
DROP TABLE IF EXISTS public.stock_daily CASCADE;

-- 1. 创建日线行情表 (stock_daily)
-- 用于存储股票每日的行情数据。
-- 主键是股票代码 (code) 和交易日期 (trade_date) 的复合主键。
CREATE TABLE public.stock_daily (
    open NUMERIC(10, 2),                                      -- 开盘价
    high NUMERIC(10, 2),                                      -- 最高价
    low NUMERIC(10, 2),                                       -- 最低价
    close NUMERIC(10, 2),                                     -- 收盘价
    pre_close NUMERIC(10, 2),                                 -- 前收盘价
    volume NUMERIC(20, 2),                                    -- 成交量
    amount NUMERIC(20, 2),                                    -- 成交额
    name VARCHAR(50),                                         -- 股票名称
    circulation_market_value NUMERIC(20, 2),                  -- 流通市值
    total_market_value NUMERIC(20, 2),                        -- 总市值
    pct_change NUMERIC(10, 6),                                -- 涨跌幅
    turnover_rate NUMERIC(10, 6),                             -- 换手率
    avg_price NUMERIC(10, 2),                                 -- 均价
    trading_days INTEGER,                                     -- 上市至今交易天数
    created_at TIMESTAMP WITHOUT TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP, -- 记录创建时间
    updated_at TIMESTAMP WITHOUT TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP, -- 记录更新时间
    code VARCHAR(15) NOT NULL,                                -- 股票代码
    trade_date DATE NOT NULL,                                 -- 交易日期
    PRIMARY KEY (code, trade_date)
);

-- 为 stock_daily 表的列添加注释
COMMENT ON COLUMN public.stock_daily.open IS '开盘价';
COMMENT ON COLUMN public.stock_daily.high IS '最高价';
COMMENT ON COLUMN public.stock_daily.low IS '最低价';
COMMENT ON COLUMN public.stock_daily.close IS '收盘价';
COMMENT ON COLUMN public.stock_daily.pre_close IS '前收盘价';
COMMENT ON COLUMN public.stock_daily.volume IS '成交量';
COMMENT ON COLUMN public.stock_daily.amount IS '成交额';
COMMENT ON COLUMN public.stock_daily.name IS '股票名称';
COMMENT ON COLUMN public.stock_daily.circulation_market_value IS '流通市值';
COMMENT ON COLUMN public.stock_daily.total_market_value IS '总市值';
COMMENT ON COLUMN public.stock_daily.pct_change IS '涨跌幅';
COMMENT ON COLUMN public.stock_daily.turnover_rate IS '换手率';
COMMENT ON COLUMN public.stock_daily.avg_price IS '均价';
COMMENT ON COLUMN public.stock_daily.trading_days IS '上市至今交易天数';
COMMENT ON COLUMN public.stock_daily.created_at IS '记录创建时间';
COMMENT ON COLUMN public.stock_daily.updated_at IS '记录更新时间';
COMMENT ON COLUMN public.stock_daily.code IS '股票代码';
COMMENT ON COLUMN public.stock_daily.trade_date IS '交易日期';


-- 2. 创建分钟线行情表 (stock_minute)
-- 用于存储股票每分钟的行情数据。
-- 主键是股票代码 (code)、交易日期 (trade_date) 和时间 (time) 的复合主键。
CREATE TABLE public.stock_minute (
    open NUMERIC(10, 2),                                      -- 开盘价
    high NUMERIC(10, 2),                                      -- 最高价
    low NUMERIC(10, 2),                                       -- 最低价
    close NUMERIC(10, 2),                                     -- 收盘价
    volume NUMERIC(20, 2),                                    -- 成交量
    amount NUMERIC(20, 2),                                    -- 成交额
    created_at TIMESTAMP WITHOUT TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP, -- 记录创建时间
    updated_at TIMESTAMP WITHOUT TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP, -- 记录更新时间
    code VARCHAR(15) NOT NULL,                                -- 股票代码
    trade_date DATE NOT NULL,                                 -- 交易日期
    "time" TIME WITHOUT TIME ZONE NOT NULL,                   -- 交易时间 (时分秒)
    PRIMARY KEY (code, trade_date, "time")
);

-- 为 stock_minute 表的列添加注释
COMMENT ON COLUMN public.stock_minute.open IS '开盘价';
COMMENT ON COLUMN public.stock_minute.high IS '最高价';
COMMENT ON COLUMN public.stock_minute.low IS '最低价';
COMMENT ON COLUMN public.stock_minute.close IS '收盘价';
COMMENT ON COLUMN public.stock_minute.volume IS '成交量';
COMMENT ON COLUMN public.stock_minute.amount IS '成交额';
COMMENT ON COLUMN public.stock_minute.created_at IS '记录创建时间';
COMMENT ON COLUMN public.stock_minute.updated_at IS '记录更新时间';
COMMENT ON COLUMN public.stock_minute.code IS '股票代码';
COMMENT ON COLUMN public.stock_minute.trade_date IS '交易日期';
COMMENT ON COLUMN public.stock_minute."time" IS '交易时间 (时分秒)';


-- 3. 创建ETL元数据表 (etl_metadata)
-- 用于实现ETL过程的幂等性，记录每个数据源的处理状态和内容哈希。
-- id 是自增主键，source_identifier 上有唯一约束以确保每个数据源只有一条记录。
CREATE TABLE public.etl_metadata (
    id SERIAL PRIMARY KEY,
    source_identifier VARCHAR NOT NULL,
    source_hash VARCHAR NOT NULL,
    status VARCHAR NOT NULL,
    processed_at TIMESTAMP WITHOUT TIME ZONE,
    UNIQUE (source_identifier)
);
