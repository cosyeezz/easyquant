# 开发日志 (2025-12-06)

## 概述

本次开发周期从零开始，搭建了 `EasyQuant` 量化系统的核心架构和基础功能。主要工作围绕多进程监控、前后端分离架构设计、数据加载框架的实现和项目结构优化。

## 详细工作项

### 1. 监控系统核心 (`BaseMonitor`)
- 在 `server/common/monitor.py` 中创建了 `BaseMonitor` 抽象基类。
- 该基类为所有未来工作进程（ETL、回测等）提供了标准化的状态上报、心跳更新和自定义指标追踪的能力。

### 2. 系统架构与后端服务
- **架构设计**: 确立了以 FastAPI + WebSocket 为后端、React 为前端的实时监控架构。
- **服务实现**: 在 `server/main.py` 中，实现了一个可以启动、管理和监控多个后台工作进程的主服务。
- **实时通信**: FastAPI 服务通过 `/ws/status` WebSocket 端点，将所有工作进程的实时状态广播给前端客户端。
- **依赖管理**: 创建了 `requirements.txt` 文件来管理Python依赖。
- **测试客户端**: 提供了一个临时的 `server/test_client.html`，用于快速验证后端WebSocket功能。

### 3. 项目结构优化
- **目录规划**: 明确了 `client/` (前端) 和 `server/` (后端) 的分离结构。
- **模块划分**: 在 `server/` 内部，创建了 `etl`, `backtest`, `live` 等核心业务模块目录。
- **代码重构**: 将项目初期的 `core` 目录重构为 `server/common`，使后端代码组织更有条理。

### 4. 数据加载框架 (`BaseLoader`)
- **框架设计**: 在 `server/etl/data_loader/` 目录下，实现了一个功能强大的异步数据加载基类 `BaseLoader`。
- **核心特性**:
    - 内置生产者-消费者模式，支持高并发、流式处理，内存安全。
    - 通过 `asyncio.Semaphore` 实现了并发控制，防止对数据源的过度请求。
- **处理同步阻塞**: 讨论并解决了在异步框架中调用同步SDK（如QMT）会阻塞的问题。
    - **方案**: 在 `BaseLoader` 中添加了 `run_sync` 辅助方法，利用线程池 `run_in_executor` 来安全地包装同步调用。
    - **示例**: 创建了 `api_loader_example.py` 来演示如何使用 `run_sync` 处理模拟的同步API。
- **框架简化**: 根据讨论，移除了 `get_source_metadata`（幂等性）、`load()`（反模式）和 `stream()` 的参数，使框架更专注、更易用。

### 5. 文档
- **README**: 创建了 `README.md`，详细记录了项目架构、目录结构和启动步骤。
- **开发日志**: 创建了本文件 (`devlog.md`)，用于追踪开发进度。

### 6. 架构重大升级：事件驱动监控
- **模型转变**: 经过深入讨论，决定将监控系统从“WebSocket实时推送”模型升级为更健壮、可持久化的“**事件 -> 数据库 -> API -> 前端轮询**”模型。
- **核心优势**: 新架构实现了事件的持久化存储、更好的前后端解耦和更高的系统可扩展性。
- **数据库设计**:
    - 在 `server/storage/` 目录下定义了核心的数据库连接 (`database.py`) 和数据模型 (`models.py`)。
    - 使用 `SQLAlchemy` 定义了 `events` 表的结构。
    - 引入 `Alembic` 工具来管理数据库 schema 的版本迁移。
- **后续计划**: 下一步将重构 `BaseMonitor` 以通过HTTP API报告事件，并改造 `server/main.py` 以提供事件的写入和查询接口。

### 7. 架构深度重构与规范化
在用户的深刻见解和贡献下，对数据库和模型层进行了重大重构，显著提升了项目的专业性和可维护性。

- **数据库核心升级**:
    - `server/storage/database.py` 已全面升级为基于用户贡献的高性能异步版本。
    - 核心包含 `bulk_insert_df` 和 `bulk_upsert_df` 等函数，为未来海量数据处理提供了强大的性能保障。
    - 明确了其生产级的连接池管理模式：`async_engine` 在应用启动时创建并维护一个持久的连接池，而 `get_session` 依赖注入确保了每个API请求都能高效地复用这些连接，而非重复创建。

- **模型层重构**:
    - 创建了 `server/storage/models` 目录，用于存放所有 ORM 模型定义。
    - 新增 `models/base.py`，定义了包含 `created_at` 和 `updated_at` 时间戳的 `TimestampMixin`，所有模型都将继承此特性，保证了数据表的规范性。
    - 原 `models.py` 已重构为 `models/event.py`，职责更单一。

- **配置规范化**:
    - 实现了“快速失败”原则，移除了 `DATABASE_URL` 的默认值。
    - 现在如果环境变量中未设置数据库连接，程序在启动时会立即报错，方便开发者快速定位问题。
