# EasyQuant ETL 模块文档

## 1. 概述

ETL (Extract, Transform, Load) 模块是 EasyQuant 系统的核心数据处理引擎。它负责从各种数据源（如 CSV 文件、API）提取原始数据，经过清洗、转换和计算后，将结构化的数据高效地存入数据库。

本模块采用**异步并发**与**多进程并行**相结合的架构，旨在最大限度地利用多核 CPU 和 IO 资源，实现高性能的数据处理。

## 2. 核心架构

ETL 模块的设计遵循“职责单一”和“管道编排”原则，主要由以下组件构成：

### 2.2 组件说明

*   **Loader (数据加载器)**:
    *   **职责**: 负责发现数据源（如扫描文件夹获取文件路径列表）和读取原始数据。
    *   **特点**: 内置生产者-消费者模式，支持流式加载，内存安全。
    *   **位置**: `etl/data_loader/`

*   **Pipeline (处理管道)**:
    *   **职责**: 逻辑编排器。它将一系列独立的处理器 (`Handler`) 串联起来，形成一个完整的处理流。
    *   **特点**: 纯异步实现 (`asyncio`)，专注于单个数据单元（如单个文件）的处理逻辑。
    *   **位置**: `etl/processing/pipeline.py`

*   **Handler (处理器)**:
    *   **职责**: 执行单一的具体操作。这是ETL流程的核心构建块。
    *   **特点**: 可复用、可测试的原子操作。根据职责可分为三类：
        *   **Adapter (适配器)**: 负责将特定数据源（如CSV, API）的原始数据转换为系统内部的**标准格式**。
        *   **Cleaner (清洗器)**: 负责对**标准格式**的数据执行通用的清洗逻辑，如类型转换、缺失值处理等。
        *   **Saver (存储器)**: 负责将清洗干净的数据高性能地存入数据库。
    *   **位置**: `etl/processing/handlers/` (每个Handler是一个独立的模块)

*   **Scheduler (调度器)**:
    *   **职责**: 全局任务调度与分发。
    *   **特点**: 使用多进程并行。它将 `Loader` 发现的任务（如文件路径）分发给多个 Worker 进程，每个 Worker 独立运行一个 `Pipeline`。
    *   **位置**: `etl/scheduler.py`

*   **Storage (存储层)**:
    *   **职责**: 数据库交互。提供 ORM 模型定义和高性能批量插入/更新接口。
    *   **特点**: 基于 `SQLAlchemy 2.0` (Async) 和 `asyncpg`，使用 `COPY` 命令实现极速写入。
    *   **位置**: `etl/storage/`

## 3. 执行流程

整个 ETL 任务的执行过程如下：

1.  **启动**: 用户运行一个具体的执行脚本（如 `etl/scripts/run_csv_daily_etl.py`），启动 `Scheduler`。
2.  **发现任务**: `Scheduler` 调用 `Loader.get_sources()` 获取所有待处理的数据源标识。
3.  **任务分发**: `Scheduler` 将任务动态分发给多个并行的 Worker 进程。
4.  **背压控制**: `Scheduler` 自动控制分发速度，防止内存溢出。
5.  **并行执行**:
    *   每个 Worker 接收到一个任务批次。
    *   Worker 从 `Loader` 流式加载数据，并为每个数据单元（如一个DataFrame）创建一个 `Pipeline` 实例来处理。
    *   **Pipeline 内部流程 (以CSV日线为例)**:
        *   `CsvAdapterHandler`: 将CSV的列名 (`date`, `code`) 适配为内部标准列名 (`trade_date`, `code`)。
        *   `CleanDataHandler`: 对标准格式数据进行类型转换和缺失值填充。
        *   `SaveDailyDataHandler`: 调用 `storage.bulk_upsert_df` 将结果高性能地写入数据库。
6.  **状态更新**: 任务成功后，Worker 更新 `etl_metadata` 表，标记任务完成，实现幂等性。
7.  **完成**: 所有任务执行完毕，调度器退出。

## 4. 使用说明

### 4.1 运行 ETL

通过命令行运行一个具体的ETL执行脚本：

```bash
# 确保在项目根目录下
export PYTHONPATH=$PYTHONPATH:.

# 运行CSV日线数据导入任务
python etl/scripts/run_csv_daily_etl.py --data-dir /path/to/csv_data

# 强制重新处理 (忽略幂等性检查)
python etl/scripts/run_csv_daily_etl.py --data-dir /path/to/csv_data --force

# 指定最大工作进程数
python etl/scripts/run_csv_daily_etl.py --data-dir /path/to/csv_data --max-workers 4
```

### 4.2 开发新流程

**核心理念**: ETL 的开发工作从“修改一个巨大的脚本”转变为“编写可复用的 `Handler` 并用新脚本组装它们”。

**步骤**:

1.  **确定标准格式**: 如果是新业务，首先确定数据的内部标准格式，并在 `etl/storage/models/` 中定义对应的数据库模型。

2.  **编写 Handlers**:
    *   进入 `etl/processing/handlers/` 目录。
    *   **为新数据源编写 `Adapter`**: 例如，要从一个新的API拉取数据，可以创建一个 `ApiAdapterHandler.py`，其职责是将API返回的JSON转换为标准格式的DataFrame。
    *   **复用或编写 `Cleaner`**: 大多数情况下，通用的 `CleanDataHandler` 可以直接复用。如果需要特殊的清洗逻辑，可以编写一个新的 `Handler`。
    *   **复用或编写 `Saver`**: 如果是存入标准模型，`SaveDailyDataHandler` 这类存储器也可以复用。

3.  **在新脚本中组装 Pipeline**:
    *   在 `etl/scripts/` 目录下创建一个新的执行脚本，例如 `run_api_daily_etl.py`。
    *   在这个脚本中，初始化你的数据加载器 (`Loader`)。
    *   在 `Scheduler` 的 `pipeline_factory` 参数中，按照 `Adapter -> Cleaner -> Saver` 的顺序，将你需要的 `Handler` 实例化的列表传给 `Pipeline.create()`。

**示例：创建一个从API导入数据的ETL脚本 `run_api_daily_etl.py`**
```python
# etl/scripts/run_api_daily_etl.py (示例代码)

# ... imports ...
from etl.data_loader.api_loader import ApiLoader # 假设有一个API加载器
from etl.processing.handlers import ApiAdapterHandler, CleanDataHandler, SaveDailyDataHandler

# ... argparse ...

# 1. 初始化API加载器
loader = ApiLoader(api_token="your_token")

# 2. 组装流水线并创建调度器
async with Scheduler(
    loader=loader,
    pipeline_factory=lambda: Pipeline.create([
        ApiAdapterHandler(),      # <-- 唯一需要为新数据源编写的部分
        CleanDataHandler(),       # <-- 复用
        SaveDailyDataHandler(),   # <-- 复用
    ]),
    # ... 其他参数 ...
) as scheduler:
    await scheduler.run()

```

这种模式极大地提高了代码的复用性和可维护性，使得添加新的ETL流程变得简单而高效。

## 5. 注意事项

*   **内存管理**: `Loader` 和 `Scheduler` 经过优化，避免了一次性加载所有数据。但在编写 `Handler` 时，仍需注意不要在内存中保留过大的临时对象。
*   **数据库连接**: 每个 Worker 进程会维护自己的数据库连接池，请确保数据库配置 (`max_connections`) 允许足够的并发连接。
*   **幂等性**: `Scheduler` 会通过 `etl_metadata` 表自动跳过已成功处理的任务。如果需要强制重跑，请使用 `--force` 标志。
