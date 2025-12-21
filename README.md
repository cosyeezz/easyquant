# EasyQuant - 量化交易系统

EasyQuant 是一个使用Python和Web技术构建的量化交易系统，支持数据处理（ETL）、策略回测和实盘交易。

系统核心特性是其基于**事件驱动**的**可观测性（Observability）**架构。所有后台任务都在服务内部运行，和通过一个统一的服务函数 (`event_service.record_event`) 来记录详细的“埋点”事件。

## 系统架构

本系统采用前后端分离的现代化架构，其核心数据流基于一个服务内部的事件驱动模型：

1.  **后台任务 (Background Tasks)**: 每个后台任务（如ETL、回测）都是在 FastAPI 服务进程中运行的一个异步任务。
2.  **事件记录服务 (Event Service)**: `record_event()` 负责将结构化的事件数据对象直接写入数据库。
3.  **FastAPI 事件服务 (API Service)**: 提供只读端点供前端查询。
4.  **生产级数据仓库 (Data Warehouse)**: 内置元数据驱动的表管理，支持 **草稿 -> 校验 -> 发布** 流程。

5.  **可视化 ETL 编辑器 (Visual Graph Editor)**:
    -   **Dify/Coze 风格复刻**: 像素级还原 Dify 极简节点设计与微交互体验。
    -   **智能排版 (Auto Layout)**: 内置 Dagre 布局引擎，一键自动整理节点，解决连线杂乱问题。
    -   **安全连接机制**: 
        -   **循环检测 (Cycle Detection)**: 实时算法拦截死循环连接，保障 DAG 有向无环特性。
        -   **严格模式**: 强制 "Output-to-Input" 连接规则，防止非法操作。
    -   **交互增强**:
        -   **Drag-to-Connect**: 拖拽至节点任意区域自动吸附连接。
        -   **Canvas Control**: 悬浮式工具栏，支持缩放、适应视图及自动整理。

6.  **实时监控 (Real-time Dashboard)**:
    -   **全 WebSocket**: 系统日志、进程状态、事件流均通过 WebSocket 毫秒级推送。

## 目录结构

```
easyquant/
├── client/                 # React 前端 (Vite + Tailwind + React Flow)
│   └── src/components/DifyCanvas/ # 核心图编辑器 (New)
├── server/
│   ├── etl/                # ETL 模块
│   │   ├── runner.py       # 任务执行器 (DAG Runner)
│   │   └── process/        # 数据处理管道
├── ...
```

## 快速启动

### 后端服务
```sh
pip install -r requirements.txt
python manage.py start
```

### 前端应用
```sh
cd client && npm install
npm run dev
```

## 使用指南

### 1. 数据表管理
- 定义表结构 -> 发布 (生成 DDL) -> 物理表就绪。

### 2. ETL 任务编排
- 进入 **ETL 任务** -> **新建任务**。
- **Step 1**: 选择数据源（如 CSV 文件夹）。
- **Step 2 (Canvas)**: 
    - 从“数据源”节点拖出连线，松开鼠标。
    - 在弹出菜单中选择“处理器”或“存储”。
    - 点击节点配置详细参数（如字段映射、清洗规则）。
- **Step 3**: 设置并发数和批次大小，保存并运行。

### 3. 实时监控
- 在“进程监控”面板查看任务进度。
- 点击特定进程，查看实时滚动的事件流。

## 技术栈

### 后端
- Python 3.10+, FastAPI, SQLAlchemy, asyncpg

### 前端
- React 18, Vite, Tailwind CSS
- **React Flow**: 核心图引擎
- **WebSocket**: 实时通信
- **主题系统**: 深色/浅色主题切换，CSS 变量驱动
- Lucide React: 图标库
