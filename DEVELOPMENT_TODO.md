# 量化交易系统开发待办清单 (DEVELOPMENT_TODO.md)

本文档是根据 `PROJECT_DESIGN.md` 设计的详细开发路线图。
**核心技术选型:** Python 3.10+, `asyncio` (异步核心), `SQLAlchemy 2.0[asyncio]` (数据库), `Pydantic` (数据模型), `Pandas` (数据处理)。
**设计灵感:** 借鉴 `vn.py` 的模块化和事件驱动思想，并全面升级为异步架构以追求更高性能。

---

## **重要编码约定：代码功能化与职责单一原则**

**为了确保项目的长期可维护性、可读性和可测试性，所有代码贡献都应遵循以下核心原则：**

*   **统一语言：中文优先 (Language: Chinese First):**
    *   **交流与文档:** 所有项目相关的交流、文档、注释、`git commit` 信息均应使用中文。
    *   **代码内字符串:** 代码中所有面向用户展示的日志信息、异常信息等字符串，必须使用中文。
    *   **目标:** 确保团队成员之间的沟通无障碍，代码和日志对中文母语者友好，降低理解成本。

*   **函数/方法职责单一 (Single Responsibility Principle):**
    *   一个函数或方法应该只做一件事情，并且把它做好。
    *   避免编写“万能”的、包含大量逻辑的超长函数。

*   **保持简短，提高可读性:**
    *   将复杂的流程拆解为一系列命名清晰、职责单一的辅助函数。
    *   主干逻辑函数的代码应该像一份高级伪代码，通过调用这些辅助函数，能清晰地展示出业务流程的各个步骤。读者仅通过阅读主干函数的方法名，就应该能理解整个流程在做什么。

*   **示例:**

    ```python
    # 不推荐 ❌: 一个冗长且难以阅读的函数
    async def process_market_data_file(file_path: str):
        # 1. 读取文件
        logger.info(f"开始处理文件: {file_path}")
        try:
            with open(file_path, 'r') as f:
                content = f.read()
        except Exception as e:
            logger.error("读取文件失败")
            return

        # 2. 解析数据
        lines = content.split('\n')
        data = []
        for line in lines:
            # ...复杂的解析逻辑...
            data.append(parsed_item)

        # 3. 清洗和转换
        df = pd.DataFrame(data)
        # ...复杂的数据清洗和转换逻辑...
        
        # 4. 存入数据库
        logger.info("开始写入数据库...")
        # ...直接在这里写数据库连接和插入逻辑...
        logger.info("数据处理完成。")

    # 推荐 ✅: 功能化、职责清晰的实现
    async def _read_data_from_file(file_path: str) -> str:
        """
        [职责1: 数据读取]
        专门负责从文件中安全地读取所有原始内容。
        - **封装IO操作**: 将文件读写的细节（如编码、异常处理）封装在此处。
        - **易于测试**: 可以通过模拟文件轻松测试此函数。
        """
        # ...具体的 aiofiles 读写实现细节...
        # ...包含详细的 try...except...finally 块来确保资源被释放...
        pass

    def _parse_raw_content(content: str) -> pd.DataFrame:
        """
        [职责2: 数据解析]
        将原始的、非结构化的字符串内容解析成结构化的 DataFrame。
        - **纯函数**: 它的输出完全由输入决定，不依赖任何外部状态（如文件、数据库）。
        - **极易测试**: 测试时只需传入不同的字符串，断言输出的 DataFrame 是否符合预期即可。
        """
        # ...具体的数据解析逻辑，例如按行分割、按分隔符切分、类型转换等...
        pass

    def _clean_and_transform_data(df: pd.DataFrame) -> pd.DataFrame:
        """
        [职责3: 业务处理]
        对已结构化的 DataFrame 进行数据清洗、计算新指标、转换格式等核心业务操作。
        - **封装业务逻辑**: 所有的数据处理规则都集中在这里，是业务的核心。
        - **可独立测试**: 可以创建一个小型的、包含各种边界情况的 DataFrame 来专门测试这里的逻辑是否正确。
        """
        # ...具体的业务逻辑，例如处理缺失值、计算均线、调整数据格式等...
        pass

    async def _save_data_to_db(df: pd.DataFrame):
        """
        [职责4: 数据存储]
        将最终处理好的 DataFrame 高效地存入数据库。
        - **封装数据库交互**: 将数据库的连接、批量插入等技术细节封装起来。
        - **可模拟 (Mock)**: 在测试主流程时，可以轻易地用一个假的（mock）函数替换掉它，从而避免了真实的数据库写入。
        """
        # ...调用已封装好的 bulk_insert_df 等高性能数据库操作...
        pass

    async def process_market_data_file(file_path: str):
        """
        [主流程编排器 (Orchestrator)]
        这个函数本身不执行任何具体的业务逻辑，它的唯一职责是“编排”和“调度”其他辅助函数。
        它的代码读起来就像一份任务清单，清晰地描述了完成整个任务需要哪几步。
        """
        try:
            # --- 步骤 0: 记录任务开始 ---
            # 提供清晰的日志跟踪，是良好可维护性的开端。
            logger.info(f"开始处理文件: {file_path}")

            # --- 步骤 1: 读取 ---
            # 调用职责单一的IO函数，只关心能否拿到原始数据。
            raw_content = await _read_data_from_file(file_path)

            # --- 步骤 2: 解析 ---
            # 将原始数据传递给解析函数，获得结构化数据。
            raw_df = _parse_raw_content(raw_content)

            # --- 步骤 3: 处理 ---
            # 将结构化数据传递给业务处理函数，获得最终结果。
            clean_df = _clean_and_transform_data(raw_df)

            # --- 步骤 4: 存储 ---
            # 将最终结果传递给存储函数，完成持久化。主流程不关心具体如何存储。
            await _save_data_to_db(clean_df)

            # --- 步骤 5: 记录任务成功 ---
            logger.info(f"文件处理成功: {file_path}")

        except Exception as e:
            # --- 统一的异常处理 ---
            # 任何一个步骤失败，都会在这里被捕获和记录。
            # 这使得核心流程更加健壮，错误处理逻辑集中在一处，而非散落在各处。
            logger.error(f"处理文件失败: {file_path}，错误: {e}", exc_info=True)

    ```

---

## 阶段 0: 项目初始化与环境搭建

*   ✅ **1. 创建项目结构:**
    *   按照 `SYSTEM_ARCHITECTURE.md` 中的最终目录结构，创建所有文件夹 (`core/`, `etl/`, `backtester/`, `execution/`, `tests/`)。
    *   创建 `pyproject.toml` 文件用于项目管理和依赖定义。

*   ✅ **2. 依赖安装与管理:**
    *   在 `pyproject.toml` 中定义核心依赖:
        *   `sqlalchemy[asyncpg]` - 异步ORM (使用PostgreSQL驱动)
        *   `alembic` - 数据库迁移工具
        *   `pandas` - 数据分析
        *   `numpy` - 高性能计算
        *   `pydantic` - 强类型数据模型
        *   `aiofiles` - 异步文件读写
        *   `pytest` & `pytest-asyncio` - 测试框架

*   ✅ **3. 配置与日志:**
    *   创建 `config.py` 或使用 `.env` 文件管理配置信息（数据库连接、API密钥等）。
    *   配置全局日志系统 (`logging` 模块)，确保所有模块的日志格式统一且能输出到文件和控制台。

---

## 阶段 1: 数据ETL层 (`etl/`) - 异步数据流水线 (详细拆分)

*   ✅ **任务 1.1: (结构对齐) 调整ETL目录结构**
    *   **目标**: 创建 `etl/storage`, `etl/data_loader`, `etl/processing`, `etl/scripts` 子目录，使之与设计规划一致。

*   ✅ **任务 1.2: (数据库层重构) 迁移并重构数据库逻辑**
    *   **文件**: `etl/storage/models.py`, `etl/storage/database.py`
    *   **目标**: 
        1.  在 `models.py` 中使用 SQLAlchemy ORM 定义数据表基类。
        2.  在 `database.py` 中实现数据库引擎管理和高性能的 `bulk_insert_df` 函数。
        3.  删除旧的根目录 `storage/`。
    *   **产出**: 一个独立的、符合设计规范的数据存储层。

*   ✅ **任务 1.3: (数据加载层重构) 拆分并重构数据源**
    *   **文件**: `etl/data_loader/base.py`, `etl/data_loader/csv_loader.py`
    *   **目标**:
        1.  在 `base.py` 中定义统一的、内置生产者-消费者模式的 `BaseLoader` 抽象接口。✅
        2.  基于新的 `BaseLoader` 实现一个功能强大且内存安全的 `CsvLoader`。✅
        3.  为 `CsvLoader` 编写完整的单元测试。✅
    *   **产出**: 一套可扩展、职责清晰、内置并发与内存安全的数据加载器框架，以及一个健壮的 `CsvLoader` 实现。

*   ✅ **任务 1.4: (核心逻辑重构) 引入管道与处理器模式**
    *   **文件**: `etl/processing/handlers.py`, `etl/processing/pipeline.py`
    *   **目标**: 
        1.  在 `handlers.py` 中将ETL的各个步骤实现为独立的、可测试的异步函数 (`Handler`)。
        2.  在 `pipeline.py` 中创建一个 `Pipeline` 类，作为 `Handler` 的编排器，负责管理单个数据单元的处理流程。
        3.  删除旧的 `etl/executor.py`。
    *   **产出**: 一个灵活、可编排、职责清晰的ETL核心处理引擎。
    *   **架构设计与并行化策略 (V2.0 - 讨论共识):**
        *   **核心理念：** 严格分离逻辑编排与执行调度，以实现高度解耦和可扩展性。
        *   **组件职责定义:**
            *   **`Loader` (ETL之'E'):** 数据加载器。职责是发现数据源（`get_sources`）并将其加载为内存对象（`load_one_source` -> DataFrame）。
            *   **`Handler` (处理环节):** 处理器。职责是完成数据处理流程中的一个具体、单一的步骤（如转换数据、计算指标等）。`Handler` 是可复用的原子操作。
            *   **`Pipeline` (ETL之'T'):** 逻辑管道/编排器。职责是串联多个 `Handler`，定义它们的执行顺序和数据流。`Pipeline` 接收一个 **DataFrame**，然后将其依次传递给内部的 `Handler` 链进行处理。它工作在**单个进程**的 `asyncio` 事件循环中，自身不感知多进程。
            *   **`Persistence Service` (持久化服务):** 独立的数据存储服务层 (位于 `etl/storage/`)。它封装了所有底层数据库或文件的读写操作（如 `bulk_insert_df`）。它可以被任何 `Handler` 在 `Pipeline` 流程的任何阶段按需调用，例如在流程末端保存最终结果，或在中间步骤读写检查点/辅助数据。
            *   **`Scheduler` (ETL之'L'与调度器):** 顶层调度器 (位于 `etl/scripts/run_etl.py`)。职责是连接所有组件并驱动整个ETL过程。**它是实现多进程并行化的核心**。
    *   **多进程并行模式:**
        1.  **启动:** `Scheduler` 是程序入口。
        2.  **发现:** `Scheduler` 调用 `Loader.get_sources()` 获取所有待处理的数据源标识（例如1000个文件路径）。
        3.  **分发:** `Scheduler` 将获取到的文件路径列表**分发**给池中的多个工作进程 (Ray Worker)。
        4.  **执行:** **每个独立的工作进程**都会接收到一部分文件路径。对于每个路径，工作进程会：
            *   **加载:** 调用 `loader.load_one_source(path)` 将数据加载为 DataFrame。
            *   **处理:** 实例化一个 `Pipeline` 对象，并调用 `pipeline.run(df)` 来执行后续的处理和保存逻辑。
        5.  **总结:** 这种模式下，`Pipeline` 专注于处理内存中的 DataFrame，完全解耦了数据来源（无论是CSV、API还是数据库）。`Loader` 负责将异构数据源标准化为 DataFrame。

*   ✅ **任务 1.5: (执行脚本重构) 迁移并更新ETL入口**
    *   **文件**: `etl/scripts/run_etl.py`
    *   **目标**: 
        1.  将ETL执行脚本移动到 `etl/scripts/` 目录。
        2.  重写脚本，使其通过命令行参数调用 `Pipeline` 来执行不同的ETL任务。
        3.  删除根目录下旧的 `run_etl.py`。
    *   **产出**: 一个现代化的、可通过命令行驱动的ETL执行脚本。

*   ✅ **任务 1.6: (数据库迁移) 初始化数据库版本控制**
    *   **目标**: 使用 `alembic` 初始化数据库迁移环境。创建第一个迁移脚本，将 `models.py` 中定义的模型应用到数据库中，生成所有表格。

*   ✅ **任务 1.7: (健壮性) 实现ETL幂等性**
    *   **文件**: `etl/storage/models.py`, `etl/scripts/run_etl.py`
    *   **目标**: 
        1.  根据设计文档，实现幂等性检查，避免重复计算。
        2.  在 `models.py` 中新增 `etl_metadata` 表，用于记录数据源的哈希值或最后更新时间。
        3.  在ETL执行脚本中，增加前置检查逻辑：在处理前，比对数据源摘要与 `metadata` 表中的记录。
        4.  仅当数据源发生变化时才执行ETL流程，成功后更新 `metadata` 表。
        5.  添加 `--force` 命令行参数，用于绕过检查，强制执行。

*   ✅ **任务 1.8: (性能优化) 完成ETL调度器架构升级**
    *   **目标**: 
        1.  **并行处理**: 放弃原有的 `multiprocessing` 构想，全面升级调度器 `etl/scheduler.py` 以使用更先进的 `Ray` 框架。利用其内置的共享内存机制，高效处理跨进程的数据传输，解决了大型DataFrame序列化的性能瓶颈。
        2.  **动态调度**: 在调度器中实现了动态任务排序策略。默认策略会智能检测任务是否为文件，并按文件大小从小到大排序，优先处理小任务，显著提高了多核CPU的整体利用率。该排序逻辑被设计为可插拔的策略模式，支持未来按需自定义。
        3.  **计算加速**: 明确了 `Numba` 的应用场景。它不属于调度器层面的宏观优化，而是针对 `Pipeline` 中具体 `Handler` 的微观计算加速。开发者在实现计算密集的因子时，可按需在 `Handler` 内部应用 Numba。
    *   **产出**: 一个性能更高、调度更智能、架构更灵活的ETL调度核心。

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
