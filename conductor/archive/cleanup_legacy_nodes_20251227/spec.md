# Track Specification: Remove Legacy Operator Node Management

## 1. Overview
本 Track 的目标是移除系统中旧版的“算子节点 (Operator Nodes)”管理模块。这是一个遗留的列表式管理界面，目前已被新的可视化节点图编辑器 (Node-based Graph Editor) 取代。
需要清理的内容包括前端路由、UI 组件、后端 API 接口以及相关的数据库表或数据。

## 2. Scope
### 2.1 Frontend (Easy-Canvas / Client)
- **Menu:** 移除顶部或侧边栏导航中的“算子节点”菜单入口。
- **Routes:** 移除相关的路由配置 (例如 `/nodes`, `/operator-nodes` 等)。
- **Components:** 删除实现该列表页面及详情/编辑页面的 React 组件。
- **Service/Store:** 移除用于获取该页面数据的旧版前端 Service 或 Store 调用。

### 2.2 Backend (Server)
- **API Endpoints:** 删除服务于该旧版界面的 API 接口。
- **Logic:** 删除相关的 Pydantic 模型和处理逻辑代码。

### 2.3 Database
- **Cleanup:** 清理不再使用的数据库表结构或脏数据。

## 3. Out of Scope
- 新版 Node Graph Editor (画布) 的功能不受影响。
- 确保不误删新版编辑器正在使用的核心节点定义。

## 4. Acceptance Criteria
1. UI 检查: 进入系统后，不再看到“算子节点”菜单入口。
2. 路由检查: 访问旧版 URL 应跳转到 404 或首页。
3. 代码清洁: 前后端代码库中无残留的旧版节点列表页代码。
4. 系统稳定: 移除后，新版工作流画布 (Workflow Canvas) 能正常加载和使用。
5. 数据库: 完成必要的数据清理或表删除。
