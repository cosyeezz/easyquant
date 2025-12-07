# EasyQuant Client - 开发日志

## 2025-12-06 - 初始开发

### 项目初始化
- 使用 Vite + React 18 创建项目脚手架
- 配置 Tailwind CSS 作为样式框架
- 设置 PostCSS 和 Autoprefixer

### 技术栈选型
**核心框架**
- React 18.2 - 最新的React版本，支持并发特性
- Vite 5.0 - 极速的现代化构建工具

**样式方案**
- Tailwind CSS 3.3 - 实用优先的CSS框架
- 自定义配色方案：Primary、Success、Warning、Danger

**工具库**
- Axios 1.6 - HTTP客户端，用于API调用
- Lucide React 0.294 - 轻量级图标库
- date-fns 2.30 - 日期格式化工具

### 架构设计

#### 1. 目录结构
```
client/
├── src/
│   ├── components/       # React组件
│   ├── services/         # API服务层
│   ├── App.jsx          # 主应用
│   └── main.jsx         # 入口文件
├── public/              # 静态资源
└── 配置文件...
```

#### 2. 组件层级
```
App (主应用)
├── Header (顶部导航栏)
├── TabNavigation (页签切换)
└── PageContent
    ├── ETLConfig (ETL配置页面)
    └── ProcessMonitor (进程监控页面)
```

#### 3. 数据流设计
- **轮询机制**: 每2秒自动调用API获取最新数据
- **状态管理**: 使用React Hooks (useState, useEffect)
- **API代理**: Vite开发服务器代理 /api 到后端8000端口

### 功能实现

#### ETL配置页面 (ETLConfig.jsx)
**实现功能**:
- ✅ 进程数量配置（输入框，支持留空自动分配）
- ✅ 数据源类型选择（下拉框：本地/API/数据库/QMT）
- ✅ 批处理大小配置（数字输入，默认1000）
- ✅ 并行任务数调节（滑块控件，范围1-16）
- ✅ 数据验证和错误重试开关（复选框）
- ✅ 配置预览卡片（实时显示当前配置）
- ✅ 启动按钮（带加载状态）

**UI设计亮点**:
- 分组布局：基础配置 + 高级配置
- 响应式网格：lg屏幕2列，小屏1列
- 渐变背景卡片
- 交互式滑块带实时数值显示
- 启动按钮带Loader动画

**代码关键点**:
```javascript
const [config, setConfig] = useState({
  processCount: '',        // 留空表示自动
  dataSource: 'local',
  batchSize: 1000,
  parallelTasks: 4,
})
```

#### 进程监控页面 (ProcessMonitor.jsx)
**实现功能**:
- ✅ 进程列表卡片展示（网格布局）
- ✅ 实时数据轮询（2秒间隔，可控制开关）
- ✅ 进度条显示（处理进度百分比）
- ✅ 队列大小监控
- ✅ 当前处理文件显示
- ✅ 错误信息展示
- ✅ 点击卡片查看详细事件日志
- ✅ 自动刷新开关

**数据解析逻辑**:
```javascript
const parseProcessStatus = (event) => {
  if (!event || !event.payload) return null

  return {
    queueSize: payload.queue_size || 0,
    currentFile: payload.current_file || '未知',
    processed: payload.processed || 0,
    total: payload.total || 0,
    progress: payload.progress || 0,
    status: payload.status || 'running',
    error: payload.error || null,
  }
}
```

**状态徽章系统**:
- 🟢 运行中 (badge-info) - 蓝色
- ✅ 已完成 (badge-success) - 绿色
- ❌ 错误 (badge-danger) - 红色
- ⚠️ 警告 (badge-warning) - 黄色

**交互特性**:
- 卡片悬停放大效果 (scale-105)
- 选中卡片高亮 (ring-2)
- 进度条平滑动画 (transition-all duration-500)
- 时间显示相对时间（如"2分钟前"）

#### API服务层 (api.js)
**设计模式**: 单例模式

**核心方法**:
```javascript
class ApiService {
  getEvents(params)           // 获取事件列表
  getProcesses()              // 获取进程列表
  getProcessEvents(name)      // 获取特定进程事件
}
```

**特点**:
- Axios实例复用
- 统一的baseURL配置
- JSDoc注释完整

### UI/UX设计

#### 配色系统
```javascript
colors: {
  primary: {     // 主色调（蓝色系）
    500: '#0ea5e9',
    600: '#0284c7',
    700: '#0369a1',
  },
  success: { ... },  // 绿色系
  warning: { ... },  // 黄色系
  danger: { ... },   // 红色系
}
```

#### 设计原则
1. **渐变背景**: `from-slate-50 via-blue-50 to-indigo-50`
2. **卡片阴影**: 多层次阴影提升层次感
3. **圆角**: 统一使用 `rounded-xl` (12px)
4. **间距**: 一致的padding和margin体系
5. **字体**: 无衬线字体，层次清晰

#### 响应式设计
- 移动端：单列布局
- 平板：2列网格
- 桌面：3列网格（进程卡片）

### 性能优化

1. **轮询优化**: 可手动关闭自动刷新
2. **依赖清理**: useEffect正确清理定时器
3. **条件渲染**: 避免不必要的组件渲染
4. **懒加载**: 适合的组件使用懒加载

### 开发流程

#### 本地开发
```bash
npm install          # 安装依赖
npm run dev         # 启动开发服务器 (http://localhost:3000)
```

#### API代理配置
```javascript
// vite.config.js
server: {
  proxy: {
    '/api': {
      target: 'http://localhost:8000',
      changeOrigin: true,
    }
  }
}
```

#### 构建生产版本
```bash
npm run build       # 构建到 dist/
npm run preview     # 预览生产版本
```

### 遇到的问题和解决方案

#### 问题1: date-fns 本地化导入失败
**症状**: `import { zhCN } from 'date-fns/locale'` 报错

**解决**: 移除了中文本地化，使用默认英文显示
```javascript
// 修改前
formatDistanceToNow(date, { locale: zhCN })

// 修改后
formatDistanceToNow(date, { addSuffix: true })
```

#### 问题2: API服务单例模式
**方案**: 使用类导出实例而非类本身
```javascript
export default new ApiService()  // ✓ 单例
// export default ApiService      // ✗ 每次都要new
```

### 未来计划

#### 短期目标
- [ ] 添加图表可视化（使用recharts）
- [ ] 实现WebSocket实时推送（替代轮询）
- [ ] 添加深色模式支持
- [ ] 优化移动端体验

#### 中期目标
- [ ] 添加用户认证和权限管理
- [ ] 实现ETL任务的实际启动/停止控制
- [ ] 添加历史数据查看和导出功能
- [ ] 性能监控仪表盘

#### 长期目标
- [ ] 多语言支持（i18n）
- [ ] 可自定义仪表盘布局
- [ ] 告警和通知系统
- [ ] 移动端App（React Native）

### 技术债务

1. **类型安全**: 当前使用纯JavaScript，考虑迁移到TypeScript
2. **测试覆盖**: 需要添加单元测试和E2E测试
3. **状态管理**: 复杂度增加后考虑引入Redux或Zustand
4. **错误处理**: 需要更完善的错误边界和用户提示

### 团队协作

#### Git工作流
- main分支: 稳定版本
- dev分支: 开发版本
- feature/*: 新功能分支

#### 代码规范
- ESLint配置
- Prettier格式化
- 组件命名：PascalCase
- 文件命名：与组件名一致

### 参考资源

- [React文档](https://react.dev)
- [Vite文档](https://vitejs.dev)
- [Tailwind CSS文档](https://tailwindcss.com)
- [Lucide图标](https://lucide.dev)

---

## 2025-12-07 - 数据表管理模块重构

### 新增组件

#### FilePathPicker.jsx
文件路径选择组件，支持四种模式：
- `folder` - 选择整个文件夹
- `file` - 选择单个文件
- `files` - 选择多个文件
- `pattern` - 按后缀筛选（如 .csv, .xlsx）

#### DataTableEditor.jsx 重构
按照 FRONTEND_ETL_GUIDE.md 规范完全重构：
- **Section A: 基础信息** - 显示名称、物理表名、分类、描述
- **Section B: 字段定义** - 支持列名、类型、主键、描述的表格编辑
- **Section C: 索引定义** - 支持索引名、包含列、唯一性配置
- **状态流转**: DRAFT（草稿）→ CREATED（已发布）
- **发布确认**: 二次确认弹窗，提示将执行 DDL

支持的字段类型：
- VARCHAR(20/100) - 文本
- TIMESTAMPTZ - 带时区时间
- DOUBLE PRECISION - 双精度浮点
- NUMERIC - 高精度小数
- INT/BIGINT - 整数
- BOOLEAN - 布尔值
- JSONB - 非结构化数据

### API 更新

新增接口：
- `publishDataTable(id)` - 发布数据表，创建物理表
- `getTableCategories()` - 获取表分类列表

全局配置：
- 10 秒超时
- 错误拦截器，统一打印错误日志

### UI/UX 改进

#### 加载状态
- 显示"xxx加载中，请稍候..."文字提示
- 转圈动画

#### 错误处理
- 加载失败显示错误信息
- 提供"重试"按钮
- 组件级错误状态管理

#### DataTableList 更新
- 新增"状态"列，显示草稿/已发布状态
- 已发布显示绿色标签，草稿显示灰色标签

### 当前项目结构

```
client/src/
├── App.jsx                 # Tab 导航 (tables, etl, monitor)
├── components/
│   ├── DataTableList.jsx   # 数据表列表（含状态显示）
│   ├── DataTableEditor.jsx # 数据表编辑器（字段+索引定义）
│   ├── ETLTaskList.jsx     # ETL 任务列表
│   ├── ETLTaskEditor.jsx   # ETL 任务编辑器（三步向导）
│   ├── FilePathPicker.jsx  # 文件路径选择器（四种模式）
│   ├── ProcessMonitor.jsx  # 进程监控（轮询 API）
│   └── Modal.jsx           # 通用模态框
└── services/
    └── api.js              # API 封装（含超时和错误处理）
```

### 待完成功能

- [ ] ETLTaskEditor 集成 FilePathPicker
- [ ] DatabaseSaveHandler 仅显示已发布的表
- [ ] 拖拽排序字段
- [ ] 表分类从 API 动态获取

---

**最后更新**: 2025-12-07
**当前版本**: 1.1.0
**开发者**: EasyQuant Team
