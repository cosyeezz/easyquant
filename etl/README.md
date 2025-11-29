# EasyQuant ETL 模块文档

## 1. 概述

ETL (Extract, Transform, Load) 模块是 EasyQuant 系统的核心数据处理引擎。它负责从各种数据源（如 CSV 文件、API）提取原始数据，经过清洗、转换和计算后，将结构化的数据高效地存入数据库。

本模块采用**异步并发**与**多进程并行**相结合的架构，旨在最大限度地利用多核 CPU 和 IO 资源，实现高性能的数据处理。

## 2. 核心架构

ETL 模块的设计遵循“职责单一”和“管道编排”原则，主要由以下组件构成：

### 2.1 组件说明

*   **Loader (数据加载器)**:
    *   **职责**: 负责发现数据源（如扫描文件夹获取文件路径列表）和读取原始数据。
    *   **特点**: 内置生产者-消费者模式，支持流式加载，内存安全。
    *   **位置**: `etl/data_loader/`

*   **Pipeline (处理管道)**:
    *   **职责**: 逻辑编排器。它将一系列独立的处理器 (`Handler`) 串联起来，形成一个完整的处理流。
    *   **特点**: 纯异步实现 (`asyncio`)，专注于单个数据单元（如单个文件）的处理逻辑。
    *   **位置**: `etl/processing/pipeline.py`

*   **Handler (处理器)**:
    *   **职责**: 执行单一的具体操作，如“读取文件”、“解析CSV”、“计算MA指标”、“保存到DB”。
    *   **特点**: 可复用、可测试的原子操作。
    *   **位置**: `etl/processing/handlers.py` (需用户实现具体逻辑)

*   **Scheduler (调度器)**:
    *   **职责**: 全局任务调度与分发。
    *   **特点**: 使用 **Ray** 框架实现多进程并行。它将 `Loader` 发现的任务（如文件路径）分发给多个 Worker 进程，每个 Worker 独立运行一个 `Pipeline`。
    *   **位置**: `etl/scheduler.py`

*   **Storage (存储层)**:
    *   **职责**: 数据库交互。提供 ORM 模型定义和高性能批量插入接口。
    *   **特点**: 基于 `SQLAlchemy 2.0` (Async) 和 `asyncpg`，使用 `COPY` 命令实现极速写入。
    *   **位置**: `etl/storage/`

## 3. 执行流程

整个 ETL 任务的执行过程如下：

1.  **初始化**: 用户运行 `etl/scripts/run_etl.py`，启动 `Scheduler`。
2.  **发现任务**: `Scheduler` 调用 `Loader.get_sources()` 获取所有待处理的数据源标识（例如 1000 个 CSV 文件的路径列表）。
3.  **幂等性检查**: `Scheduler` 查询数据库的 `etl_metadata` 表，过滤掉已经处理过且未发生变化的任务（除非指定 `--force`）。
4.  **任务分发**: `Scheduler` 根据策略（如按文件大小排序）将剩余任务分发给 Ray 的 Worker 进程池。
5.  **并行执行**:
    *   每个 Worker 进程接收到一个任务（如文件路径）。
    *   **加载**: Worker 调用 `loader.load_one_source(path)` 将数据加载为 DataFrame。
    *   **处理**: Worker 创建一个新的 `Pipeline` 实例，并调用 `pipeline.run(df)`。
    *   **Pipeline 内部流程**:
        *   `TransformHandler`: 清洗数据、计算指标 (输入是 DataFrame)。
        *   `SaveHandler`: 调用 `storage.bulk_insert_df` 将结果写入数据库。
6.  **状态更新**: 任务成功完成后，Worker 更新 `etl_metadata` 表，标记该任务已完成。
7.  **完成**: 所有任务执行完毕，调度器退出。

## 4. 使用说明

### 4.1 运行 ETL

通过命令行脚本启动 ETL 任务：

```bash
# 确保在项目根目录下
export PYTHONPATH=$PYTHONPATH:.

# 运行 ETL (默认使用所有 CPU 核心)
python etl/scripts/run_etl.py --data-dir /path/to/csv_data

# 强制重新处理所有数据 (忽略幂等性检查)
python etl/scripts/run_etl.py --data-dir /path/to/csv_data --force

# 指定最大工作进程数
python etl/scripts/run_etl.py --data-dir /path/to/csv_data --max-workers 4
```

### 4.2 开发新流程

1.  **定义模型**: 在 `etl/storage/models.py` 中定义新的数据库表结构。
2.  **实现 Handler**: 在 `etl/processing/handlers.py` 中编写具体的处理函数。
3.  **组装 Pipeline**: 在 `etl/scripts/run_etl.py` 的 `create_pipeline` 工厂函数中，将 Handlers 组装成 Pipeline。

## 5. 注意事项

*   **内存管理**: `Loader` 和 `Scheduler` 经过优化，避免了一次性加载所有数据。但在编写 `Handler` 时，仍需注意不要在内存中保留过大的临时对象。
*   **数据库连接**: 每个 Ray Worker 进程会维护自己的数据库连接池，请确保数据库配置 (`max_connections`) 允许足够的并发连接。
