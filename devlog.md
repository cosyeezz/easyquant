# EasyQuant 开发日志

> **格式说明**: 每条日志按时间倒序排列，最新的在最上面。AI 可通过阅读本文件快速恢复上下文。

---

## 2025-12-24 #8 [VERSION_CONTROL_FRONTEND]

### 📋 本次完成
- 前端适配版本控制 API（草稿字段映射）
- 实现 `PublishModal` 发布弹窗组件
- 节点列表显示版本徽章（RELEASE/SNAPSHOT/Draft）
- 状态筛选支持 published/draft

### 📁 变更文件
| 文件 | 变更类型 | 说明 |
|-----|---------|------|
| `client/src/components/WorkflowNodeList.jsx` | 修改 | 添加 PublishModal、版本徽章、handlePublish |

### 🔧 关键代码
```javascript
// fetchNodes 映射草稿字段
const normalizedData = data.map(node => ({
  ...node,
  parameters_schema: node.draft_parameters_schema,
  outputs_schema: node.draft_outputs_schema,
  // ...
}))

// handlePublish 调用发布 API
await fetch(`/api/v1/workflow/nodes/${id}/publish`, {
  method: 'POST',
  body: JSON.stringify({ version_type, changelog })
})
```

### ⏭️ 下一步
- [ ] 测试完整的发布流程
- [ ] 画布节点选择器集成版本选择
- [ ] 版本历史查看界面

### 🔗 上下文
- 后端 API 已完成（见 #7）
- 数据库迁移已执行
- 当前状态：前端基本可用，需要端到端测试

---

## 2025-12-24 #7 [VERSION_CONTROL_BACKEND]

### 📋 本次完成
- 设计 Maven 风格版本语义（SNAPSHOT/RELEASE）
- 重构数据库模型，分离草稿与发布版本
- 新增 `workflow_node_versions` 版本历史表
- 实现完整的版本管理 API

### 📁 变更文件
| 文件 | 变更类型 | 说明 |
|-----|---------|------|
| `server/storage/models/workflow_node.py` | 重写 | 新增草稿字段、版本关系 |
| `server/api/v1/workflow.py` | 重写 | 版本管理 API |
| `alembic/versions/457c2176c7ac_*.py` | 新增 | 数据迁移脚本 |

### 🔧 关键设计
```
版本号规则:
- SNAPSHOT: 1.0.0-SNAPSHOT (可覆盖)
- RELEASE: 1.0.0 (不可变)

递增逻辑:
- 发布 SNAPSHOT: latest_release.minor + 1 → 1.1.0-SNAPSHOT
- 发布 RELEASE: 去除 -SNAPSHOT 后缀

数据库字段:
- draft_* 字段: 编辑中的草稿
- latest_snapshot/latest_release: 版本指针
- workflow_node_versions: 版本快照存储
```

### 🔗 依赖
- 需要执行 `alembic upgrade head`

---

## 2025-12-24 #6 [UI_CENTERED_MODAL]

### 📋 本次完成
- 节点选择器改为全屏居中模态框
- 添加背景遮罩和毛玻璃效果
- 修复 i18n 分类显示 Bug

### 📁 变更文件
| 文件 | 变更类型 | 说明 |
|-----|---------|------|
| `client/src/components/workflow/block-selector/` | 修改 | 居中布局重构 |

---

## 2025-12-24 #5 [UI_SPLIT_VIEW_SELECTOR]

### 📋 本次完成
- 节点选择器改为左右分栏布局
- 左侧分类栏 + 右侧节点列表
- Hover 触发分类切换
- 新增 Data/Quant 分类

### 📁 变更文件
| 文件 | 变更类型 | 说明 |
|-----|---------|------|
| `client/src/components/workflow/block-selector/` | 重构 | Split-View 布局 |
| `client/src/i18n/*/workflow.ts` | 修改 | 新增分类翻译 |
| `client/src/components/workflow/node-adapter.ts` | 修改 | 分类映射逻辑 |

---

## 2025-12-24 #4 [CRITICAL_NODE_CRASH_FIX]

### 📋 本次完成
- 修复自定义节点添加时崩溃问题
- 添加元数据防御性访问
- 确保 type 字段正确透传

### 📁 变更文件
| 文件 | 变更类型 | 说明 |
|-----|---------|------|
| `client/src/components/workflow/hooks/use-nodes-interactions.ts` | 修改 | 空值检查 |
| `client/src/components/workflow/block-selector/add-block.tsx` | 修改 | 空值检查 |

### 🔧 关键修复
```typescript
const meta = nodesMetaDataMap?.[type]
const defaultValue = meta ? meta.defaultValue : { title: type }
```

---

## 2025-12-24 #3 [DYNAMIC_NODE_RENDER]

### 📋 本次完成
- 修复自定义节点渲染显示 "Initializing Node..."
- 实现节点组件映射回退到 ToolNode
- 创建 node-adapter.ts 适配器

### 📁 变更文件
| 文件 | 变更类型 | 说明 |
|-----|---------|------|
| `client/src/components/workflow/nodes/index.tsx` | 修改 | 组件回退逻辑 |
| `client/src/components/workflow/node-adapter.ts` | 新增 | 后端→前端适配 |
| `client/src/components/ETLTaskEditor.jsx` | 修改 | 动态节点注入 |

---

## 2025-12-24 #2 [OUTPUTS_SCHEMA_FIX]

### 📋 本次完成
- 修复出参保存后丢失的严重 Bug
- 后端模型/API 新增 outputs_schema 字段
- 参数名自动递增命名

### 📁 变更文件
| 文件 | 变更类型 | 说明 |
|-----|---------|------|
| `server/storage/models/workflow_node.py` | 修改 | 新增 outputs_schema |
| `server/api/v1/workflow.py` | 修改 | Schema 新增字段 |
| `client/src/components/WorkflowNodeList.jsx` | 修改 | generateUniqueName() |

---

## 2025-12-24 #1 [NODE_EDITOR_UX]

### 📋 本次完成
- 参数编辑功能修复（onEdit 实现）
- 参数卡片紧凑化（单行布局）
- 拖拽排序替代箭头按钮

### 📁 变更文件
| 文件 | 变更类型 | 说明 |
|-----|---------|------|
| `client/src/components/WorkflowNodeList.jsx` | 修改 | 编辑/拖拽功能 |

### 🔧 关键实现
```javascript
// HTML5 拖拽 API
draggable={isEditing}
onDragStart={(e) => { e.dataTransfer.setData('text/plain', paramKey) }}
onDragOver={(e) => { e.preventDefault(); onDragOver?.(paramKey) }}
onDragEnd={() => handleReorder()}
```

---

## 2025-12-24 #0 [WORKFLOW_SAVE_FIX]

### 📋 本次完成
- 修复任务保存时画布状态滞后问题
- 引入 Imperative Handle (Ref) 模式
- Workflow 组件暴露 getGraphData() 方法

### 📁 变更文件
| 文件 | 变更类型 | 说明 |
|-----|---------|------|
| `client/src/components/workflow/index.tsx` | 修改 | forwardRef + getGraphData |
| `client/src/components/ETLTaskEditor.jsx` | 修改 | 保存时调用 ref |

---

## 2025-12-22 #3 [DESIGN_DOC]

### 📋 本次完成
- 产出工作流引擎设计文档
- 定义参数类型系统（10种入参 + 8种出参）

### 📁 变更文件
| 文件 | 变更类型 | 说明 |
|-----|---------|------|
| `docs/workflow-design.md` | 新增 | 完整设计规范 |

---

## 2025-12-22 #2 [I18N]

### 📋 本次完成
- 前端国际化基础设施
- 独立 easyquant namespace

---

## 2025-12-14 [REACT_FLOW_MIGRATION]

### 📋 本次完成
- 弃用线性 Pipeline 编辑器
- 全面转向 React Flow 图编辑器
- 确立 Dify/Coze 风格视觉标准

---

# 📖 日志格式模板

```markdown
## YYYY-MM-DD #N [TAG]

### 📋 本次完成
- 完成项 1
- 完成项 2

### 📁 变更文件
| 文件 | 变更类型 | 说明 |
|-----|---------|------|
| `path/to/file` | 新增/修改/删除 | 简要说明 |

### 🔧 关键代码 (可选)
\`\`\`language
// 核心代码片段
\`\`\`

### ⏭️ 下一步 (可选)
- [ ] 待办项 1
- [ ] 待办项 2

### 🔗 上下文 (可选)
- 依赖说明
- 当前状态
```

**使用说明**:
1. 每次更新在文件顶部新增一条记录
2. TAG 使用大写下划线格式，便于搜索
3. 变更文件表格帮助快速定位代码
4. "下一步"帮助 AI 恢复上下文后知道接下来做什么
5. "上下文"记录关键状态和依赖关系
