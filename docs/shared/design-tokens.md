# Design Tokens · 八方来客 / MindLink 设计系统

> 从 `prototype_extract/01_dashboard.html` 的 `:root` 抽取。落地到 `packages/ui/tokens.ts` + `tailwind.config.ts`。所有 UI phase 必须引用本文件。

---

## 1 · 颜色

### 1.1 深色系（侧栏 / 客户端首屏）

| Token | Hex | 用途 |
|---|---|---|
| `dark-bg` | `#0F1B3C` | 主深色背景（侧栏、客户端首屏上半） |
| `dark-bg-2` | `#1A2749` | 次级深色（卡片于深色区） |
| `dark-bg-3` | `#263459` | 三级深色（悬浮态、边框） |

### 1.2 浅色系（内容区）

| Token | Hex | 用途 |
|---|---|---|
| `light-bg` | `#FFFFFF` | 页面主背景 |
| `card-bg` | `#F8FAFC` | 卡片浅灰底 |
| `card-border` | `#E2E8F0` | 卡片描边 |

### 1.3 品牌

| Token | Hex | 用途 |
|---|---|---|
| `navy` | `#1E2761` | 主 logo 色、重点 CTA |
| `cyan` | `#38BDF8` | 强调、链接、亮色点缀 |
| `teal` | `#0EA5E9` | hover / active 青色 |

### 1.4 文本

| Token | Hex | 用途 |
|---|---|---|
| `text-dark` | `#0F1B3C` | 深色标题 |
| `text-body` | `#334155` | 正文 |
| `text-muted` | `#64748B` | 次要信息 |
| `text-light` | `#CBD5E1` | 深背景上的辅助文字 |

### 1.5 语义色（红绿灯）

| Token | Hex | 用途 |
|---|---|---|
| `red` | `#EF4444` | 危险 / 高风险（健康度 < 60 红灯） |
| `green` | `#10B981` | 正常 / 稳定（健康度 ≥ 85 绿灯） |
| `amber` | `#F59E0B` | 警告 / 需关注（60-84 黄灯） |
| `purple` | `#8B5CF6` | 次要强调 |
| `pink` | `#EC4899` | 特殊标签 |

---

## 2 · 字体

### 2.1 字族

```css
font-family: "Microsoft YaHei", -apple-system, BlinkMacSystemFont, sans-serif;
font-family-en: "Inter", "Helvetica", sans-serif;   /* 英文数字 logo */
```

### 2.2 字号

| Token | px | 用途 |
|---|---|---|
| `text-xs` | 11 | 标签 |
| `text-sm` | 12 | 次要信息 |
| `text-base` | 14 | 正文 |
| `text-lg` | 16 | 小标题 |
| `text-xl` | 20 | 卡片标题 |
| `text-2xl` | 24 | 页面标题 |
| `text-3xl` | 32 | 关键指标 |
| `text-4xl` | 40 | 驾驶舱大数字 |
| `text-5xl` | 56 | 客户端首屏主数字 |

### 2.3 字重

| Token | 值 |
|---|---|
| `font-normal` | 400 |
| `font-medium` | 500 |
| `font-semibold` | 600 |
| `font-bold` | 700 |

---

## 3 · 间距

Tailwind 默认 4px 阶梯即可。常用：

| Token | px |
|---|---|
| `space-1` | 4 |
| `space-2` | 8 |
| `space-3` | 12 |
| `space-4` | 16 |
| `space-6` | 24 |
| `space-8` | 32 |
| `space-12` | 48 |

---

## 4 · 圆角

| Token | px | 用途 |
|---|---|---|
| `rounded-sm` | 4 | 小标签 |
| `rounded` | 6 | 按钮 |
| `rounded-md` | 8 | 卡片小 |
| `rounded-lg` | 12 | 卡片大 |
| `rounded-xl` | 16 | 浮层 |
| `rounded-2xl` | 24 | 客户端大卡 |
| `rounded-full` | 9999 | 头像 / 药丸 |

---

## 5 · 阴影

```css
--shadow-sm:  0 1px 2px rgba(15, 27, 60, 0.04);
--shadow:     0 2px 8px rgba(15, 27, 60, 0.06);
--shadow-md:  0 4px 16px rgba(15, 27, 60, 0.08);
--shadow-lg:  0 12px 32px rgba(15, 27, 60, 0.12);
--shadow-xl:  0 20px 48px rgba(15, 27, 60, 0.16);
```

---

## 6 · 布局

### 6.1 管理端

- 侧栏宽度：**220px**（固定）
- 内容区最大宽度：不限制，撑满（驾驶舱用 grid）
- 顶部面包屑 / 操作栏高度：**56px**

```
┌──────┬────────────────────────────────┐
│      │  Breadcrumb / Action Bar (56) │
│      ├────────────────────────────────┤
│ 220  │                                │
│ sidebar                               │
│      │        Main Content             │
│      │                                │
└──────┴────────────────────────────────┘
```

### 6.2 客户端小程序

- 最大宽度：750rpx（uni-app 默认）
- 首屏深蓝顶部比例：60%
- 底部 Tab 栏：5 个 Tab · 高度 100rpx

---

## 7 · 组件样式规范

### 7.1 按钮

| 类型 | 背景 | 文字 | 边框 |
|---|---|---|---|
| Primary | `navy` | 白 | 无 |
| Secondary | 白 | `navy` | `card-border` |
| Danger | `red` | 白 | 无 |
| Ghost | 透明 | `text-body` | 透明 |

尺寸：`sm (h-32)` · `md (h-40)` · `lg (h-48)`

### 7.2 卡片

- 默认：`bg-card-bg` + `border-card-border` + `rounded-lg` + `p-6`
- 悬浮：`shadow-md`
- 点击态：`hover:shadow-lg` + 边框变 `cyan`

### 7.3 表格

- 表头：`bg-card-bg` + `text-muted` + `text-sm` + `h-48`
- 表行：`h-56` + `border-b border-card-border`
- hover：`bg-slate-50`

### 7.4 标签（状态芯片）

药丸状 + 语义色背景透明度 10%。

```css
.tag-green  { background: rgba(16,185,129,.1); color: var(--green); }
.tag-amber  { background: rgba(245,158,11,.1); color: var(--amber); }
.tag-red    { background: rgba(239,68,68,.1);  color: var(--red); }
.tag-cyan   { background: rgba(56,189,248,.1); color: var(--cyan); }
```

---

## 8 · 图标

- 默认图标库：`lucide-vue-next`（开源 + 线性风格贴合原型）
- 小程序端：`@iconify-json/lucide` + unplugin-icons
- 大小：16 / 20 / 24 / 32 · 描边 `1.5px`

---

## 9 · 动画

- 过渡时长：`150ms`（微交互）/ `300ms`（主交互）
- 缓动：`ease-out` 默认
- 不用旋转 loading，用线性进度条

---

## 10 · Tailwind 配置片段

`apps/admin-web/tailwind.config.ts`：

```typescript
export default {
  content: ['./src/**/*.{vue,ts,tsx}', '../../packages/ui/src/**/*.{vue,ts,tsx}'],
  theme: {
    extend: {
      colors: {
        'dark-bg': '#0F1B3C',
        'dark-bg-2': '#1A2749',
        'dark-bg-3': '#263459',
        'card-bg': '#F8FAFC',
        'card-border': '#E2E8F0',
        navy: '#1E2761',
        cyan: { DEFAULT: '#38BDF8' },
        teal: { DEFAULT: '#0EA5E9' },
        'text-body': '#334155',
        'text-muted': '#64748B',
        'text-light': '#CBD5E1',
      },
      fontFamily: {
        sans: ['"Microsoft YaHei"', 'system-ui', 'sans-serif'],
        inter: ['Inter', 'sans-serif'],
      },
    },
  },
};
```

`packages/ui/tokens.ts`：

```typescript
export const tokens = {
  color: { /* 全部 hex */ },
  font: { /* ... */ },
  radius: { /* ... */ },
  shadow: { /* ... */ },
} as const;
```

---

## 11 · 微信小程序端差异

- rpx 替代 px：设计稿 750 设计宽度
- 部分 CSS 特性受限：`grid` 支持但推荐 `flex`
- 禁用 `position: sticky`
- 图标用 unicode emoji 或内置 icon，不用 svg sprite

---

_文档版本_：1.0 · 2026-04-20
