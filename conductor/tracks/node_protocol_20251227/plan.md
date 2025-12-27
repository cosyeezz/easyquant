# Plan: 节点系统与管理重构

## Phase 1: Backend Architecture Refactor
- [x] Task: Create new package structure `server/nodes/{system,logic,etl,quant}/`. [5790fb3]
- [x] Task: Implement `BaseNode` with `category` enum and `run()` interface. [96e0ba2]
- [x] Task: Implement `NodeRegistry` to scan the new package structure. [e5dc5a2]
- [x] Task: Migrate existing ETL logic (if any) to new `server/nodes/etl/` structure. [3c3811b]
- [x] Task: Implement `ProcessSchedulerNode` (System) and `CsvReaderNode` (ETL) as verification samples with distinct parameters. [3c3811b]
- [x] Task: Expose `GET /api/v1/nodes` returning grouped definitions. [3c3811b]
- [x] Task: Conductor - User Manual Verification 'Backend Architecture Refactor' (Protocol in workflow.md) [checkpoint: 3c3811b]

## Phase 2: Frontend Node Selector & Manager
- [~] Task: Refactor `NodeSelector` to support Accordion layout based on the 4 categories.
- [ ] Task: Implement "Manage Nodes" button and a dedicated `NodeManagement` page (Table view of all nodes).
- [ ] Task: Update `NodeConfigPanel` to render forms dynamically based on the specific node's Pydantic schema.
- [ ] Task: Conductor - User Manual Verification 'Frontend Node Selector & Manager' (Protocol in workflow.md)

## Phase 3: Interaction & Data Flow
- [ ] Task: Ensure that when a user configures `ProcessSchedulerNode` (e.g., set concurrency=5), the JSON saved to the backend correctly reflects this structure.
- [ ] Task: Implement a "Debug Workflow" generator in backend that creates a sample graph.
- [ ] Task: Frontend must be able to load and display this "Debug Workflow" correctly without crashing.
- [ ] Task: Conductor - User Manual Verification 'Interaction & Data Flow' (Protocol in workflow.md)
