# EasyQuant - 量化交易系统

EasyQuant 是一个使用Python和Web技术构建的量化交易系统，支持数据处理（ETL）、策略回测和实盘交易。

系统核心特性是其基于**事件驱动**的**可观测性（Observability）**架构。所有后台任务都在服务内部运行，和通过一个统一的服务函数 (`event_service.record_event`) 来记录详细的“埋点”事件。这些事件被持久化到数据库中，为系统监控、性能分析和事后复盘提供了强大的数据支持。

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
    -   支持严格的表设计流程：**分类 -> 草稿 -> 校验 -> 发布 (Publish)**。
    -   自动生成并执行 DDL，支持 PostgreSQL 高级特性（JSONB、数组类型）。
    -   严格的 Schema 校验机制，防止非法表结构发布。

5.  **可视化 ETL 配置 (Visual ETL)**:
    -   支持可视化的 ETL 任务编排。
    -   **Loader -> Pipeline -> Handler** 架构。
    -   **高级流程控制**: 支持**逻辑节点 (Group Nodes)** 和**并行处理 (Parallel Processing)**，通过嵌套和分支逻辑构建复杂的 ETL 工作流。
    -   **高性能引擎**: 采用智能列切片和异步并发技术，支持大数据集的高效分发与合并。
    -   支持将数据处理结果精准写入已发布的数据表中。

6.  **React 前端 (Dashboard)**:
    -   **实时监控**: 通过 **WebSocket** 实时获取系统日志、事件流和服务器状态（CPU/内存）。
    -   **现代化 UI**: 基于 Tailwind CSS 的定制化组件库，提供流畅的交互体验。
    -   **全功能管理**: 内置分类管理、数据表设计器、ETL 任务编排器。

### 架构图

```
+-----------------------------------------------------+
| 后端 (Backend) | FastAPI | Python | RESTful API & WebSocket | Port 8000 |
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
|                        |     CRUD /api/v1/data-tables   |         |
|                        |     WS  /ws/system (Realtime)  |         |
|                        +--------------------------------+         |
|                                      ^                            |
+--------------------------------------|----------------------------+
                                       | (HTTP + WebSocket)
                                       |
                             +------------------+
                             |  React 监控前端  |
                             |  (Port 3000)     |
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
│   │       ├── data_tables.py  # 数据表管理 API
│   │       └── system.py       # 系统日志监控 API
│   ├── common/             # 后端内部通用模块
│   │   ├── event_service.py# 核心事件记录服务
│   │   └── websocket_manager.py # WebSocket 实时消息总线
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
│   │   ├── ddl_generator.py # DDL生成与校验器
│   │   └── models/         # SQLAlchemy 数据模型目录
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
    - **(可选) 远程连接配置**: 如果您在本地开发且数据库在远程服务器（且未开放 5432 端口），请配置 SSH 信息，系统会自动建立安全隧道：
      ```ini
      SSH_USER=root
      SSH_PASSWORD=your_ssh_password
      # SSH_HOST=ds.cosyee.cn  # 默认使用 DATABASE_URL 中的域名
      # SSH_PORT=22            # 默认 22
      # SSH_PKEY=/path/to/key  # 可选：私钥路径
      ```

3.  **执行数据库迁移:**
    (请在配置好 `.env` 文件后，告知我来为您运行此步骤)
    ```sh
    alembic upgrade head
    ```
    此命令会在您的数据库中自动创建 `events` 表。

4.  **启动后端服务:**
    ```sh
    python manage.py start
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
2.  **校验 (Validate)**: 系统会自动检查表名规范、保留字冲突、主键定义等。
3.  **发布 (Publish)**: 点击发布后，系统会根据 Schema 自动生成并执行 DDL 语句，创建物理表。
4.  **同步 (Sync)**: 已发布的表结构变更后，系统会自动计算 Diff（如 ADD COLUMN），并提供“同步”按钮来执行增量更新。
5.  **管理 (Manage)**:
    - **检索**: 支持按表名、物理名、描述进行模糊搜索，并可按分类和状态进行组合筛选。
    - **可视化**: 自动为不同分类分配协调的颜色标签，提升列表可读性。

### 实时日志与监控 (Real-time Observability)

系统采用 **全 WebSocket 事件流 (Full WebSocket Event Stream)** 架构，实现了真正的事件驱动监控，彻底摒弃了传统的 HTTP 轮询。

-   **架构优势**:
    -   **零延迟**: 后端事件产生 (`record_event`) 后，毫秒级推送到前端。
    -   **低负载**: 采用**完全按需订阅**模式。日志面板默认折叠且断开连接，仅在用户显式点击“开始接收”时建立数据流，且支持状态持久化（刷新保持）。
    -   **混合模式**: 前端采用“**历史(HTTP) + 增量(WebSocket)**”的混合策略，既保证了数据完整性，又实现了实时性。

-   **WebSocket 频道 (Channels)**:
    -   `system.status`: 推送服务器 CPU、内存、运行时间心跳 (2s/次)。
    -   `system.processes`: 推送所有后台进程的最新状态摘要 (2s/次)。
    -   `logs`: 推送所有 `INFO` 级别以上的系统日志 (实时)。
    -   `process.events.{process_name}`: **[动态频道]** 仅当用户在前端查看特定进程时订阅，实时推送该进程产生的详细事件。

-   **持久化存储**:
    -   `logs/server.log`: 核心业务日志 (INFO+)。
    -   `logs/server.err.log`: 错误日志 (ERROR+)。

**开发规范**:
-   严禁在生产代码中使用 `print()`。必须使用 Python 标准库 `logging` 模块。


## API文档

后端提供以下只读API端点：

- `GET /` - 健康检查
- `GET /api/v1/events` - 查询事件（支持筛选和分页）
- `GET /api/v1/processes` - 获取所有进程列表和最新状态
- `CRUD /api/v1/data-tables` - 数据表管理
- `CRUD /api/v1/etl` - ETL 任务管理
- `GET /api/v1/system/logs` - 系统日志监控

详细的API文档请访问: `http://localhost:8000/docs`

## 技术栈

### 后端
- Python 3.10+
- FastAPI - Web框架 (Port 8000)
- SQLAlchemy - ORM
- PostgreSQL - 数据库
- asyncpg - 异步数据库驱动
- Alembic - 数据库迁移

### 前端
- React 18 - UI框架 (Port 3000)
- Vite - 构建工具
- Tailwind CSS - 样式框架
- Axios - HTTP客户端（含超时和错误处理）
- Lucide React - 图标库
- WebSocket - 实时通信
- React Flow - 流程图引擎 (ETL 画布)

### 前端功能模块
- **数据表管理**: 元数据驱动的数据仓库管理，支持字段定义、索引定义、草稿/发布状态流转
- **ETL任务配置**: 三步向导式配置（数据源 → Pipeline → 运行参数）
- **进程监控**: 实时轮询显示任务执行状态、进度及**实时后台日志**
- **文件路径选择器**: 支持文件夹、单文件、多文件、按后缀筛选四种模式