# EasyQuant - 量化交易系统

EasyQuant 是一个使用Python和Web技术构建的量化交易系统，支持数据处理（ETL）、策略回测和实盘交易。

系统核心特性是其基于**事件驱动**的**可观测性（Observability）**架构。所有后台任务都在服务内部运行，并通过一个统一的服务函数 (`event_service.record_event`) 来记录详细的“埋点”事件。这些事件被持久化到数据库中，为系统监控、性能分析和事后复盘提供了强大的数据支持。

## 系统架构

本系统采用前后端分离的现代化架构，其核心数据流基于一个服务内部的事件驱动模型：

1.  **后台任务 (Background Tasks)**: 每个后台任务（如ETL、回测）都是在 FastAPI 服务进程中运行的一个异步任务。在执行过程中，它们会在关键节点（如任务开始、数据加载成功、处理完成）直接调用 `event_service.record_event()` 函数。

2.  **事件记录服务 (Event Service)**: `event_service.record_event()` 是一个核心函数，负责将结构化的事件数据对象直接写入数据库。它通过依赖注入获取数据库会话，保证了操作的原子性和安全性。**所有事件的创建都在服务内部完成，不依赖任何外部API调用。**

3.  **FastAPI 事件服务 (API Service)**:
    -   **不提供**任何用于创建事件的 `POST` 接口。
    -   提供 `GET /api/v1/events` 和 `GET /api/v1/processes` 等只读端点，用于让前端安全地查询事件和进程状态数据。
    -   **高效的连接池管理**: 系统启动时，会初始化一个全局的数据库引擎(`Engine`)，该引擎维护着一个到数据库的连接池。每个API请求通过依赖注入(`Depends(get_session)`)从池中获取一个连接，请求结束后自动归还。这种模式避免了为每个请求创建和销毁数据库连接的巨大开销，保证了高效和稳定的数据库访问。

4.  **生产级数据仓库 (Data Warehouse)**:
    -   内置元数据驱动的数据表管理系统 (`Metadata Driven Data Warehouse`)。
    -   支持严格的表设计流程：分类 -> 草稿 -> 发布 (Publish)。
    -   利用 PostgreSQL 的高级特性（分区、JSONB、数组类型）优化存储。

5.  **可视化 ETL 配置 (Visual ETL)**:
    -   支持可视化的 ETL 任务编排。
    -   **Loader -> Pipeline -> Handler** 架构。
    -   支持将数据处理结果精准写入已发布的数据表中。

6.  **React 前端 (Dashboard)**:
    -   前端应用通过定时**轮询 (Polling)**（例如每隔2秒）的方式，调用后端的 `GET` 接口来获取最新的事件数据，并刷新监控仪表盘。

### 架构图

```
+-----------------------------------------------------+
| FastAPI 服务                                        |
|                                                     |
|  +-----------------+   record_event()   +---------+  |
|  |   后台任务(ETL)   | -----------------> | Event   |  |
|  +-----------------+      (函数调用)      | Service |----->[ PostgreSQL 数据库 ]
|                                          +---------+  |         ^
|  +-----------------+   record_event()         ^        |         |
|  |  后台任务(回测) | ----------------->        |        |         |
|  +-----------------+      (函数调用)            |        |         |
|                               _ _ _ _ _ _ _ _ _ | _ _ _ _ _ _ _ _ _ |
|                              |                  | (DB Session)    |
|                              |                  |                 |
|                        +--------------------------------+         |
|                        |     GET /api/v1/events         |         |
|                        |     GET /api/v1/processes      |         |
|                        |     CRUD /api/v1/etl           |         |
|                        |     CRUD /api/v1/data-tables   |         |
|                        +--------------------------------+         |
|                                      ^                            |
+--------------------------------------|----------------------------+
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
├── alembic/                # Alembic 数据库迁移工具目录
│   └── versions/
├── client/                 # React 前端应用 (详情见 client/README.md)
├── server/
│   ├── api/                # API 路由模块
│   │   └── v1/
│   │       ├── events.py       # v1 版本的事件查询 API
│   │       ├── etl.py          # ETL 任务配置 API
│   │       └── data_tables.py  # 数据表管理 API
│   ├── common/             # 后端内部通用模块
│   │   └── event_service.py# 核心事件记录服务
│   ├── etl/                # ETL 模块
│   │   ├── data_loader/    # 数据加载器 (e.g., csv_loader.py)
│   │   ├── process/        # 数据处理管道
│   │   │   ├── handlers/   # 具体处理器实现 (e.g., ColumnMapping)
│   │   │   ├── pipeline.py # 管道核心逻辑
│   │   │   └── registry.py # 处理器注册中心
│   │   └── runner.py       # (Planned) 任务执行器
│   ├── backtest/           # 回测模块
│   ├── live/               # 实盘模块
│   ├── storage/            # 共享的、核心的数据存储模块
│   │   ├── database.py     # 高性能异步数据库核心
│   │   └── models/         # SQLAlchemy 数据模型目录
│   │       ├── base.py     # 通用模型基类 (含时间戳)
│   │       ├── event.py    # Event 数据表的定义
│   │       ├── etl_task_config.py # ETL 任务配置模型
│   │       └── data_table_config.py # 数据表配置模型
│   └── main.py             # 系统主入口和FastAPI服务
├── .env                    # (需要您手动创建) 环境变量文件
├── alembic.ini             # Alembic 配置文件
├── devlog.md               # 开发日志
├── README.md               # 本文档
└── requirements.txt        # Python 依赖
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
    (请在配置好 `.env` 文件后，告知我来为您运行此步骤)
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

(详细步骤请参考 `client/README.md`)

1.  **安装依赖:** `cd client && npm install`
2.  **启动服务:** `npm run dev`

## 服务管理 (运维)

项目内置了 `manage.py` 脚本，用于标准化地管理后端服务的生命周期（启动、停止、重启、日志查看）。

**常用命令:**

- **启动服务**:
  ```sh
  python manage.py start
  ```
  *自动处理 PID 文件、日志重定向 (`logs/server.log`) 和环境变量加载。*

- **停止服务**:
  ```sh
  python manage.py stop
  ```

- **重启服务**:
  ```sh
  python manage.py restart
  ```

- **查看状态**:
  ```sh
  python manage.py status
  ```

## 使用指南

### 数据表管理 (Data Warehouse)

系统采用严格的 **"配置(Config) -> 物理表(Physical Table)"** 分离模式，确保生产环境数据的安全性。

1.  **草稿 (Draft)**: 新建的表配置默认为草稿状态。此时只存在于配置表中，物理数据库未创建。
2.  **发布 (Publish)**: 点击发布后，系统会根据 Schema 自动生成并执行 DDL 语句，创建物理表。
3.  **同步状态 (Sync State)**:
    - **已同步 (Synced)**: 配置与物理表一致。
    - **待同步 (Unsynced)**: 修改了已发布的配置（如新增字段），需要再次发布以应用变更。

### 事件系统

系统使用事件驱动架构，任何在服务内部运行的代码都可以通过直接调用服务函数来记录事件。

**事件记录示例**:
```python
# 引入服务函数和数据库会话
from server.common.event_service import record_event
from server.storage.database import AsyncSessionFactory

# 在你的异步函数中
async def my_task():
    # 获取一个独立的数据库会话
    async with AsyncSessionFactory() as session:
        # 记录事件
        await record_event(
            session=session,
            process_name="ETL_Pipeline_1",
            event_name="loader.queue.status",
            payload={"queue_size": 42, "progress": 20.0}
        )
```

**推荐的事件命名规范**:
- `task.started` - 任务开始
- `task.completed` - 任务完成
- `task.error` - 发生错误
- `data.loaded` - 数据加载完成
- `process.progress` - 进度更新

## API文档

后端提供以下只读API端点：

- `GET /` - 健康检查
- `GET /api/v1/events` - 查询事件（支持筛选和分页）
- `GET /api/v1/processes` - 获取所有进程列表和最新状态
- `CRUD /api/v1/data-tables` - 数据表管理
- `CRUD /api/v1/etl` - ETL 任务管理

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
- Axios - HTTP客户端（含超时和错误处理）
- Lucide React - 图标库

### 前端功能模块
- **数据表管理**: 元数据驱动的数据仓库管理，支持字段定义、索引定义、草稿/发布状态流转
- **ETL任务配置**: 三步向导式配置（数据源 → Pipeline → 运行参数）
- **进程监控**: 实时轮询显示任务执行状态和进度
- **文件路径选择器**: 支持文件夹、单文件、多文件、按后缀筛选四种模式
