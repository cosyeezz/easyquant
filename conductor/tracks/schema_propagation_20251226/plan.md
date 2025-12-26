# Plan: 元数据传播引擎实现 (Schema Propagation)

## Phase 1: Backend Inference Engine [checkpoint: 4c714d7]
- [x] Task: Write failing tests for Schema inference logic. [2aab2fc]
- [x] Task: Implement base Node class with `get_output_schema()` method. [2aab2fc]
- [x] Task: Conductor - User Manual Verification 'Backend Inference Engine' (Protocol in workflow.md)

## Phase 2: Frontend Propagation Logic
- [x] Task: Implement `useSchemaPropagation` hook in React Flow context. [e51592f]
- [x] Task: Update node configurations reactively when connections change. [e51592f]
- [ ] Task: Conductor - User Manual Verification 'Frontend Propagation Logic' (Protocol in workflow.md)

## Phase 3: Dynamic Parameter Picker
- [x] Task: Create a ColumnPicker UI component that uses propagated schema. [ea94bb8]
- [x] Task: Conductor - User Manual Verification 'Dynamic Parameter Picker' (Protocol in workflow.md)
