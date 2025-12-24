# 开发日志 (2025-12-24 Update 4) [CRITICAL FIXES]

## 节点添加流程稳定性修复

本次更新彻底解决了自定义节点（Dynamic Nodes）在添加时导致的崩溃和 "Initializing Node..." 错误。

### 1. 元数据防御性访问 (Defensive Metadata Access)
- **问题**: 在通过“连线添加” (`use-nodes-interactions.ts`) 或“侧边栏添加” (`add-block.tsx`) 新节点时，代码直接访问 `nodesMetaDataMap![type]`。对于刚注册的自定义节点，其元数据可能尚未同步到 Store 中，导致 `undefined` 访问崩溃或数据缺失。
- **修复**: 在两处代码中均增加了空值检查与回退机制：
    ```typescript
    const meta = nodesMetaDataMap?.[type]
    const defaultValue = meta ? meta.defaultValue : { title: type }
    ```
- **效果**: 即使元数据暂时缺失，也能使用默认标题（节点类型名）成功创建节点，避免了 UI 崩溃和 "undefined" 标题。

### 2. 确保类型字段透传
- **问题**: `node-adapter` 生成的 `defaultValue` 不包含 `type` 字段，导致 `CustomNode` 渲染时因缺失类型而显示 "Initializing Node..."。
- **修复**: 在节点创建逻辑中显式注入 `type` 字段到 `data` 对象中，确保 `CustomNode` 能正确识别并加载对应的组件（或 fallback 到 `ToolNode`）。

---

# 开发日志 (2025-12-24 Update 3) [DYNAMIC NODE FIX]

## 自定义节点动态加载与渲染修复

本次更新解决了自定义节点在画布中无法正确渲染（显示 "Initializing Node..." 和 "undefined"）的关键问题。

### 1. 节点组件映射回退 (Node Component Fallback)
- **问题**: 自定义节点（如 `csv_loader`）的 `type` 不在 React Flow 的硬编码映射表 (`NodeComponentMap`) 中，导致组件加载失败。
- **修复**: 在 `easyquant/client/src/components/workflow/nodes/index.tsx` 中实现了显式的回退逻辑。
- **逻辑**: 当 `NodeComponentMap[nodeData.type]` 为空时，强制使用通用的 `ToolNode` 和 `ToolPanel` 组件进行渲染。这确保了所有动态定义的节点都能以“工具节点”的形态正常展示。

### 2. 节点元数据适配与合并 (Metadata Adapter & Merge)
- **适配器**: 创建了 `node-adapter.ts`，负责将后端数据库返回的节点 JSON 结构转换为前端工作流引擎所需的 `NodeDefault` 格式。
- **动态注入**: 在 `ETLTaskEditor` 中实现了动态获取节点列表的逻辑，并将自定义节点与系统内置节点（Start, End, Loop 等）合并后注入到 `Workflow` 组件的 Context 中。

### 3. 类型展示优化 (Type Badges)
- **UI 改进**: 在任务列表页和编辑器头部，为不同类型的任务（ETL, Backtest, Live）添加了颜色区分的 Badge，提升了视觉识别度。

---

# 开发日志 (2025-12-24 Update 2) [OUTPUTS_SCHEMA & AUTO-NAMING]

## 节点出参持久化与参数命名优化

本次更新修复了节点出参无法保存的严重 Bug，并优化了参数添加的用户体验。

### 1. 出参丢失问题修复 (Critical Bug)
- **问题**: 添加出参后保存节点，重新打开时出参数据丢失
- **根因**: 后端数据库模型和 API Schema 均缺少 `outputs_schema` 字段
- **修复**:
  - `server/storage/models/workflow_node.py`: 新增 `outputs_schema = Column(JSON, nullable=False, default={})`
  - `server/api/v1/workflow.py`: 三个 Schema 类均新增 `outputs_schema` 字段
  - 创建数据库迁移，处理现有数据（先添加可空列，设置默认值 `{}`，再改为非空）

### 2. 参数名自动递增命名
- **问题**: 添加同类型参数时，默认名称重复导致覆盖
- **修复**: 新增 `generateUniqueName(baseName)` 函数
- **逻辑**: 检查 `existingKeys`，若 `file_path` 已存在，自动生成 `file_path_1`、`file_path_2` 等
- **实现**: Modal 组件新增 `existingKeys` prop，传入当前已有的参数名列表

### 3. Modal 状态重置问题
- **问题**: 关闭再打开添加参数弹窗时，显示上次选择的类型而非类型选择界面
- **原因**: `useState(initialState)` 仅在组件首次渲染时计算
- **修复**: 改用 `useEffect` 监听 `isOpen` 变化，每次打开时重置状态

### 4. 移除后台同步功能
- **变更**: 删除 "Sync Code" 按钮及 `handleSync` 函数
- **原因**: 节点定义改为完全由页面驱动，不再依赖后台代码扫描
- **影响**: 简化了节点管理流程，所有节点通过 UI 创建和编辑

### 5. 数据库迁移
```sql
-- alembic/versions/f000991a1dff_add_outputs_schema_to_workflow_nodes.py
ALTER TABLE workflow_nodes ADD COLUMN outputs_schema JSON;
UPDATE workflow_nodes SET outputs_schema = '{}' WHERE outputs_schema IS NULL;
ALTER TABLE workflow_nodes ALTER COLUMN outputs_schema SET NOT NULL;
```

---

# 开发日志 (2025-12-24) [WORKFLOW NODE EDITOR UX]

## 节点参数管理器交互升级

本次更新对工作流节点管理界面 (`WorkflowNodeList.jsx`) 进行了多项 UX 改进，重点优化了参数的编辑与排序体验。

### 1. 参数编辑功能修复
- **问题**: 点击已添加参数的编辑按钮无响应
- **原因**: `onEdit` 处理函数仅为占位符 (TODO)
- **解决方案**:
  - 新增 `editingInputParam` / `editingOutputParam` 状态
  - 扩展 `AddParamModal` 支持编辑模式 (`editData` prop)
  - 实现 `handleUpdateInputParam` / `handleUpdateOutputParam` 更新逻辑
  - 修复编辑模式下 `selectedType` 为 null 导致保存失败的问题

### 2. 参数卡片紧凑化
- **变更**: 从两行布局改为单行内联布局
- **优化项**:
  - 缩小图标、字体、内边距
  - "Required" 文字简化为 `*` 符号
  - 所有信息（图标、标题、Key、类型、必填标记）水平排列

### 3. 区块视觉层级优化
- **Input/Output 标题**: 改为大写、加粗、增加字间距 (`tracking-widest`)
- **分隔线**: 标题下方添加底边框，与参数列表明确分隔
- **添加按钮**: 简化为图标 + 文字的轻量样式

### 4. 参数拖拽排序 (Drag & Drop)
- **弃用**: 上下箭头按钮
- **新增**: HTML5 原生拖拽 API 实现
- **交互**:
  - 通过 `GripVertical` 手柄图标拖拽
  - 拖拽时源卡片半透明
  - 目标位置显示虚线边框和浅色背景
- **实现**:
  - `draggingInputKey` / `dragOverInputKey` 状态追踪
  - `handleInputDragEnd` / `handleOutputDragEnd` 处理重排序

### 5. Tooltip 主题适配
- **问题**: 文本截断提示框 (Tooltip) 固定为深色背景
- **修复**: 改为主题感知 (`bg-white dark:bg-[#2a2a2e]`)
- **优化**: 扁平化布局，复制按钮内联显示

### 6. 代码变更
- `client/src/components/WorkflowNodeList.jsx`
  - 移除 `ArrowUp`, `ArrowDown` 图标导入
  - 重构 `ParamCard` / `OutputParamCard` 组件支持拖拽
  - 新增 4 个拖拽状态变量
  - 替换移动处理函数为拖拽处理函数

---

# 开发日志 (2025-12-24) [WORKFLOW SAVE & SYNC]

## 工作流保存与代码同步机制修复

本次更新修复了两个影响核心可用性的关键问题：任务保存时状态滞后导致的数据丢失，以及节点代码同步功能的缺失。

### 1. 任务保存机制重构 (Task Saving)
- **问题**: 点击保存按钮时，后端存储的 DSL (`graph_config`) 往往落后于当前画布状态，导致最新的拖拽或连线操作丢失。
- **原因**: 原有的“父子组件状态同步”机制存在延迟。`onWorkflowDataUpdate` 回调过于被动，无法捕获保存前一瞬间的操作。
- **解决方案**: 
    - 引入 **Imperative Handle (Ref)** 模式。
    - `Workflow` 组件通过 `forwardRef` 暴露 `getGraphData()` 方法，直接调用 React Flow 实例获取实时数据。
    - `ETLTaskEditor` 在点击保存时，主动调用该 Ref 方法获取最新快照，彻底弃用被动同步 State。

### 2. 代码同步功能 (Code Sync)
- **问题**: `WorkflowNodeList` 页面报错 `handleSync is not defined`，且缺少手动触发代码扫描的入口。
- **解决方案**:
    - 实现了 `POST /api/v1/workflow/nodes/sync` 的前端调用逻辑。
    - 在工具栏新增 "Sync Code" 按钮，允许开发者手动触发后端扫描 `server/etl/process/handlers` 目录下的新节点类。

### 3. 任务创建体验优化
- **问题**: 点击“新建任务”后无反应或弹窗无内容。
- **修复**:
    - 重构 `Modal` 组件，支持 `children` 渲染，从而正确显示“任务名称”输入表单。
    - 增加错误处理，若创建返回的 ID 为空则显式报错。
    - 修复 Task ID 截取字符串时的类型错误 (`taskId.substring` -> `String(taskId).substring`)。

---

# 开发日志 (2025-12-22 Update 3) [WORKFLOW DESIGN DOC]

## 工作流引擎设计文档 - 完整规范

本次更新产出了完整的工作流引擎设计文档 (`docs/workflow-design.md`)，涵盖节点定义、参数类型系统、列级数据流控制及 CRUD 交互规范。

### 1. 参数类型系统 (Parameter Type System)

**入参类型 (10 种)**:
| 类型 | 说明 |
|-----|------|
| `file_picker` | 文件/文件夹选择器 |
| `limit` | 数量限制 (前N条/后N条/百分比) |
| `number` | 数值输入 |
| `text` | 文本输入 |
| `select` | 下拉单选 |
| `multi_select` | 下拉多选 |
| `upstream_column` | 上游列选择 (单选) |
| `upstream_columns` | 上游列选择 (多选) |
| `db_table` | 数据库表选择 |
| `code` | 代码编辑器 (Python/SQL) |

**出参类型 (8 种)**:
`df`, `signal`, `file`, `chart`, `metrics`, `message`, `json`, `status`

### 2. 类型专属配置 (Type-Specific Config)
- 每种入参类型都有专属的配置项（如 `file_picker` 有 `accept`, `multiple`）
- 选择类型后动态展示对应配置表单
- 实现"类型 → 配置"的驱动模式

### 3. 列级数据流控制 (Column-Level Flow)
- **显式选择**: 必须明确勾选要输出的列，不做隐式透传
- **冲突报错**: 多输入时列名冲突直接报错，需在上游先重命名
- **多端口分发**: 同一节点的不同列可输出到不同端口
- **丰富元信息**: 列定义包含类型、格式、描述等完整信息

### 4. 节点 CRUD 交互设计
- **列表页**: 搜索、分类筛选、操作菜单
- **新建**: 基本信息 → 入参配置 → 出参配置
- **编辑**: 内联展开/收缩模式，非弹窗
- **删除**: 确认弹窗 + 依赖检查 + 输入确认
- **复制**: 快速基于现有节点创建副本
- **排序**: 拖拽手柄或上下按钮

### 5. 节点状态流转
```
创建中 → 草稿 (Draft) ↔ 已启用 (Active) → 已删除 (Deleted)
```

### 6. 文档位置
- `/docs/workflow-design.md` - 完整设计规范 (1000+ 行)

---

# 开发日志 (2025-12-22 Update 2) [I18N SUPPORT]

## 国际化架构 (Internationalization)

为了支持多语言环境并提升系统的通用性，我们完成了前端国际化 (i18n) 基础设施的搭建与集成。

### 1. 架构选型
- **核心库**: 沿用 `i18next` 生态，结合 `react-i18next` 实现 React 组件层面的响应式翻译。
- **命名空间**: 引入独立的 `easyquant` namespace，与 Dify 遗留的翻译资源隔离，避免键值冲突。
- **持久化**: 使用 `js-cookie` 存储用户语言偏好 (`LOCALE_COOKIE_NAME`)，确保刷新后状态保留。

### 2. 功能实现
- **语言切换器 (Language Switcher)**: 在 Header 区域集成了中英文切换组件，支持即时切换。
- **自动检测**: 初始化时优先读取 Cookie，缺省回退至 `zh-Hans`。
- **覆盖范围**: 完成了 `DataTableList`（列名、筛选器、分页）、导航栏 (`Nav`)、状态栏 (`Status`) 的全量翻译。

### 3. 关键修复
- **Key Resolution**: 修复了 Dify 架构下多模块 namespace 合并导致的 Key 解析失败问题，通过 `keyPrefix: 'easyquant'` 实现了正确的层级映射。
- **State Persistence**: 修复了页面刷新后语言重置为默认值的问题，加入了显式的 Cookie 读取逻辑。

---

# 开发日志 (2025-12-22) [UI REFACTOR]

## 全站视觉重构 - Linear/Stripe Fintech Aesthetic

本次更新将 EasyQuant 的用户界面重构为极简的 **"Linear/Stripe"** 金融科技风格，强调数据的可读性与专业感。

### 1. 视觉语言 (Visual Language)
- **色彩体系**: 确立了以 **Deep Blue** 为主色调，搭配 **Refined Greys** (冷灰) 的底色系统。
- **边框风格**: 采用极致轻薄的 **Thin Borders** (`1px` solid / subtle)，去除多余的阴影和圆角，营造精密的工具感。
- **排版**: 关键数值与状态显示全面启用 **Monospace Data Fonts** (等宽字体)，确保数据对齐整洁。

### 2. 交互与布局 (UX & Layout)
- **Minimalist Header**: 重设计了顶部导航栏，去除视觉噪点，仅保留核心操作。
- **Breathing Status**: 引入了“呼吸式”状态指示点 (Breathing Dots)，直观展示系统/任务的实时运行状态。
- **高密度列表**: 优化了 `DataTableList`，通过紧凑的行高和精细的分割线，提升单屏信息密度。

### 3. 涉及组件
- `index.css`: 全局样式变量与重置。
- `App.jsx`: 布局结构调整。
- `ProcessMonitor.jsx`: 状态监控组件样式升级。
- `DataTableList.jsx`: 数据表格视觉优化。

---

# 开发日志 (2025-12-21 Update 5) [PROD-READY NODE EDITOR]

## 节点能力管理 - 生产级可视化编辑器

本次更新实现了节点定义的完整闭环，将“节点能力”从简单的代码同步升级为可在线编辑、动态配置的生产级管理模块。

### 1. 结构化参数编辑器 (Visual Parameter Editor)
- **去 JSON 化交互**: 彻底弃用了原始 JSON 编辑，转而使用属性列表。支持可视化配置：字段 ID、显示标题、数据类型（String/Number/Boolean/Object/Array）、UI 格式（Path/Textarea/Column-Map/Password）、默认值及描述。
- **UI 映射预览**: 根据定义的 `format` 自动渲染模拟组件（如路径选择按钮、下拉菜单预览），实现在定义阶段即“所见即所得”。

### 2. 交互式端口管理 (Interactive Port Editor)
- **显式 I/O 定义**: 增加了对 `Inputs` (输入端) 和 `Outputs` (输出端) 的可视化编辑。用户可以为节点动态添加/重命名端口，这些定义将直接决定未来在画布上的连接点。

### 3. 全生命周期管理 (CRUD)
- **新增自定义节点**: 支持通过前端 UI 创建全新的原子节点，并持久化到数据库。
- **后端同步增强**: `PUT` 和 `POST` API 已打通，支持节点元数据（标题、分类、图标、描述）的实时更新。
- **状态维护**: 编辑模式支持实时校验与撤销（取消编辑），确保数据一致性。

### 4. 架构意义
- 本次更新标志着工作流引擎“定义层”的成熟。通过 JSON Schema 驱动 UI 的模式，极大地降低了未来扩展新功能的成本，为下一步实现“动态参数面板”和“画布节点联动”铺平了道路。

---

# 开发日志 (2025-12-21 Update 4) [TECHNICAL REQUIREMENTS]

## 通用工作流引擎：后端 API 与基础设施需求细节

为了实现生产级的通用工作流系统，后端需要提供以下核心 API 和能力支撑。

### 1. 节点元数据管理 (Node Registry API) - [已完成基础]
*   **GET `/api/v1/workflow/nodes`**: 返回所有已注册节点的完整定义（Schema、UI 配置、分类）。
*   **PUT `/api/v1/workflow/nodes/{id}`**: 更新节点定义。
*   **POST `/api/v1/workflow/nodes/sync`**: 触发代码扫描，自动同步所有 `BaseHandler` 子类的元数据到数据库。
*   **待增强**: 支持节点**版本控制**，防止修改已在线运行任务的节点定义导致崩溃。

### 2. 基础设施支撑服务 (Supportive Services) - [待实现]
*   **路径选择器 (FileSystem Picker API)**:
    *   `GET /api/v1/system/fs/ls?path=...`: 浏览服务器本地目录，支持文件/目录过滤。
    *   用于支持前端的 `PathInput` 组件，实现生产级的“浏览”按钮。
*   **元数据探测 (Metadata Discovery API)**:
    *   `POST /api/v1/workflow/inspect-schema`: 接收节点配置（如 CSV 路径），返回其输出 Schema（如列名列表）。
    *   这是实现“列名映射 (Column Mapping)”可视化编辑的关键。

### 3. 通用工作流配置 (Workflow Config API) - [待实现]
*   **POST `/api/v1/workflow/configs`**: 创建工作流配置。
*   **Payload 结构**:
    ```json
    {
      "name": "任务名称",
      "nodes": [ { "id": "node_1", "type": "csv_loader", "data": { ... } } ],
      "edges": [ { "source": "node_1", "target": "node_2" } ],
      "graph_state": { ... } // 存储 ReactFlow 画布坐标
    }
    ```
*   **需求**: 必须支持对 `nodes` 的参数进行基于 `parameters_schema` 的后端强校验。

### 4. 抽象执行引擎 (Universal Workflow Runner) - [待重构]
*   **核心逻辑**: 弃用硬编码的 ETL 步骤，改为基于 DAG (有向无环图) 的拓扑排序执行。
*   **Handler 规范**: 所有的 `BaseHandler` 必须支持 `context` 传递。
*   **生命周期钩子**: `on_node_start`, `on_node_success`, `on_node_error` 必须通过 WebSocket 实时推送事件到前端。

### 5. 动态参数渲染协议
*   后端必须在 `parameters_schema` 的 `format` 字段中显式指引前端渲染特定的高级组件：
    *   `path`: 弹出文件浏览器。
    *   `column-map`: 弹出列对齐编辑器。
    *   `cron`: 弹出定时任务配置器。

---

# 开发日志 (2025-12-21 Update 3) [STRATEGIC PLAN]

## 架构愿景：从 ETL 到通用量化工作流引擎 (Quant Workflow Engine)

我们决定将现有的 ETL 任务模块抽象并升级为**通用的工作流引擎**。系统将不再区分 ETL、回测或实盘任务，而是统一视为由不同功能节点组成的 **DAG (有向无环图)**。

### 1. 核心变更点
- **节点定义解耦**: 建立 `workflow_nodes` 元数据表，统一管理节点的能力定义、参数 Schema (JSON Schema) 和后端执行路径。
- **配置模型升级**: 将 `etl_task_configs` 抽象为 `workflow_configs`，支持更广泛的任务类型。
- **执行引擎抽象**: 开发通用的 `WorkflowRunner`，根据节点元数据动态调度执行器，支持流式处理 (ETL) 和事件驱动 (回测/实盘)。

### 2. 节点分类规划
- **Data IO**: `CSV/DB/API` 加载与存储。
- **Transform**: 基础数据清洗与转换逻辑。
- **Quant Analysis**: 技术指标 (MA, MACD)、K线合成、特征工程。
- **Strategy & Logic**: 策略逻辑、信号产生、条件分支。
- **Execution**: 回测撮合引擎与实盘交易接口。

### 3. 三阶段路线图
- **阶段 1 (元数据层)**: 建立数据库模型，实现节点能力的自动发现与注册机制，提供能力集 API。
- **阶段 2 (执行层)**: 重构后端 Runner，实现基于节点定义的动态加载与流水线编排。
- **阶段 3 (表现层)**: 改造前端 Canvas，实现基于 JSON Schema 的动态节点渲染，彻底消除前后端能力同步的硬编码。

---

# 开发日志 (2025-12-21 Update 2) [NEW]

## Canvas 主题深度集成

本次更新修复了 `easy-canvas` 组件嵌入 `easyquant` 宿主环境时的主题同步问题，确保画布样式与全站深色模式无缝融合。

### 1. 主题机制统一
- **Class-based Theming**: 将 `easy-canvas` 的主题策略从默认的 `media` 查询改为 `class` 模式，并配置 `next-themes` 监听 `class` 属性。这使其能够直接响应 `easyquant` 在 `html` 标签上切换的 `.dark` 类。
- **CSS 变量兼容**: 更新了 `easy-canvas` 的所有主题文件 (`themes/*.css`)，使其选择器同时支持 `html[data-theme="dark"]` (独立运行) 和 `:root.dark`/`html.dark` (嵌入运行)。

### 2. 视觉样式同步
- **变量注入**: 在 `easyquant/client/src/index.css` 中显式注入了画布所需的关键 CSS 变量 (如 `--color-workflow-canvas-workflow-bg`, `--color-workflow-block-bg`)，并针对深色模式定义了专用色值 (`#1D1D20`)。
- **去硬编码**: 移除了 `ETLTaskEditor` 和 `Workflow` 组件中硬编码的 `bg-white` 类，改为使用语义化的 Tailwind 类 (`bg-workflow-canvas-workflow-bg`)，实现了背景色的动态切换。
- **Tailwind 扩展**: 同步更新了宿主项目的 `tailwind.config.js`，确保画布组件使用的特定 utility classes 能被正确解析。

### 3. 结果
- 现在的 ETL 任务编辑器在切换到深色模式时，画布背景、网格点阵、节点卡片及连线颜色均能自动切换至深色风格，消除了之前的视觉割裂感。

---

# 开发日志 (2025-12-21) [NEW]

## 全站视觉系统升级 - 深色主题

本次更新实现了完整的**设计系统 (Design System)** 和**主题切换功能**。

### 1. 设计系统 (Design Tokens)
- **色彩系统**: 定义了完整的语义化颜色变量
  - 背景层级: `base`, `surface`, `elevated`, `overlay`
  - 边框层级: `subtle`, `default`, `strong`
  - 文字层级: `primary`, `secondary`, `muted`
  - 语义色: `success`, `danger`, `warning`, `info`
- **字体系统**:
  - 界面字体: Inter + PingFang SC
  - 等宽字体: JetBrains Mono (数字/代码)
- **组件规范**: 统一了按钮、输入框、卡片、表格、Badge 等组件样式

### 2. 深色/浅色主题切换
- **ThemeContext**: 实现了 React Context 管理主题状态
- **CSS 变量**: 通过 `:root.dark` / `:root.light` 切换整套色彩
- **持久化**: 主题选择保存在 localStorage
- **切换按钮**: Header 右上角添加太阳/月亮图标切换

### 3. 文件变更
- `client/src/styles/design-tokens.css` - CSS 变量定义
- `client/src/contexts/ThemeContext.jsx` - 主题状态管理
- `client/src/index.css` - 全局样式重构
- `client/tailwind.config.js` - Tailwind 扩展配置
- `client/src/App.jsx` - 主题切换按钮
- `client/src/components/DataTableList.jsx` - 深色主题适配
- `client/src/components/ui/Select.jsx` - 深色主题适配
- `client/DESIGN_SYSTEM.md` - 设计系统文档

### 4. 数据库修复
- 添加 `etl_task_configs.graph_config` 列修复 500 错误

---

# 开发日志 (2025-12-14 Update 2) [NEW]

## 交互与布局引擎升级

本次更新专注于图编辑器的**智能化**与**安全性**增强。

### 1. 智能自动布局 (Auto Layout 2.0)
- **Dagre 集成**: 引入 `dagre` 算法替代手动排版。
- **动态高度计算**: 修复了之前统一高度导致的布局错位。现在的算法会根据节点是否包含描述文本（Description）动态估算高度（Small: 60px, Large: 100px+），从而实现完美的垂直对齐。
- **参数调优**: 
    - `nodesep`: 60px (垂直间距)
    - `ranksep`: 100px (水平层级间距)
    - 结果：节点分布疏密有致，连线清晰，极大提升了阅读体验。

### 2. 连接安全机制 (Connection Safety)
- **死循环拦截 (Cycle Detection)**: 实现了基于 DFS (深度优先搜索) 的实时环路检测。当用户尝试建立 A->B->A 的连接时，系统会静默拦截，防止后端 DAG 执行死锁。
- **严格模式 (Strict Mode)**: 强制启用了 `ConnectionMode.Strict`，物理上禁止了 "Output-to-Output" 或 "Input-to-Input" 的非法连接。

### 3. 画布控制增强
- **CanvasControl 组件**: 开发了仿 Dify 的左下角悬浮工具栏，集成了 Zoom/Fit/Layout 功能，并提升了 z-index 确保其始终位于最上层。
- **连线吸附优化**: 实现了“广域吸附”——拖拽连线至目标节点任意区域即可自动连接至 Input 端口，无需精确对准微小的连接点。

---

# 开发日志 (2025-12-14)

## 概述

本日工作的核心是 **ETL 任务编辑器架构的根本性升级**。我们正式弃用了基于线性列表（Linear List）的 Pipeline 编辑器，全面转向基于 **React Flow** 的 **节点导向图编辑器 (Node-based Graph Editor)**。

此次重构不仅是技术栈的变更，更是用户体验（UX）的质变。我们将交互模式从“表单填空”升级为“可视化编排”，并针对节点样式进行了像素级的打磨，确立了 **"Dify/Coze 风格"** 的紧凑型（Miniature/Compact）视觉标准。

## 详细工作项

### 1. ETL 编辑器重构 (Graph Transformation)
- **架构迁移**:
    - **移除旧代码**: 删除了 `PipelineEditor` (列表模式) 及其相关逻辑，简化了 `ETLTaskEditor` 的状态管理。
    - **强制画布**: 步骤 2 现在默认且唯一展示 `FlowEditor`。
- **核心交互**:
    - **Drop-to-Connect (智能连接)**: 实现了从节点端口拖出连线并在空白处松开时，自动弹出“添加后续节点”的快捷菜单。点击菜单项后，系统会自动创建新节点并完成与上游的连线。
    - **Pan & Zoom**: 优化了画布导航。启用了 `panOnScroll`（滚轮移动画布），禁用了 `zoomOnDoubleClick`（防止双击误触缩放），并将默认缩放层级调整为适应紧凑视图。

### 2. 视觉设计系统 (Visual Design System)
我们确立了极度紧凑的 **"Micro-Card"** 设计语言，模仿 Dify/Coze 的高密度信息展示风格：
- **尺寸规范**:
    - **节点宽度**: 锁定在 `80px - 110px` 之间，极大节省画布空间。
    - **字体排版**: 标题字号下探至 `6px (medium)`，副标题 `5px`，行高紧凑 (`leading-none`)。
    - **图标**: 统一使用 `12px - 14px` 的微型图标，搭配半透明背景容器。
- **组件样式**:
    - **端口 (Handles)**: 使用微小的实心圆点 (`2px`)，增加白色描边以提升在连线上的对比度。
    - **操作栏**: 采用 **Hover-Reveal** 机制。重命名、复制、运行等按钮默认隐藏，仅在鼠标悬停时以绝对定位形式浮现，避免占用布局空间。
- **连线**: 弃用了动态虚线，改用细实线 (`strokeWidth: 1.5`) 配合实心箭头，提升专业感。

### 3. 状态管理 (State Management)
- **Context 重构**: 修复了 `ReactFlowProvider` 包裹层级导致的状态丢失问题。确保 `nodes` 和 `edges` 的状态提升至 `FlowContext`，以便侧边栏 (`ConfigPanel`) 和画布 (`FlowEditor`) 共享数据。
- **节点操作**:
    - 实现了**内联重命名 (Inline Rename)**：点击重命名直接在节点标题处显示 Input 框，支持回车保存。
    - 实现了**智能复制**: 复制节点时自动计算新名称后缀 (e.g., `Source_1` -> `Source_2`)。

## 架构决策记录 (ADR)

**决策 1**: **UI 复刻路线 (Copy UI)** vs 后端集成路线。
**决定**: 采用 **UI 复刻路线**。
**原因**: 我们不需要引入 Dify 庞大的后端（LLM调度、知识库等）来增加系统复杂度。我们需要的是其优秀的 **Frontend/UX 范式**。因此，我们在 React 中复刻其节点样式和交互逻辑，底层依然对接我们自己的 Python ETL 引擎 (`runner.py`)。

**决策 2**: **紧凑型节点 (Compact Nodes)**。
**原因**: ETL 流程可能非常复杂，包含数十个节点。传统的宽大卡片（Card UI）会导致画布过大，用户频繁拖拽。紧凑型设计允许用户在不缩放的情况下概览整个 Pipeline。

## 下一步计划 (Handover Context)

1.  **Schema 传播 (Schema Propagation)**:
    -   目前节点的“输入列”和“输出列”尚未真正打通。
    -   需要实现：Source 节点加载 CSV Header -> 存入 Context -> 下游 Processor 节点从 Context 读取上游 Output Schema -> 自动填充下拉菜单。
2.  **配置面板联动 (Config Panel Integration)**:
    -   完善侧边栏的表单编辑器，使其能够读写当前选中节点的 `data` 属性。
3.  **JSON 序列化与执行**:
    -   编写转换器，将 React Flow 的 `nodes/edges` JSON 转换为后端 `runner.py` 能识别的 DAG 格式。

# 开发日志 (2025-12-13)
(已归档，内容见历史记录...)
