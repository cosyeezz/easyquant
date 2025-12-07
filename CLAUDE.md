# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
cd client
npm install
npm run dev      # Development server (port 3000)
npm run build    # Production build
```

## Frontend Architecture

React 18 + Vite + Tailwind CSS 量化交易监控前端。

### 项目结构

```
client/src/
├── App.jsx                 # Tab 导航 (tables, etl, monitor)
├── components/
│   ├── DataTableList.jsx   # 数据表列表
│   ├── DataTableEditor.jsx # 数据表编辑器
│   ├── ETLTaskList.jsx     # ETL 任务列表
│   ├── ETLTaskEditor.jsx   # ETL 任务编辑器（三步向导）
│   ├── FilePathPicker.jsx  # 文件路径选择器
│   ├── ProcessMonitor.jsx  # 进程监控（轮询 API）
│   └── Modal.jsx           # 通用模态框
└── services/
    └── api.js              # API 封装
```

### 核心组件

#### FilePathPicker
文件路径选择组件，支持四种模式：
- `folder` - 选择整个文件夹
- `file` - 选择单个文件
- `files` - 选择多个文件
- `pattern` - 按后缀筛选（如 .csv, .xlsx）

```jsx
<FilePathPicker
  value={sourceConfig}
  onChange={(config) => setSourceConfig(config)}
  placeholder="选择数据源路径"
/>
// config: { path, mode, pattern?, files? }
```

### API 接口

- `GET /api/v1/events` - 查询事件
- `GET /api/v1/processes` - 获取进程列表
- `GET /api/v1/data-tables` - 数据表 CRUD
- `GET /api/v1/etl-configs` - ETL 配置 CRUD
- `POST /api/v1/etl/preview` - 预览数据源

### 开发规范

- 使用 Tailwind CSS 类名进行样式化
- 使用 lucide-react 图标库
- ProcessMonitor 每 2 秒轮询一次 API
- 表单组件使用 `input-field`, `form-label`, `form-hint` 等预定义类
