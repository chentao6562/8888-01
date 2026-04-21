/**
 * Design Tokens · 八方来客 / MindLink 设计系统
 * 源：docs/shared/design-tokens.md（从 prototype_extract/01_dashboard.html 抽取）
 */
export const colors = {
  darkBg: '#0F1B3C',
  darkBg2: '#1A2749',
  darkBg3: '#263459',
  lightBg: '#FFFFFF',
  cardBg: '#F8FAFC',
  cardBorder: '#E2E8F0',
  navy: '#1E2761',
  cyan: '#38BDF8',
  teal: '#0EA5E9',
  textDark: '#0F1B3C',
  textBody: '#334155',
  textMuted: '#64748B',
  textLight: '#CBD5E1',
  red: '#EF4444',
  green: '#10B981',
  amber: '#F59E0B',
  purple: '#8B5CF6',
  pink: '#EC4899',
} as const;

export const fontFamily = {
  sans: ['"Microsoft YaHei"', '-apple-system', 'BlinkMacSystemFont', 'sans-serif'],
  inter: ['Inter', 'Helvetica', 'sans-serif'],
} as const;

export const fontSize = {
  xs: '11px',
  sm: '12px',
  base: '14px',
  lg: '16px',
  xl: '20px',
  '2xl': '24px',
  '3xl': '32px',
  '4xl': '40px',
  '5xl': '56px',
} as const;

export const radius = {
  sm: '4px',
  base: '6px',
  md: '8px',
  lg: '12px',
  xl: '16px',
  '2xl': '24px',
  full: '9999px',
} as const;

export const shadow = {
  sm: '0 1px 2px rgba(15, 27, 60, 0.04)',
  base: '0 2px 8px rgba(15, 27, 60, 0.06)',
  md: '0 4px 16px rgba(15, 27, 60, 0.08)',
  lg: '0 12px 32px rgba(15, 27, 60, 0.12)',
  xl: '0 20px 48px rgba(15, 27, 60, 0.16)',
} as const;

export const layout = {
  sidebarWidth: '220px',
  headerHeight: '56px',
} as const;

export const tokens = {
  colors,
  fontFamily,
  fontSize,
  radius,
  shadow,
  layout,
} as const;

export type Tokens = typeof tokens;
