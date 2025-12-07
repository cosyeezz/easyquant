# 开发日志 (2025-12-07)

## 概述

本日开发重点在于构建 **ETL 可视化配置系统** 的后端核心。我们引入了全新的“数据表管理”模块，并升级了 Pipeline 架构以支持数据库交互，最终形成了 **Loader -> Pipeline -> Handler (Database Storage)** 的灵活 ETL 架构。

## 详细工作项

### 1. ETL 配置系统后端 (Core)
- **数据库模型**:
    - 新增 `server/storage/models/etl_task_config.py`: 存储 ETL 任务元数据（JSON 格式的 Source 和 Pipeline 配置）。
    - 新增 `server/storage/models/data_table_config.py`: 存储数据表元数据（表名、主键、Schema），用于统一管理系统数据资产。
    - 使用 Alembic 成功生成并应用了 `add_etl_task_config` 和 `add_data_table_config` 迁移脚本。

- **Pipeline 架构升级**:
    - **动态 Handler 注册**: 实现了 `server/etl/process/registry.py`，支持自动扫描和发现所有 `BaseHandler` 子类。
    - **元数据反射**: 在 `BaseHandler` 中增加了抽象方法 `metadata()`，允许 Handler 自描述其参数 Schema（JSON Schema 格式），直接驱动前端生成配置表单。
    - **Context 支持**: 升级了 `BaseHandler.handle` 和 `Pipeline.run` 接口，增加了 `context` 参数。这允许我们在 Pipeline 运行时注入关键资源（如 Database Session），从而支持有状态操作（如入库）。

- **处理器 (Handlers)**:
    - 实现了 `ColumnMappingHandler`: 支持 DataFrame 列名重命名，展示了如何通过 `params_schema` 定义动态参数。
    - (计划中) `DatabaseSaveHandler`: 将作为 ETL 的终点，负责将数据写入通过 `DataTableConfig` 定义的物理表。

- **API 接口**:
    - 实现了 `server/api/v1/etl.py`: 提供 Handler 发现 (`GET /handlers`)、CSV 预览 (`POST /preview-source`) 和任务配置 CRUD。
    - 实现了 `server/api/v1/data_tables.py`: 提供数据表配置的 CRUD。
    - 所有接口均已注册到 `server/main.py`。

### 2. 前端协作
- **开发指南**: 编写并更新了 `FRONTEND_ETL_GUIDE.md`。详细定义了页面路由、交互逻辑和 API 数据结构，作为分发给前端开发 AI 的任务说明书。重点补充了“数据表管理”模块的设计。

### 3. 系统维护与运维 (DevOps)
- **服务管理**: 开发了 `manage.py`，统一了服务的启动、停止和状态检查流程，解决了直接运行 `python server/main.py` 导致的日志和路径问题。
- **诊断工具**: 
    - `inspect_tables.py`: 用于检查逻辑配置表与物理数据库表的一致性。
    - `fix_tables.py`: 修复“幽灵表”（状态为 Created 但物理表不存在）的数据不一致问题。
    - `check_dbs.py`: 快速列出服务器上的所有数据库，辅助排查连接问题。
- **文档**: 更新了 `README.md`，加入了服务管理和数据表状态流转的说明。

### 4. 核心逻辑优化
- **数据表状态机**: 
    - 修改 `DataTableConfig` 模型，新增 `last_published_at` 字段。
    - 升级 API 逻辑，引入 `Sync State` (已同步/待同步) 概念，解决了“修改已发布表配置后状态不明确”的痛点。
    - (待验证) 编写了 `manual_migrate.py` 用于补充数据库字段。

## 下一步计划
1.  **前端适配**: 更新 React 前端以适配新的 `Sync State` 逻辑，展示“待同步”状态并提供“应用变更”按钮。
2.  **实现 `DatabaseSaveHandler`**: 完成数据入库逻辑。
3.  **实现 Runner**: 编写 `server/etl/runner.py`，串联 Loader、Pipeline 和 Event Service，实现真正的任务执行。