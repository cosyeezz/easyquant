# EasyQuant - 量化交易系统

EasyQuant 是一个使用Python和Web技术构建的量化交易系统，支持数据处理（ETL）、策略回测和实盘交易。

系统核心特性是其基于**事件驱动**的**可观测性（Observability）**架构，所有后台进程均可通过API报告详细的“埋点”事件，这些事件被持久化到数据库中，为系统监控、性能分析和事后复盘提供了强大的数据支持。

## 系统架构

本系统采用前后端分离的现代化架构，其核心数据流基于一个事件驱动模型：

1.  **工作子进程 (Worker Processes)**: 每个后台任务（如ETL、回测）都是一个独立的进程。在执行过程中，它们会在关键节点（如任务开始、数据加载成功、处理完成）调用 `report_event()` 方法。

2.  **事件报告 (Event Reporting)**: `report_event()` 方法内部会发起一个异步HTTP POST请求，将结构化的事件数据发送到一个中心化的API端点。工作进程本身不直接与数据库交互。

3.  **FastAPI 事件服务 (Event Service)**:
    -   提供 `POST /api/v1/events` 端点，用于接收并验证来自所有工作进程的事件，然后将其存入数据库。
    -   提供 `GET /api/v1/events` 端点，用于让前端根据需要（如按时间、按进程名）查询事件数据。
    -   **高效的连接池管理**: 系统启动时，会初始化一个全局的数据库引擎(`Engine`)，该引擎维护着一个到数据库的连接池。每个API请求通过依赖注入(`Depends(get_session)`)从池中获取一个连接，请求结束后自动归还。这种模式避免了为每个请求创建和销毁数据库连接的巨大开销，保证了高效和稳定的数据库访问。

4.  **React 前端 (Dashboard)**:
    -   前端应用不再依赖持久的WebSocket连接。
    -   它会通过定时**轮询 (Polling)**（例如每隔2秒）的方式，调用 `GET /api/v1/events` 接口来获取最新的事件数据，并刷新监控仪表盘。

### 架构图

```
+-----------------+   report_event()   +----------------------------+
|  工作进程(ETL)  | -----------------> |  POST /api/v1/events       |
+-----------------+       (HTTP)       |                            |
                                       |      FastAPI 事件服务      |----->[ PostgreSQL 数据库 ]
+-----------------+   report_event()   |                            |
| 工作进程(回测)  | -----------------> |  GET  /api/v1/events       |
+-----------------+       (HTTP)       +----------------------------+
                                                    ^
                                                    | (HTTP Polling)
                                                    |
                                          +------------------+
                                          |  React 监控前端  |
                                          +------------------+
```

## 目录结构

```
easyquant/
├── .git/
├── alembic/               # Alembic 数据库迁移工具目录
│   └── versions/
├── client/                # React 前端应用
│   ├── src/
│   │   ├── components/    # React组件
│   │   │   ├── ETLConfig.jsx       # ETL配置页面
│   │   │   └── ProcessMonitor.jsx  # 进程监控页面
│   │   ├── services/      # API服务
│   │   │   └── api.js              # API调用封装
│   │   ├── App.jsx        # 主应用组件
│   │   └── main.jsx       # 应用入口
│   ├── package.json
│   ├── vite.config.js
│   └── README.md          # 前端详细文档
├── server/
│   ├── common/            # 后端内部通用模块
│   │   └── monitor.py     # 监控基类 BaseMonitor
│   ├── etl/
│   │   ├── data_loader/
│   │   ├── process/
│   │   └── storage/       # ETL流程相关的非数据库存储
│   ├── backtest/          # 回测模块
│   ├── live/              # 实盘模块
│   ├── storage/           # 共享的、核心的数据存储模块
│   │   ├── __init__.py
│   │   ├── database.py    # 高性能异步数据库核心
│   │   └── models/        # SQLAlchemy 数据模型目录
│   │       ├── __init__.py
│   │       ├── base.py    # 通用模型基类 (含时间戳)
│   │       └── event.py   # Event 数据表的定义
│   └── main.py            # 系统主入口和FastAPI服务
├── test_events_generator.py # 测试数据生成器
├── .env                   # (需要您手动创建) 环境变量文件
├── alembic.ini            # Alembic 配置文件
├── devlog.md              # 开发日志
├── README.md              # 本文档
└── requirements.txt       # Python 依赖
```

## 快速启动

### 后端服务

1.  **安装Python依赖:**
    ```sh
    pip install -r requirements.txt
    ```

2.  **配置数据库:**
    - 确保您已安装并运行 PostgreSQL 数据库。
    - 在项目根目录创建一个 `.env` 文件。
    - 在 `.env` 文件中配置您的**异步**数据库连接URL，协议需为 `postgresql+asyncpg`。例如:
      ```
      DATABASE_URL="postgresql+asyncpg://user:password@localhost/easyquant_dev"
      ```

3.  **执行数据库迁移:**
    ```sh
    alembic upgrade head
    ```
    此命令会在您的数据库中自动创建 `events` 表。

4.  **启动后端服务:**
    ```sh
    python server/main.py
    ```
    服务将在 `http://localhost:8000` 启动。
    访问 `http://localhost:8000/docs` 查看API文档。

### 前端应用

1.  **安装Node.js依赖:**
    ```sh
    cd client
    npm install
    ```

2.  **启动前端开发服务器:**
    ```sh
    npm run dev
    ```
    应用将在 `http://localhost:3000` 启动。

### 测试数据生成

如果您想快速测试前端界面，可以运行测试数据生成器：

```sh
# 确保后端服务已启动
python test_events_generator.py
```

这个脚本会模拟多个ETL进程向API发送事件数据，您可以立即在前端看到监控效果。

## 使用指南

### 1. ETL配置页面

在前端的"ETL配置"页签中：

- **配置进程数量**: 留空则系统自动分配，建议为CPU核心数的50-75%
- **选择数据源**: 支持本地文件、API接口、数据库和QMT终端
- **设置批处理大小**: 每批处理的记录数（默认1000）
- **调整并行任务数**: 每个进程内部的并行任务数（1-16）
- **启用数据验证和错误重试**: 确保数据质量和系统稳定性

配置完成后点击"启动ETL"按钮。

### 2. 进程监控页面

在"进程监控"页签中可以：

- 查看所有运行中的进程卡片
- 实时追踪每个进程的：
  - 处理进度（进度条和百分比）
  - 队列大小
  - 当前处理的文件
  - 错误信息（如果有）
- 点击进程卡片查看详细的事件日志
- 使用右上角的"自动刷新"开关控制数据更新（默认每2秒刷新）

### 3. 事件系统

系统使用事件驱动架构，工作进程可以通过HTTP API报告各种事件：

**事件示例**:
```python
# 在工作进程中报告事件
await report_event(
    process_name="ETL_Pipeline_1",
    event_name="loader.queue.status",
    payload={
        "queue_size": 42,
        "current_file": "stock_data_2024.csv",
        "processed": 1000,
        "total": 5000,
        "progress": 20.0
    }
)
```

**推荐的事件命名规范**:
- `loader.task.started` - 任务开始
- `loader.queue.status` - 队列状态更新
- `loader.file.processing` - 文件处理中
- `loader.progress.update` - 进度更新
- `loader.task.completed` - 任务完成
- `loader.error.occurred` - 发生错误

## API文档

后端提供以下API端点：

- `GET /` - 健康检查
- `POST /api/v1/events` - 创建事件
- `GET /api/v1/events` - 查询事件（支持筛选和分页）
- `GET /api/v1/processes` - 获取所有进程列表和最新状态

详细的API文档请访问: `http://localhost:8000/docs`

## 技术栈

### 后端
- Python 3.10+
- FastAPI - Web框架
- SQLAlchemy - ORM
- PostgreSQL - 数据库
- asyncpg - 异步数据库驱动
- Alembic - 数据库迁移

### 前端
- React 18 - UI框架
- Vite - 构建工具
- Tailwind CSS - 样式框架
- Axios - HTTP客户端
- Lucide React - 图标库

