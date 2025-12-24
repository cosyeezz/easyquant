# 开发日志 (2025-12-24 Update 6) [UI REFACTOR: CENTERED COMMAND PALETTE]

## 节点选择器交互终极优化 (居中模态框模式)

本次更新将节点选择器从“跟随弹出”模式升级为“全屏居中模态框”模式，提供了更稳定、更专业的交互体验。

### 1. 居中模态框布局 (Centered Modal)
- **位置固定**: 彻底弃用了基于鼠标位置或按钮位置的动态对齐。现在，无论在何处触发添加节点，面板都会**严格固定在屏幕正中央**。
- **背景遮罩**: 引入了半透明背景遮罩 (`bg-black/20`) 和毛玻璃效果 (`backdrop-blur-sm`)，显著提升了编辑器的沉浸感并增强了视觉聚焦。
- **稳定性**: 解决了在边缘点击或搜索输入时面板“乱跑”和位移的问题。

### 2. 视觉一体化与 I18N 修复
- **搜索框统合**: 移除了搜索框周围的生硬边框，将其背景改为半透明，使其与面板主体融为一体。
- **i18n 补全**: 修复了分类栏首项显示 `workflow.tabs.-` 的 Bug，现在正确显示为“全部”。
- **指示器增强**: 侧边栏选中态现在使用左侧垂直胶囊条作为指示器，风格更趋近于现代专业 IDE。

### 3. 分栏逻辑微调
- **宽度优化**: 侧边栏宽度固定为 `160px`，确保所有量化相关的分类标题都能完整展示。
- **防抖切换**: 保持 80ms 的 hover 切换延迟，既保证了响应速度，又避免了快速移动鼠标时的视觉闪烁。

---

# 开发日志 (2025-12-24 Update 5) [UI REFACTOR: CASCADING NODE SELECTOR]

## 节点选择器交互重构 (二级菜单/分栏布局)

本次更新彻底重构了工作流画布中“添加节点”的交互模式，将原有的 Dify 选项卡平铺样式升级为高效的 **Split-View 分栏布局**。

### 1. 左右分栏交互设计 (Split-View Layout)
- **左侧分类栏**: 垂直排列所有节点分类（数据读写、量化分析、逻辑、转换等）。
- **右侧节点面板**: 实时展示当前选中分类下的具体节点。
- **Hover 触发**: 鼠标悬停左侧分类时，右侧列表自动切换，极大地减少了点击次数。
- **搜索增强**: 保留顶部搜索框。输入关键词时，布局自动回退至**全局扁平列表**，方便用户跨分类快速定位。

### 2. 节点分类体系扩展
- **新增分类**: 引入了 `Data` (数据读写) 和 `Quant` (量化分析) 两个专业量化分类。
- **多语言支持**: 补充了对应的 i18n 翻译 (`workflow.ts`)。
- **智能适配 (`node-adapter.ts`)**: 建立了完善的数据库字段到前端分类的映射映射映射：
    - `input` / `output` / `data` ➔ **数据读写**
    - `quant` ➔ **量化分析**
    - `problem_understanding` ➔ **问题理解**
    - `strategy` / `logic` ➔ **逻辑**

---

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

### 3. 参数拖拽排序 (Drag & Drop)
- **弃用**: 上下箭头按钮
- **新增**: HTML5 原生拖拽 API 实现
- **实现**:
  - `draggingInputKey` / `dragOverInputKey` 状态追踪
  - `handleInputDragEnd` / `handleOutputDragEnd` 处理重排序

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

---

# 开发日志 (2025-12-22 Update 2) [I18N SUPPORT]

## 国际化架构 (Internationalization)

为了支持多语言环境并提升系统的通用性，我们完成了前端国际化 (i18n) 基础设施的搭建与集成。

### 1. 架构选型
- **核心库**: 沿用 `i18next` 生态，结合 `react-i18next` 实现 React 组件层面的响应式翻译。
- **命名空间**: 引入独立的 `easyquant` namespace，与 Dify 遗留的翻译资源隔离，避免键值冲突。
- **持久化**: 使用 `js-cookie` 存储用户语言偏好 (`LOCALE_COOKIE_NAME`)，确保刷新后状态保留。

---

# 开发日志 (2025-12-14)

## 概述

本日工作的核心是 **ETL 任务编辑器架构的根本性升级**。我们正式弃用了基于线性列表（Linear List）的 Pipeline 编辑器，全面转向基于 **React Flow** 的 **节点导向图编辑器 (Node-based Graph Editor)**。

此次重构不仅是技术栈的变更，更是用户体验（UX）的质变。我们将交互模式从“表单填空”升级为“可视化编排”，并针对节点样式进行了像素级的打磨，确立了 **"Dify/Coze 风格"** 的紧凑型（Miniature/Compact）视觉标准。

# 开发日志 (2025-12-13)
(已归档，内容见历史记录...)
