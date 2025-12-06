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
