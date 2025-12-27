# CLAUDE.md - AI Assistant Guidelines

## Conductor 工作流程

本项目使用 Conductor 机制进行上下文驱动开发。

### 每次启动必读文件

1. `easyquant/conductor/product.md` - 产品愿景
2. `easyquant/conductor/tech-stack.md` - 技术栈
3. `easyquant/conductor/product-guidelines.md` - 开发规范
4. `easyquant/conductor/tracks.md` - 当前任务列表

### 工作流程

1. **开始任务前**: 读取 `conductor/tracks.md` 确认当前 track
2. **执行任务时**: 按照 track 目录下的 `spec.md` 和 `plan.md` 执行
3. **完成任务后**: 更新 `plan.md` 中的 checkbox 和 `metadata.json` 状态

### Track 状态

- `new` - 新建
- `in_progress` - 进行中
- `completed` - 已完成

### 代码规范

- 后端: Python 3.10+, FastAPI, SQLAlchemy async
- 前端: Next.js, TypeScript, React Flow, Tailwind CSS
- 风格: Linear/Stripe 极简设计
