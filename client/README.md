# EasyQuant Client - 前端应用

这是EasyQuant量化交易系统的Web监控前端，使用React + Vite + Tailwind CSS构建。

## 功能特性

- **ETL配置** - 可视化配置数据加载和处理流程参数
  - 进程数量配置（可留空自动分配）
  - 数据源类型选择
  - 批处理大小和并行任务数设置
  - 数据验证和错误重试选项

- **进程监控** - 实时监控所有ETL进程的运行状态
  - 进程列表展示
  - 实时进度追踪（队列大小、处理进度）
  - 当前处理文件显示
  - 详细事件日志查看
  - 自动刷新（每2秒轮询）

## 技术栈

- **React 18** - UI框架
- **Vite** - 构建工具
- **Tailwind CSS** - 样式框架
- **Axios** - HTTP客户端
- **Lucide React** - 图标库
- **date-fns** - 日期格式化

## 安装和运行

### 前置要求

- Node.js >= 16.0.0
- npm 或 yarn

### 安装依赖

```bash
cd client
npm install
```

### 启动开发服务器

```bash
npm run dev
```

应用将在 `http://localhost:3000` 启动。

### 构建生产版本

```bash
npm run build
```

构建产物将输出到 `dist/` 目录。

### 预览生产版本

```bash
npm run preview
```

## API配置

前端通过Vite代理与后端API通信。配置在 `vite.config.js` 中：

```javascript
server: {
  port: 3000,
  proxy: {
    '/api': {
      target: 'http://localhost:8000',
      changeOrigin: true,
    }
  }
}
```

确保后端服务运行在 `http://localhost:8000`。

## 项目结构

```
client/
├── public/              # 静态资源
├── src/
│   ├── components/      # React组件
│   │   ├── ETLConfig.jsx          # ETL配置页面
│   │   └── ProcessMonitor.jsx     # 进程监控页面
│   ├── services/        # API服务
│   │   └── api.js                 # API调用封装
│   ├── App.jsx          # 主应用组件
│   ├── main.jsx         # 应用入口
│   └── index.css        # 全局样式
├── index.html           # HTML模板
├── package.json         # 依赖配置
├── vite.config.js       # Vite配置
├── tailwind.config.js   # Tailwind配置
└── postcss.config.js    # PostCSS配置
```

## 使用说明

### 1. ETL配置页面

在此页面可以配置ETL进程的各项参数：

- **进程数量**: 留空则自动分配，建议为CPU核心数的50-75%
- **数据源**: 支持本地文件、API接口、数据库和QMT终端
- **批处理大小**: 每批处理的记录数，影响内存和速度
- **并行任务数**: 每个进程内部的并行任务数量

配置完成后点击"启动ETL"按钮启动进程。

### 2. 进程监控页面

实时监控所有运行中的进程：

- 每个进程卡片显示关键指标（进度、队列、当前文件）
- 点击进程卡片查看详细事件日志
- 右上角可以切换自动刷新开关
- 默认每2秒自动轮询最新数据

## 界面预览

### ETL配置页面
- 美观的渐变背景
- 清晰的配置分组（基础配置、高级配置）
- 实时配置预览
- 响应式布局

### 进程监控页面
- 卡片式进程展示
- 实时进度条
- 颜色编码的状态徽章（运行中/已完成/错误）
- 详细的事件时间线

## 开发说明

### 自定义主题

在 `tailwind.config.js` 中可以自定义颜色和主题：

```javascript
theme: {
  extend: {
    colors: {
      primary: { ... },
      success: { ... },
      // 添加更多颜色
    }
  }
}
```

### 添加新组件

1. 在 `src/components/` 目录下创建新组件
2. 使用 `lucide-react` 图标库添加图标
3. 使用Tailwind CSS类名进行样式化
4. 在 `App.jsx` 中引入并添加到路由

## 故障排除

### 端口冲突

如果3000端口被占用，修改 `vite.config.js` 中的端口：

```javascript
server: {
  port: 3001, // 改为其他端口
}
```

### API连接失败

确保：
1. 后端服务正在运行（`python server/main.py`）
2. 后端运行在 `http://localhost:8000`
3. 检查浏览器控制台的网络请求

### 样式不生效

清除缓存并重新构建：

```bash
rm -rf node_modules/.vite
npm run dev
```

## 许可证

MIT
