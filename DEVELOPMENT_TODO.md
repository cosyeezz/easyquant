# 量化交易系统开发待办清单 (DEVELOPMENT_TODO.md)

本文档是根据 `PROJECT_DESIGN.md` 设计的详细开发路线图。
**核心技术选型:** Python 3.10+, `asyncio` (异步核心), `SQLAlchemy 2.0[asyncio]` (数据库), `Pydantic` (数据模型), `Pandas` (数据处理)。
**设计灵感:** 借鉴 `vn.py` 的模块化和事件驱动思想，并全面升级为异步架构以追求更高性能。

---

## 阶段 0: 项目初始化与环境搭建

*   [ ] **1. 创建项目结构:**
    *   按照 `SYSTEM_ARCHITECTURE.md` 中的最终目录结构，创建所有文件夹 (`core/`, `etl/`, `backtester/`, `execution/`, `tests/`)。
    *   创建 `pyproject.toml` 文件用于项目管理和依赖定义。

*   [ ] **2. 依赖安装与管理:**
    *   在 `pyproject.toml` 中定义核心依赖:
        *   `sqlalchemy[asyncpg]` - 异步ORM (使用PostgreSQL驱动)
        *   `alembic` - 数据库迁移工具
        *   `pandas` - 数据分析
        *   `numpy` - 高性能计算
        *   `pydantic` - 强类型数据模型
        *   `aiofiles` - 异步文件读写
        *   `pytest` & `pytest-asyncio` - 测试框架

*   [ ] **3. 配置与日志:**
    *   创建 `config.py` 或使用 `.env` 文件管理配置信息（数据库连接、API密钥等）。
    *   配置全局日志系统 (`logging` 模块)，确保所有模块的日志格式统一且能输出到文件和控制台。

---

## 阶段 1: 数据ETL层 (`etl/`) - 异步数据流水线

*   [ ] **1. (Storage) 数据库模型定义:**
    *   **任务:** 在 `etl/storage/models.py` 中，使用 SQLAlchemy 2.0 的声明式ORM，定义所有数据表 (`stock_info`, `trade_calendar`, `stock_daily_basic`, `factor_technical` 等) 的异步模型。
    *   **灵感:** 摒弃 `create_table.sql`，用Python模型类来管理表结构，更易于维护和代码集成。所有表都应包含 `created_at` 和 `updated_at` 时间戳字段。

*   [ ] **2. (Storage) 数据库迁移初始化:**
    *   **任务:** 使用 `alembic` 初始化数据库迁移环境。创建第一个迁移脚本，将步骤1中定义的模型应用到数据库中，生成所有表格。

*   [ ] **3. (Data Loader) 异步数据加载器:**
    *   **任务:** 在 `etl/data_loader/` 中，创建一个抽象基类 `BaseLoader`，定义 `async def load(self) -> pd.DataFrame:` 接口。
    *   **任务:** 实现一个 `CsvLoader`，继承 `BaseLoader`，使用 `aiofiles` 和 `pandas` 异步地从CSV文件夹中高效读取数据。

*   [ ] **4. (Processing) 异步处理器与管道:**
    *   **任务:** 在 `etl/processing/handlers.py` 中，定义一系列独立的、可测试的 **`async def`** 处理器函数。例如: `async def handle_adjust_factors(context: dict) -> dict:`。
    *   **任务:** 在 `etl/processing/pipeline.py` 中，创建一个 `Pipeline` 类，其可以注册一系列处理器，并提供一个 `async def run(self, context: dict)` 方法来按顺序 `await` 执行它们。

*   [ ] **5. (Storage) 高性能异步入库:**
    *   **任务:** 在 `etl/storage/database.py` 中，实现一个核心函数 `async def bulk_insert_df(...)`。
    *   **灵感:** 借鉴 `vn.py` 对性能的追求，但用异步方式实现。严禁逐行INSERT。应将DataFrame转为内存中的CSV格式 (`io.StringIO`)，然后使用数据库驱动的 `COPY` 命令（如 `asyncpg` 的 `copy_records_to_table`）进行最高性能的批量入库。

*   [ ] **6. (Scripts) ETL执行脚本:**
    *   **任务:** 创建 `etl/scripts/run_etl.py`。该脚本负责初始化 `Pipeline`，调用 `CsvLoader` 加载数据，运行管道处理，最后调用高性能入库函数。
    *   **任务:** 使用 `argparse` 添加 `--force` 等命令行参数，用于控制是否执行幂等性检查。

---

## 阶段 2: 核心框架 (`core/`) - 异步事件驱动引擎

*   [ ] **1. (Data Structures) 强类型事件定义:**
    *   **任务:** 在 `core/event.py` 中，定义一个基类 `Event`。
    *   **任务:** 使用 `pydantic.BaseModel` 定义所有具体的事件类型，如 `TimerEvent`, `MarketDataEvent`, `OrderEvent`, `FillEvent`。
    *   **灵感:** 这是对 `vn.py` 的重大改进。使用 Pydantic 能确保所有在事件总线上传递的数据都是结构化和类型安全的，能避免大量运行时错误。

*   [ ] **2. (Engine) 异步事件引擎 `EventEngine`:**
    *   **任务:** 在 `core/engine.py` 中，创建 `EventEngine` 类。
    *   **灵感:** 将 `vn.py` 基于 `threading.Thread` 和 `queue.Queue` 的设计，完全重构为基于 `asyncio` 的现代版本。
        *   使用 `asyncio.Queue` 作为内部事件队列。
        *   主循环是一个 `async def _run(self)` 的异步任务，通过 `await self._queue.get()` 获取事件。
        *   定时器是一个独立的 `async def _run_timer(self)` 异步任务，使用 `await asyncio.sleep()`。
        *   `start()` 方法使用 `asyncio.create_task()` 来启动上述两个任务。
        *   处理器 `handler` 可以是同步函数，也可以是 `async` 异步函数，引擎在调用时需要做判断 (`inspect.iscoroutinefunction`)。

---

## 阶段 3: 回测模块 (`backtester/`) - 系统的首次应用

*   [ ] **1. (Data Source) 历史数据源:**
    *   **任务:** 创建 `backtester/data_source.py`。它负责连接数据库，异步地读取历史行情数据，并按时间戳顺序，**尽快地**将数据包装成 `MarketDataEvent` 放入 `EventEngine` 的队列。
    *   **注意:** 回测时，数据源不应有 `asyncio.sleep`，目标是让CPU跑满，以最快速度完成回测。

*   [ ] **2. (Strategy) 策略基类:**
    *   **任务:** 在 `core/strategy.py` 中定义 `StrategyBase` 抽象基类。提供 `on_bar`, `on_tick`, `send_order`, `cancel_order` 等核心方法。
    *   **任务:** 策略实例在初始化时，会自动向 `EventEngine` 注册自己的处理函数（如 `self.on_bar`）。

*   [ ] **3. (Execution) 模拟执行器:**
    *   **任务:** 创建 `backtester/execution.py`。该模块订阅 `OrderEvent`，根据当前行情数据、滑点和手续费模型，模拟订单成交，然后产生 `FillEvent`。

*   [ ] **4. (Portfolio & Performance) 组合与业绩:**
    *   **任务:** 在 `core/portfolio.py` 中创建 `PortfolioManager`，订阅 `FillEvent` 来更新持仓、资金等状态。
    *   **任务:** 在 `backtester/performance.py` 中创建 `PerformanceCalculator`，订阅 `FillEvent` 来计算资金曲线、夏普比率、最大回撤等指标，并在回测结束后生成业绩报告。

*   [ ] **5. (Runner) 回测主程序:**
    *   **任务:** 创建 `backtester/runner.py`。这是串联所有回测组件的入口。它负责：
        1.  初始化 `EventEngine`。
        2.  初始化数据源、策略、执行器、组合管理器等。
        3.  将所有模块的处理器注册到引擎中。
        4.  启动引擎和数据源，等待回测完成。
        5.  调用业绩分析模块生成报告。

---

## 阶段 4: 实盘交易 (`execution/`) - 对接真实世界

*   [ ] **1. 交易接口网关 (`Gateway`):**
    *   **任务:** 在 `core/gateway.py` 中定义抽象的 `GatewayBase` 类，包含连接、下单、撤单、查询等异步接口 (`async def send_order(...)`)。
    *   **灵感:** 完全借鉴 `vn.py` 的网关设计，这是隔离不同券商接口的最佳实践。
    *   **任务:** 在 `execution/` 目录下，实现一个具体的网关，如 `execution/qmt_gateway.py`，继承 `GatewayBase` 并对接QMT的API。

*   [ ] **2. 实盘数据源与执行器:**
    *   **任务:** 实盘数据源和执行器的逻辑将被封装在具体的 `Gateway` 实现中。`Gateway` 会从券商API接收实时行情和成交回报，并将它们转化为系统标准的 `MarketDataEvent` 和 `FillEvent`，放入 `EventEngine`。

*   [ ] **3. 实盘主程序:**
    *   **任务:** 创建 `execution/runner.py`，其结构与回测的 `runner` 类似，但加载的是真实的 `Gateway` 而不是模拟组件。

---

## 阶段 5: 测试层 (`tests/`) - 保证系统质量

*   [ ] **1. 单元测试:**
    *   **任务:** 为所有无状态的、纯计算逻辑的函数编写单元测试。特别是 `etl/processing` 中的处理器函数和 `backtester/performance` 中的指标计算函数。

*   [ ] **2. 集成测试:**
    *   **任务:** 构建小型的端到端测试。例如，用一个迷你的CSV文件，完整地跑通ETL流程，并验证数据是否正确写入测试数据库。
    *   **任务:** 构建一个迷你的回测集成测试，使用一个简单的策略，跑完流程后验证最终的持仓和盈亏是否符合预期。
