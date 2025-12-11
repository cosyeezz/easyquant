# 开发日志 (2025-12-11)

## 概述

本日开发聚焦于 **数据表管理系统的核心进化**。我们从简单的“创建”模式升级到了支持**全量生命周期管理**的强大引擎。现在，用户可以自由地重命名已发布的表、增删列、修改索引和描述，系统会自动处理复杂的同步逻辑。

## 详细工作项

### 1. 动态表结构同步引擎 (Schema Sync Engine)
- **全量 Diff & Patch**:
    - 在 `DDLGenerator` 中实现了 `generate_sync_sqls`。
    - **列同步**: 支持自动检测并生成 `ADD COLUMN` 和 `DROP COLUMN` 语句。
    - **索引同步**: 采用稳健的 "Drop All & Re-create" 策略，确保物理索引与配置完全一致，解决了索引名冲突和过时索引残留问题。
    - **描述同步**: 支持 `COMMENT ON TABLE` 和 `COMMENT ON COLUMN` 的增量更新。

- **物理重命名 (Physical Rename)**:
    - 在 `update_data_table` 接口中实现了**立即重命名**逻辑。
    - 当用户修改“物理表名”时，系统会自动检测并执行 `ALTER TABLE RENAME TO`。
    - 结合**快照对比 (Snapshot Comparison)** 机制，确保重命名操作能正确触发状态流转（变为 `DRAFT`），引导用户进行后续的结构同步。

- **状态机强化**:
    - 重构了 `update_data_table`，引入了严格的“旧值 vs 新值”对比。
    - 任何涉及物理结构的变更（表名、列、索引、描述）都会强制将表状态置为 `DRAFT`。
    - 前端列表页据此显示“待同步”状态和“更新结构”按钮，形成了闭环的用户体验。

### 2. 核心 Bug 修复
- **SQLAlchemy Inspect 修复**:
    - 诊断发现 `session.run_sync(fn)` 传递的是 `Session` 对象而非 `Connection`，导致 `inspect()` 报错。
    - 修复为 `inspect(session.connection())`，彻底解决了“发布失败”的 500 错误。
- **UI 交互修复**:
    - 移除了前端对已发布表名的禁用限制，允许用户自由改名。
    - 优化了按钮文案（“保存” -> “更新配置”），减少歧义。

### 3. 工具链
- **诊断脚本**: 编写了 `debug_publish.py`，这是一个独立的异步脚本，用于模拟 API 的发布流程。它在定位 `inspect` 问题上发挥了关键作用，未来可用于排查复杂的数据库交互问题。

## 下一步计划
1.  **实现 `DatabaseSaveHandler`**: 既然表结构管理已经极其完善，现在是时候实现 ETL 的最后一步——数据入库了。
2.  **ETL Runner 实现**: 串联 Loader -> Pipeline -> Handler 的执行引擎。

---

# 开发日志 (2025-12-08)

## 概述

本日开发聚焦于 **用户体验 (UX) 的深度优化** 与 **核心业务流程的闭环**。我们完成了数据表从“草稿”到“发布”的完整状态流转逻辑，引入了现代化 UI 组件库，修复了关键的 SQL 生成 bug，并增强了系统的可观测性（实时日志监控）。

## 详细工作项

### 1. 数据表管理 (Data Warehouse) 闭环
- **发布流程实现**:
    - **后端**: 新增 `POST /data-tables/{id}/publish` 接口。实现了 `DDLGenerator` 的增强版，支持：
        - SQL 保留字检查 (PostgreSQL)。
        - 命名规范正则校验。
        - 严格的 Schema 校验 (主键存在性、索引列引用)。
        - **[FIX] 自动索引命名**: 修复了当用户未提供索引名称时生成无效 SQL (`CREATE INDEX ON ...`) 的问题，现在会自动生成规范名称。
        - 事务性 DDL 执行 (Create Table + Create Index)。
    - **前端**: 在 `DataTableEditor` 中实现了发布入口。
        - 状态驱动的 UI: 仅在 `DRAFT` 状态显示“发布上线”按钮。
        - **自定义模态框 (Modal)**: 替换了原生的 `window.confirm/alert`，提供清晰的风险提示（不可逆操作），并在操作失败时直接在弹窗内优雅展示错误信息。

- **分类管理系统**:
    - 实现了数据表分类的完整 CRUD。
    - 前端新增 `CategoryManagerModal`，支持在编辑表结构时直接管理分类。

- **字段编辑器优化**:
    - 扩展了 PostgreSQL 数据类型支持（`JSONB`, `UUID`, `ARRAY`, `NUMERIC` 等）。
    - 实现了**实时字段级校验**：输入时即时检查命名规范和重复性，并提供红框高亮和错误提示。
    - **UI 布局优化**: 将全局错误提示移动到编辑器底部左侧（保存按钮旁），确保用户在点击保存时能立即看到反馈。

### 2. 前端 UI/UX 重构
- **UI 组件化**:
    - 开发了通用的 `Select` 组件（基于 Headless UI 思想），替换了所有原生的丑陋 `<select>` 标签，支持自定义样式和交互。
    - 统一了 Modal 弹窗风格，支持 Success/Warning/Error 多种状态。
- **列表页美化**: 重构了 `DataTableList`，将删除和发布操作的确认弹窗全部升级为自定义 Modal，彻底移除原生 `alert`。

### 3. 可观测性 (Observability)
- **实时日志监控**:
    - 后端新增 `GET /api/v1/system/logs/{service}` 接口，支持读取 Server 和 Client 的实时日志。
    - 前端 `ProcessMonitor` 底部新增 **Terminal 风格日志查看器**，支持自动轮询刷新。
    - **[FIX] 异常日志**: 修复了 API 捕获异常时未记录日志的问题，确保所有后端错误（如 SQL 执行失败）都能在监控终端中查看。

### 4. 运维与稳定性 (DevOps)
- **`manage.py` 核心修复**:
    - 解决了 macOS/Linux 下 `subprocess` 文件描述符继承导致的 `OSError: [Errno 9] Bad file descriptor` 问题。
    - 采用了更健壮的 `nohup` 风格启动方式 (`stdin=DEVNULL`, `stdout/stderr` 重定向)，确保服务与控制台完全解耦。

## 下一步计划
1.  **实现 `DatabaseSaveHandler`**: 万事俱备，只欠东风。现在表结构已就绪，下一步必须打通数据入库逻辑。
2.  **ETL Runner 实现**: 串联 Loader -> Pipeline -> Handler 的执行引擎。

---

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
