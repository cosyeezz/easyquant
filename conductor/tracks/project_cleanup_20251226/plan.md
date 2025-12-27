# Plan: 项目清理与维护

## Phase 1: Automated Cleanup [checkpoint: f9ea2a7]
- [x] Task: Execute commands to remove common temporary and cache files (pycache, etc). [cb8d5db]
- [x] Task: Clean up old log files in the `logs/` directory. [d7e9ce7]
- [ ] Task: Conductor - User Manual Verification 'Automated Cleanup' (Protocol in workflow.md)

## Phase 2: Manual Triage and Removal [checkpoint: 99fe9b0]
- [x] Task: Identify and list `debug_*.py` or temporary scripts for removal. [7ef775e]
- [x] Task: Remove confirmed unnecessary files. [1022c15]
- [ ] Task: Conductor - User Manual Verification 'Manual Triage and Removal' (Protocol in workflow.md)

## Phase 3: Ignore Rules Optimization
- [x] Task: Review and update `.gitignore` to prevent future clutter. [e64817b]
- [x] Task: Review and update `.geminiignore` for better token efficiency. [31d85ff]
- [ ] Task: Conductor - User Manual Verification 'Ignore Rules Optimization' (Protocol in workflow.md)
