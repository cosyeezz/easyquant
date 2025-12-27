# Product Guide

## Project Vision
EasyQuant 是一个综合性的量化交易系统，旨在通过可视化的工作流编排降低算法交易的门槛。它结合了 Python 的强大数据处理能力和现代 Web 前端的交互体验，支持从数据清洗 (ETL)、策略回测到实盘交易的全生命周期管理。

## Core Features
- **可视化策略编排与版本管理 (Visual Orchestration & Versioning):** 基于 Easy-Canvas 的节点编辑器，支持紧凑型节点设计、连线。内置版本管理系统，支持 SNAPSHOT 和 RELEASE 切换，支持历史版本回滚及画布多版本引用。
- **列级元数据感知 (Column-Level Metadata Awareness):** 实现强大的 Schema 传播引擎，支持在节点连接时自动同步字段列表，并在配置面板提供智能字段选择器。
- **事件驱动架构 (Event-Driven):** 后端基于 Python FastAPI，采用全链路事件追踪设计，确保系统的高可观测性。
- **实时监控 (Real-Time Observability):** 通过 WebSocket 实现日志流、进程状态和交易事件的毫秒级前端推送。
- **量化引擎 (Quant Engine):** 内置回测与实盘交易引擎，支持复杂的金融数据处理和策略执行。
- **前后端分离:** 独立的 Next.js 前端与 Python 后端通过 API 和 WebSocket 通信，结构清晰。

## Target Audience
- **量化研究员:** 需要高效工具进行策略开发和历史回测。
- **算法交易员:** 需要稳定、可视化的环境监控实盘交易状态。
- **数据工程师:** 负责维护金融数据清洗和 ETL 流程。
