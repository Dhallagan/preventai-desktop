import type { Config } from 'tailwindcss';

export default {
  content: ['./renderer/index.html', './renderer/src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        risk: {
          high: '#b91c1c',
          med: '#92400e',
          low: '#166534',
        },
        surface: {
          main: '#fafaf9',
          panel: '#f5f5f4',
          border: '#e7e5e4',
        },
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
        mono: ['"JetBrains Mono"', 'ui-monospace', 'monospace'],
      },
    },
  },
  plugins: [],
} satisfies Config;
