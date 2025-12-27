# Implementation Plan - Remove Legacy Operator Node Management

## Phase 1: Discovery & Analysis [checkpoint: 115cd77]
- [x] Task: 识别并列出所有相关的旧版前端文件 (Components, Pages, Services)
- [x] Task: 识别并列出所有相关的旧版后端 API 路由、模型和处理逻辑
- [x] Task: 确认数据库表 `workflow_nodes` 的当前使用情况，判定是否可安全删除或仅清理数据
- [x] Task: Conductor - User Manual Verification 'Discovery & Analysis' (Protocol in workflow.md)

## Phase 2: Backend Cleanup (API & DB)
- [~] Task: 编写针对旧版 API 路由移除后的 404 验证测试
- [x] Task: 移除旧版后端 API 路由配置 (v1/api 等)
- [x] Task: 移除旧版 Pydantic 模型及相关的业务处理逻辑
- [x] Task: 编写并执行数据库迁移脚本 (Alembic)，删除废弃的表或数据
- [x] Task: 运行所有后端测试确保无回归错误
- [x] Task: Conductor - User Manual Verification 'Backend Cleanup' (Protocol in workflow.md)

## Phase 3: Frontend Cleanup (UI & Routes)
- [~] Task: 编写前端单元测试，验证旧版路由已无法访问
- [~] Task: 移除顶部/侧边导航栏中的“算子节点”菜单项
- [ ] Task: 移除 Vite/React 路由配置中对应的旧版 Page 路由
- [ ] Task: 删除旧版页面组件及相关的子组件
- [ ] Task: 清理不再使用的 Service/Store 代码
- [ ] Task: 执行 `npm run lint` 和 `npm test` 确保无编译或回归错误
- [ ] Task: Conductor - User Manual Verification 'Frontend Cleanup' (Protocol in workflow.md)

## Phase 4: Final Verification & Checkpoint
- [ ] Task: 全面手动测试，确保系统主功能（新版工作流编辑器）完全正常
- [ ] Task: 检查代码库，确保无“算子节点”相关的残留注释或冗余代码
- [ ] Task: Conductor - User Manual Verification 'Final Verification' (Protocol in workflow.md)
