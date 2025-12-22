# EasyQuant - 量化交易系统

EasyQuant 是一个使用Python和Web技术构建的量化交易系统，支持数据处理（ETL）、策略回测和实盘交易。

系统核心特性是其基于**事件驱动**的**可观测性（Observability）**架构，并集成了独立的 **Easy-Canvas** 可视化编排引擎。

## 系统架构

本系统采用前后端分离的现代化架构：

1.  **后端 (EasyQuant Server)**: 基于 Python FastAPI 的核心服务。
    -   **后台任务**: 异步执行 ETL、回测等长耗时任务。
    -   **事件记录**: `record_event()` 负责将结构化的事件数据写入数据库。
    -   **实时推送**: 全 WebSocket 实现日志、进程状态、事件流的毫秒级推送。
    
2.  **前端 (Easy-Canvas)**: 独立的 Next.js 应用，提供极致的节点图编排体验。
    -   **Dify/Coze 风格复刻**: 像素级还原 Dify 极简节点设计。
    -   **Linear/Stripe 视觉风格**: [NEW] 采用 Deep Blue 主色调与精密边框设计，打造专业的 Fintech 工具体验。
    -   **独立运行**: 与后端解耦，通过 API 进行通信（目前处于 Mock/联调过渡阶段）。
    -   **高级交互**: 支持双击配置、智能吸附连线、ELK 自动布局。

## 目录结构

```
/Users/dane/Easy/
├── easyquant/             # Backend Root (Python)
│   ├── server/            # FastAPI Service
│   ├── manage.py          # Service Manager
│   ├── start.sh           # One-click Startup Script
│   └── ...
│
└── easy-canvas/           # Frontend Root (Next.js)
    ├── app/               # Canvas UI Logic
    ├── service/           # API Adapter Layer
    └── ...
```

## 快速启动

本系统提供了一键启动脚本，可同时启动后端服务 (Port 8000) 和前端应用 (Port 3000)。

### 1. 环境准备
确保已安装 Python 3.10+ 和 Node.js (推荐 v18+)。

```sh
# 安装后端依赖
cd easyquant
pip install -r requirements.txt

# 安装前端依赖
cd ../easy-canvas
pnpm install  # 或 npm install
```

### 2. 启动服务
回到 `easyquant` 目录：

```sh
./start.sh
```

- **后端 API**: http://127.0.0.1:8000/docs
- **前端页面**: http://127.0.0.1:3000

### 3. 停止服务
```sh
./stop.sh
```

## 功能指南

### ETL 任务编排 (Canvas)
- 访问 http://127.0.0.1:3000 进入画布。
- **添加节点**: 从左侧面板拖拽节点到画布。
- **连线**: 从节点 Handle 拖出线条，松开在目标节点任意区域即可连接。
- **配置**: 双击节点打开右侧配置面板。
- **整理**: 点击右上角 "Organize" 按钮自动优化布局。

### 实时监控
- 通过 API 或后端日志查看实时运行状态。