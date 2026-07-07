/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
        mono: ['JetBrains Mono', 'ui-monospace', 'monospace'],
      },
      colors: {
        navy: {
          50:  '#F1F5FA',
          100: '#DCE6F1',
          200: '#B7CCE0',
          300: '#86A8C7',
          400: '#5685AE',
          500: '#3A6E99',
          600: '#2E5E8C',
          700: '#264D72',
          800: '#1F3F5D',
          900: '#1A334B',
        },
        ink: {
          DEFAULT: '#1F2937',
          soft:    '#6B7280',
          faint:   '#9CA3AF',
        },
        line: {
          DEFAULT: '#E5E7EB',
          soft:    '#F3F4F6',
          strong:  '#D1D5DB',
        },
        canvas: '#F7F8FA',
        good: {
          DEFAULT: '#10B981',
          soft:    '#D1FAE5',
          deep:    '#047857',
        },
        bad: {
          DEFAULT: '#EF4444',
          soft:    '#FEE2E2',
          deep:    '#B91C1C',
        },
        warn: {
          DEFAULT: '#F59E0B',
          soft:    '#FEF3C7',
          deep:    '#B45309',
        },
      },
      boxShadow: {
        card:     '0 1px 2px rgba(16, 24, 40, 0.04), 0 1px 3px rgba(16, 24, 40, 0.06)',
        'card-lg':'0 4px 10px rgba(16, 24, 40, 0.05), 0 2px 4px rgba(16, 24, 40, 0.04)',
        ring:     '0 0 0 4px rgba(46, 94, 140, 0.12)',
      },
    },
  },
  plugins: [],
}
