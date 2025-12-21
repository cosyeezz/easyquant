# EasyQuant Design System

> 冷静数据驱动风格 (Data-Driven Precision)

## 设计哲学

- **精确**：数字优先，等宽字体对齐
- **冷静**：深色主题，减少视觉疲劳
- **高密度**：紧凑布局，信息密度最大化
- **低噪音**：减少装饰，数据为主角

---

## 色彩系统

### 使用方式

```jsx
// Tailwind 类名
<div className="bg-eq-base text-eq-text-primary" />
<div className="bg-eq-surface border border-eq-border-subtle" />
<span className="text-eq-success-text" />  // 盈利
<span className="text-eq-danger-text" />   // 亏损
```

### 色板速查

| Token | 色值 | 用途 |
|-------|------|------|
| `eq-base` | #0D0F12 | 页面底色 |
| `eq-surface` | #151921 | 卡片/面板 |
| `eq-elevated` | #1C2230 | 悬浮层 |
| `eq-text-primary` | #F0F2F5 | 主要文字 |
| `eq-text-secondary` | #9BA3B0 | 次要文字 |
| `eq-text-muted` | #5F6B7A | 禁用/占位符 |
| `eq-primary-500` | #2979FF | 主色 |
| `eq-success-text` | #4ADE80 | 盈利/成功 |
| `eq-danger-text` | #F87171 | 亏损/错误 |
| `eq-warning-text` | #FBBF24 | 警告 |

---

## 字体系统

```jsx
// 界面文字
<p className="font-sans text-sm">普通文本</p>

// 数字/代码 (等宽)
<span className="font-mono">123,456.78</span>

// 标题层级
<h1 className="text-h1">页面标题 22px</h1>
<h2 className="text-h2">区块标题 18px</h2>
<h3 className="text-h3">卡片标题 15px</h3>
```

---

## 组件规范

### 表格

```jsx
<table className="w-full">
  <thead>
    <tr className="bg-eq-surface text-eq-text-secondary text-sm border-b border-eq-border-subtle">
      <th className="px-4 py-3 text-left font-medium">名称</th>
      <th className="px-4 py-3 text-left font-medium">数值</th>
    </tr>
  </thead>
  <tbody>
    <tr className="odd:bg-eq-base even:bg-eq-surface hover:bg-eq-elevated border-b border-eq-border-subtle">
      <td className="px-4 py-3 text-eq-text-primary">数据行</td>
      <td className="px-4 py-3 font-mono">1,234.56</td>
    </tr>
  </tbody>
</table>
```

### 输入框

```jsx
<input
  className="
    h-10 px-3
    bg-eq-surface
    border border-eq-border-subtle rounded-eq-md
    text-eq-text-primary placeholder:text-eq-text-muted
    focus:border-eq-primary-500 focus:ring-2 focus:ring-eq-primary-500/20
    outline-none transition
  "
  placeholder="搜索..."
/>
```

### 按钮

```jsx
// Primary
<button className="
  h-10 px-4
  bg-eq-primary-500 hover:bg-eq-primary-600
  text-white font-medium rounded-eq-md
  transition
">
  确认
</button>

// Secondary
<button className="
  h-10 px-4
  bg-transparent hover:bg-eq-elevated
  border border-eq-border-default hover:border-eq-border-strong
  text-eq-text-primary font-medium rounded-eq-md
  transition
">
  取消
</button>
```

### 状态指示器

```jsx
// 在线状态
<span className="inline-flex items-center gap-2 text-xs">
  <span className="w-2 h-2 rounded-full bg-eq-success-solid animate-pulse" />
  <span className="text-eq-text-secondary">在线</span>
</span>

// 离线状态
<span className="inline-flex items-center gap-2 text-xs">
  <span className="w-2 h-2 rounded-full bg-eq-text-muted" />
  <span className="text-eq-text-secondary">离线</span>
</span>
```

### 标签/Badge

```jsx
// 分类标签
<span className="px-2 py-1 text-xs font-medium rounded bg-eq-primary-500/15 text-eq-primary-400">
  行情数据
</span>

// 状态标签
<span className="px-2 py-1 text-xs font-medium rounded bg-eq-success-bg text-eq-success-text">
  已发布
</span>

<span className="px-2 py-1 text-xs font-medium rounded bg-eq-danger-bg text-eq-danger-text">
  已停止
</span>
```

### 进度条 (CPU/MEM)

```jsx
// 正常 (0-60%)
<div className="h-1 w-24 bg-eq-elevated rounded-full overflow-hidden">
  <div className="h-full bg-eq-success-solid rounded-full" style={{ width: '30%' }} />
</div>

// 警告 (60-80%)
<div className="h-1 w-24 bg-eq-elevated rounded-full overflow-hidden">
  <div className="h-full bg-eq-warning-solid rounded-full" style={{ width: '70%' }} />
</div>

// 危险 (80%+)
<div className="h-1 w-24 bg-eq-elevated rounded-full overflow-hidden">
  <div className="h-full bg-eq-danger-solid rounded-full" style={{ width: '90%' }} />
</div>
```

---

## 三个核心场景示例

### 1. 列表页 (数据表管理)

```
┌─────────────────────────────────────────────────────────────────┐
│ bg-eq-base                                                      │
│  ┌───────────────────────────────────────────────────────────┐  │
│  │ Header: bg-eq-surface, border-b border-eq-border-subtle   │  │
│  │ Logo + Nav (text-eq-text-secondary, active: primary-500)  │  │
│  │ Status: ● 在线  CPU [████░░] 30%  MEM [██████░] 60%       │  │
│  └───────────────────────────────────────────────────────────┘  │
│                                                                 │
│  ┌───────────────────────────────────────────────────────────┐  │
│  │ 搜索区: bg-eq-surface, rounded-eq-lg, p-5                 │  │
│  │ [Input] [Dropdown] [Dropdown] [Reset] [Search btn]        │  │
│  └───────────────────────────────────────────────────────────┘  │
│                                                                 │
│  ┌───────────────────────────────────────────────────────────┐  │
│  │ Table Header: bg-eq-surface, text-eq-text-secondary       │  │
│  ├───────────────────────────────────────────────────────────┤  │
│  │ Row odd:  bg-eq-base                                      │  │
│  │ Row even: bg-eq-surface                                   │  │
│  │ Row hover: bg-eq-elevated + left-2 border-eq-primary-500  │  │
│  │ 数字列: font-mono                                         │  │
│  │ 标签: bg-eq-primary-500/15 text-eq-primary-400            │  │
│  │ 状态: bg-eq-success-bg text-eq-success-text               │  │
│  └───────────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────────┘
```

### 2. 详情监控页 (进程监控)

```
┌─────────────────────────────────────────────────────────────────┐
│ bg-eq-base                                                      │
│                                                                 │
│  ┌─────────────────┐  ┌─────────────────┐  ┌─────────────────┐  │
│  │ Card: bg-eq-surface, border border-eq-border-subtle       │  │
│  │                                                           │  │
│  │ 进程名称         │  │ CPU 使用率       │  │ 内存使用        │  │
│  │ text-h3          │  │                  │  │                 │  │
│  │                  │  │ ████████░░ 80%  │  │ ██████░░░░ 60% │  │
│  │ PID: font-mono   │  │ text-eq-warning  │  │ text-eq-success │  │
│  └─────────────────┘  └─────────────────┘  └─────────────────┘  │
│                                                                 │
│  ┌───────────────────────────────────────────────────────────┐  │
│  │ 日志输出区                                                │  │
│  │ bg-eq-surface, font-mono, text-sm                         │  │
│  │ ─────────────────────────────────────────────────────────│  │
│  │ [INFO]  text-eq-info-text     2024-01-01 12:00:00        │  │
│  │ [WARN]  text-eq-warning-text  2024-01-01 12:00:01        │  │
│  │ [ERROR] text-eq-danger-text   2024-01-01 12:00:02        │  │
│  └───────────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────────┘
```

### 3. 设置页

```
┌─────────────────────────────────────────────────────────────────┐
│ bg-eq-base                                                      │
│                                                                 │
│  ┌───────────────────────────────────────────────────────────┐  │
│  │ Section Card: bg-eq-surface, rounded-eq-lg                │  │
│  │                                                           │  │
│  │ text-h2: 数据库配置                                       │  │
│  │ text-eq-text-secondary: 配置数据库连接参数                │  │
│  │                                                           │  │
│  │ ┌─────────────────────────────────────────────────────┐   │  │
│  │ │ Label: text-sm text-eq-text-secondary mb-2          │   │  │
│  │ │ Input: bg-eq-elevated (深一层), full-width          │   │  │
│  │ └─────────────────────────────────────────────────────┘   │  │
│  │                                                           │  │
│  │ ┌─────────────────────────────────────────────────────┐   │  │
│  │ │ Toggle Switch: bg-eq-primary-500 when active        │   │  │
│  │ │                bg-eq-border-default when inactive   │   │  │
│  │ └─────────────────────────────────────────────────────┘   │  │
│  │                                                           │  │
│  │ Footer: border-t border-eq-border-subtle pt-4             │  │
│  │ [Cancel btn secondary] [Save btn primary]                 │  │
│  └───────────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────────┘
```

---

## 快速开始

1. 在 `index.css` 或入口文件中引入 design tokens:

```css
@import './styles/design-tokens.css';
```

2. 在 `<html>` 或 `<body>` 上添加 `dark` 类启用深色模式:

```html
<html class="dark">
```

3. 使用 `eq-*` 前缀的 Tailwind 类:

```jsx
<div className="bg-eq-base min-h-screen text-eq-text-primary">
  <div className="bg-eq-surface p-5 rounded-eq-lg border border-eq-border-subtle">
    内容
  </div>
</div>
```

---

## 文件结构

```
client/
├── src/
│   └── styles/
│       └── design-tokens.css   # CSS 变量定义
├── tailwind.config.js          # Tailwind 扩展配置
└── DESIGN_SYSTEM.md            # 本文档
```
