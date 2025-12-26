# Plan: 实现后端 Runner 映射与执行流

## Phase 1: Foundation - Graph Mapping
- [ ] Task: Write failing tests for Graph-to-Runner mapping logic.
- [ ] Task: Implement Graph-to-Runner mapping logic in `easyquant/server/etl/mapper.py`.
- [ ] Task: Conductor - User Manual Verification 'Foundation - Graph Mapping' (Protocol in workflow.md)

## Phase 2: Core Execution Engine
- [ ] Task: Write failing tests for the graph-based execution engine in `runner.py`.
- [ ] Task: Implement graph-based execution logic in `easyquant/server/etl/runner.py`.
- [ ] Task: Conductor - User Manual Verification 'Core Execution Engine' (Protocol in workflow.md)

## Phase 3: Real-time Status Feedback
- [ ] Task: Write failing tests for WebSocket-based node status reporting.
- [ ] Task: Implement node status event broadcasting in the execution flow.
- [ ] Task: Conductor - User Manual Verification 'Real-time Status Feedback' (Protocol in workflow.md)

## Phase 4: Schema Propagation
- [ ] Task: Write failing tests for Schema Propagation between nodes.
- [ ] Task: Implement Schema Propagation logic in the backend.
- [ ] Task: Conductor - User Manual Verification 'Schema Propagation' (Protocol in workflow.md)
