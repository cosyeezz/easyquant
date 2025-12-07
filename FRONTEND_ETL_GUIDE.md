# 前端开发指南：ETL 任务与数据表管理模块 (生产级)

本文档旨在指导前端 AI 助手构建 EasyQuant 系统中的 ETL 任务配置及数据表管理界面。**请注意：本项目要求严格遵守实盘交易系统标准，所有设计必须严谨、完整，禁止使用简化逻辑。**

## 1. 核心目标

构建一个基于 React + Tailwind CSS 的功能模块，包含两个主要子系统：
1.  **数据表管理 (Data Warehouse Management)**: 
    *   以元数据驱动的方式管理数据仓库。
    *   **严格流程**: 定义分类 -> 创建草稿 -> 发布建表 (Publish) -> 变更管理。
    *   利用 PostgreSQL 特性（分区、丰富的数据类型）。
2.  **ETL 任务管理 (ETL Tasks)**: 
    *   编排数据处理流程，并利用“数据表管理”中定义的表作为存储目标。

## 2. 页面路由规划

| 路径 | 组件名 | 描述 |
| :--- | :--- | :--- |
| `/tables` | `DataTableList` | 数据表列表管理 (含发布状态) |
| `/tables/new` | `DataTableEditor` | 创建新数据表草稿 |
| `/tables/:id/edit` | `DataTableEditor` | 编辑数据表配置 (草稿状态可全改，已发布只能改特定字段) |
| `/etl` | `ETLTaskList` | ETL 任务列表 |
| `/etl/new` | `ETLTaskEditor` | 创建新任务（向导模式） |
| `/etl/:id/edit` | `ETLTaskEditor` | 编辑现有任务 |

---

## 3. 模块一：数据表管理 (Data Warehouse Management)

此模块用于定义“系统中有哪些表”，并负责向数据库发出 DDL 指令。

### 3.1. 关键交互规则
1.  **必填项**: 表名 (Table Name)、显示名称 (Name)、描述 (Description)、分类 (Category)。
2.  **分类依赖**: 创建表前必须选择分类。分类数据来源于后端 API。
3.  **状态流转**: 
    *   `DRAFT`: 草稿。仅保存在配置表中，物理数据库无表。可任意修改。
    *   `CREATED`: 已发布。物理数据库已建表。修改受限。
4.  **类型提示**: 前端需为不同数据类型提供场景说明（Tooltip）。

### 3.2. 数据表编辑器 (`DataTableEditor`)

**Section A: 基础信息**
*   `显示名称`: Input (e.g., "A股日线行情")
*   `物理表名`: Input (e.g., "daily_bars"). 校验: `^[a-z_][a-z0-9_]*$`。
*   `分类`: Select (API: `/api/v1/table-categories`).
*   `描述`: Textarea. **必填**。

**Section B: 字段定义 (Columns Schema)**
*   **表格交互**: 支持新增行、删除行、拖拽排序。
*   **列属性**:
    *   `列名 (Name)`: Input.
    *   `类型 (Type)`: Select. 
        *   `VARCHAR`: 文本 (e.g., 代码, 名称)
        *   `TIMESTAMPTZ`: 带时区时间 (e.g., 交易时间) **(推荐用于时间列)**
        *   `DOUBLE PRECISION`: 双精度浮点 (e.g., 价格, 金额) **(推荐用于行情)**
        *   `NUMERIC`: 高精度小数 (e.g., 财务报表)
        *   `INT/BIGINT`: 整数 (e.g., 成交量)
        *   `BOOLEAN`: 布尔值
        *   `JSONB`: 非结构化数据
    *   `主键 (Is PK)`: Checkbox.
    *   `描述 (Comment)`: Input. **必填**。

**Section C: 索引定义 (Indexes Schema)**
*   **表格交互**: 定义组合索引。
*   `索引名`: Input.
*   `包含列`: Multi-Select (从上方定义的列中选择).
*   `唯一 (Unique)`: Checkbox.

**操作按钮**:
*   [保存草稿]: `POST /api/v1/data-tables` (Status=DRAFT)
*   [发布并创建]: `POST /api/v1/data-tables/:id/publish` (仅当 ID 存在时可用)。前端需弹出二次确认框，告知将执行 DDL。

---

## 4. 模块二：ETL 任务管理 (ETL Task Management)

### 4.1. 任务配置编辑器 (`ETLTaskEditor`)

**Step 1: 基础与数据源** (同原设计)

**Step 2: 处理链路编排 (Pipeline Builder)**

*   **DatabaseSaveHandler 配置**:
    *   显示 "目标数据表" 下拉框。
    *   **数据源过滤**: 仅显示状态为 `CREATED` (已发布) 的表。
    *   **智能提示**: 选中表后，前端可展示该表的主键信息，提示用户“将根据 [ts_code, trade_date] 进行去重更新”。

**Step 3: 运行参数** (同原设计)

---

## 5. 数据结构交互 (Payload 示例)

### 5.1. 数据表配置 (Draft)
```json
{
  "name": "A股日线行情",
  "table_name": "daily_bars",
  "category_id": 1,
  "description": "存储每日个股收盘行情，包含开高低收量额。",
  "columns_schema": [
      {"name": "ts_code", "type": "VARCHAR(20)", "is_pk": true, "comment": "股票代码"},
      {"name": "trade_date", "type": "TIMESTAMPTZ", "is_pk": true, "comment": "交易日期"},
      {"name": "close", "type": "DOUBLE PRECISION", "is_pk": false, "comment": "收盘价"}
  ],
  "indexes_schema": [
      {"name": "idx_date_code", "columns": ["trade_date", "ts_code"], "unique": false}
  ]
}
```

### 5.2. 发布动作 (Publish)
*   Endpoint: `POST /api/v1/data-tables/1/publish`
*   Response: `200 OK` (包含执行日志或成功消息)

## 6. 样式与组件建议
*   **Tailwind CSS**: 统一使用深色模式友好的配色。
*   **交互反馈**: 
    *   保存草稿成功 -> Toast "草稿已保存"。
    *   发布成功 -> Toast "物理表创建成功"。
    *   发布失败 -> Modal 弹窗显示具体的数据库错误信息 (e.g., "Relation already exists")。