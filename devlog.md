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
