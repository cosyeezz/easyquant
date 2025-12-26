# Spec: 实现后端 Runner 映射与执行流

## 目标
实现一个健壮的后端引擎，能够接收来自前端（Easy-Canvas）生成的 Graph JSON，将其映射为可执行的任务流，并在执行过程中提供实时的状态反馈。

## 核心需求
1. **Graph 映射 (Mapping):** 将包含节点 (Nodes) 和连线 (Edges) 的 JSON 结构转换为后端可理解的 DAG (有向无环图) 任务结构。
2. **图执行引擎 (Execution Engine):** 能够按照拓扑排序或事件驱动的方式执行节点任务。
3. **实时状态 (Status Feedback):** 节点在执行开始、成功、失败时，通过 WebSocket 或事件系统实时通知前端。
4. **元数据传播 (Schema Propagation):** 上游节点的输出 Schema（如 DataFrame 的列信息）能自动传播给下游节点，作为下游节点的输入元数据。

## 技术细节
- **数据结构:** 使用 Pydantic 定义 Graph JSON 的 Schema。
- **执行逻辑:** 在 `easyquant/server/etl/runner.py` 中实现核心执行循环。
- **通信:** 复用现有的 WebSocket 事件推送机制 (`record_event`)。
- **持久化:** 执行结果和日志应记录到数据库中。
