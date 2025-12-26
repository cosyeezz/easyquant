# Product Guidelines

## Visual & Interaction Style
- **Visual Harmony (视觉和谐):** 界面整体应追求极致的平衡与和谐。色彩过度、组件间距和交互动画必须自然顺滑，确保没有破坏整体感的突兀元素。
- **Linear/Stripe Style:** 严格遵循 Linear/Stripe 的设计美学。采用中性色调（黑/白/灰）作为基石，通过精密的微阴影、极细边框（hairline borders）和克制的强调色，营造出精致且沉浸的 Fintech 工具体验。
- **Compact & Dense (节点设计):** 节点设计应极其紧凑（宽度约 100px），使用微缩字体（约 6px-10px），以适应在画布上展示大规模、复杂的数据流图。
- **Dify/Coze Interaction:** 交互体验应像素级复刻 Dify。例如：拖拽式的连线系统、双击打开侧边栏配置面板、以及基于自动布局的画布整理功能。

## User Experience (UX)
- **Zero-Latency Feedback:** 所有的系统状态更新、日志输出和交易事件必须通过 WebSocket 实时推送，禁止使用轮询。
- **Modular Design:** 所有的交易逻辑应抽象为独立的“节点”，支持灵活的插件式扩展。
- **Self-Healing Environment:** 系统应具备自愈能力（如自动建立 SSH 隧道、自动执行数据库迁移），减少用户的配置负担。

## Prose & Documentation
- **Technical & Concise:** 文案应专业且简洁。
- **Multi-language Support:** 前端界面必须支持国际化 (i18n)，优先支持中文和英文。
- **Code Comments:** 代码注释应侧重于解释“为什么”这样做，而非“做了什么”，特别是对于复杂的量化逻辑。
