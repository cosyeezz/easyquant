# Plan: 元数据传播引擎实现 (Schema Propagation)

## Phase 1: Backend Inference Engine
- [ ] Task: Write failing tests for Schema inference logic.
- [ ] Task: Implement base Node class with `get_output_schema()` method.
- [ ] Task: Conductor - User Manual Verification 'Backend Inference Engine' (Protocol in workflow.md)

## Phase 2: Frontend Propagation Logic
- [ ] Task: Implement `useSchemaPropagation` hook in React Flow context.
- [ ] Task: Update node configurations reactively when connections change.
- [ ] Task: Conductor - User Manual Verification 'Frontend Propagation Logic' (Protocol in workflow.md)

## Phase 3: Dynamic Parameter Picker
- [ ] Task: Create a ColumnPicker UI component that uses propagated schema.
- [ ] Task: Conductor - User Manual Verification 'Dynamic Parameter Picker' (Protocol in workflow.md)
