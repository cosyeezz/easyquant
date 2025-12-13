# 开发日志 (2025-12-13)

## 概述

本日开发实现了 **全 WebSocket 驱动的实时监控架构**。为了彻底解决 HTTP 轮询带来的带宽浪费和延迟问题，我们将进程列表监控和事件详情推送全部升级为 WebSocket 实时流。现在，前端仅在初次加载时拉取历史数据，后续所有状态更新均为服务器主动推送，实现了零延迟的真实“事件驱动”体验。

同时，我们对系统架构进行了深度思考，明确了当前 **内存直通 (In-Memory Direct Pass-through)** 方案的高性能优势，并拒绝了引入 RocketMQ 等重型中间件的过度设计。

## 详细工作项

### 1. 全 WebSocket 事件流架构
- **核心重构**:
    - **进程列表实时化**: 后端实现了 `processes_broadcast_worker`，每 2 秒广播一次最新的进程状态到 `system.processes` 频道，彻底移除了前端对 `/api/v1/processes` 的轮询。
    - **事件推送实时化**: 修改了 `event_service.record_event` 核心函数。现在，每当事件写入数据库成功后，会自动广播到 `process.events.{process_name}` 频道。
- **前端适配**:
    - 升级 `useWebSocket` Hook，增加了对动态频道 `process.events.*` 的订阅支持。
    - 重构 `ProcessMonitor` 组件，实现了“历史+实时”混合模式：
        1. **选中进程时**: 仅调用一次 API 拉取历史事件。
        2. **即刻订阅**: 开启 WebSocket 监听，实时追加新产生的事件。
        3. **自动清理**: 切换进程时自动退订并清空队列，确保无内存泄漏。

### 2. 基础设施 (Infrastructure)
- **数据库连接的智能 SSH 隧道**:
    - 解决了本地开发环境连接远程数据库的痛点。系统现在能智能识别运行环境（本地/远程），自动建立 SSH 隧道，无需维护多套配置。
    - 经基准测试 (`benchmark_comparison.py`)，确认内网直连（~1.7ms）比 SSH 隧道（~225ms）快 135 倍，确立了内网为生产环境标准。
- **WebSocket 性能调优**:
    - 确认了当前架构（FastAPI + asyncio + 内存队列）在单机高并发下的极致性能（亚毫秒级延迟），优于引入 MQ 的方案。

## 架构决策记录 (ADR)

**决策**: 暂不引入 RocketMQ/Kafka 等消息队列中间件。
**背景**: 考虑过使用 MQ 来解耦事件服务。
**原因**:
1.  **运维成本**: 引入 MQ 需要额外部署 NameServer/Broker，破坏了项目“一键启动”的极简体验。
2.  **性能损耗**: 当前 Python 内存队列 + WebSocket 的路径最短，无网络序列化开销。引入 MQ 会增加网络跳数，反而增加延迟。
3.  **适用性**: 当前单体架构下，内存通信是最优解。未来若升级为多服务器微服务架构，再考虑引入 Redis Pub/Sub 或 RocketMQ。

## 下一步计划
1.  **ETL Runner 实现**: 既然监控系统已完美就绪，下一步必须打通数据处理的核心——串联 Loader、Pipeline 和 DatabaseSaveHandler。