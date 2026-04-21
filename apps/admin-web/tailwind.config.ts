import type { Config } from 'tailwindcss';

export default {
  content: [
    './index.html',
    './src/**/*.{vue,ts,tsx}',
    '../../packages/ui/src/**/*.{vue,ts,tsx}',
  ],
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
        'text-dark': '#0F1B3C',
        'text-body': '#334155',
        'text-muted': '#64748B',
        'text-light': '#CBD5E1',
        danger: '#EF4444',
        success: '#10B981',
        warning: '#F59E0B',
      },
      fontFamily: {
        sans: ['"Microsoft YaHei"', 'system-ui', 'sans-serif'],
        inter: ['Inter', 'sans-serif'],
      },
    },
  },
  plugins: [],
} satisfies Config;
