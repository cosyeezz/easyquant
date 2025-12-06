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
    -   集中管理数据库连接池，保证了高效和稳定的数据库访问。

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
├── client/
│   └── (React 前端应用)
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
│   ├── main.py            # 系统主入口和FastAPI服务
│   └── test_client.html   # 用于测试的临时客户端
├── .env                   # (需要您手动创建) 环境变量文件
├── alembic.ini            # Alembic 配置文件
├── devlog.md              # 开发日志
├── README.md              # 本文档
└── requirements.txt       # Python 依赖
```

## 快速启动

1.  **安装依赖:**
    `pandas` 是必需的。
    ```sh
    pip install -r requirements.txt
    ```

2.  **配置数据库:**
    - 确保您已安装并运行 PostgreSQL 数据库。
    - 在项目根目录创建一个 `.env` 文件。
    - 在 `.env` 文件中配置您的**异步**数据库连接URL，协议需为 `postgresql+asyncpg`。例如:
      `DATABASE_URL="postgresql+asyncpg://user:password@localhost/easyquant_dev"`

3.  **执行数据库迁移:**
    (在您完成配置后，我将为您运行此步骤)
    ```sh
    alembic upgrade head
    ```
    此命令会在您的数据库中自动创建 `events` 表。

4.  **启动服务:**
    ```sh
    python server/main.py
    ```

5.  **测试监控:**
    在浏览器中打开 `server/test_client.html` 文件 (后续会更新为轮询模式)，即可看到监控数据。

