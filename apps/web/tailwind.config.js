const token = (name) => `var(--${name})`

const colorNames = [
  'bg', 'surface', 'text', 'muted', 'border', 'brand', 'onbrand', 'brandsoft', 'unk', 'lrn', 'kno', 'mas', 'masin',
  'dot', 'again', 'hard', 'good', 'easy', 'line', 'tint', 'frame', 'desk',
]

/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  corePlugins: { preflight: false },
  darkMode: ['selector', '[data-theme="dark"]'],
  theme: {
    extend: {
      colors: Object.fromEntries(colorNames.map((n) => [n, token(n)])),
      fontFamily: {
        sans: ["'Inter'", 'system-ui', 'sans-serif'],
        serif: ["'Source Serif 4'", 'Georgia', 'serif'],
        mono: ["'IBM Plex Mono'", 'monospace'],
      },
      boxShadow: { card: 'var(--shadow)' },
      keyframes: {
        wmIn: { from: { opacity: '0', transform: 'translateY(8px)' }, to: { opacity: '1', transform: 'none' } },
        wmUp: { from: { opacity: '0', transform: 'translateY(14px)' }, to: { opacity: '1', transform: 'none' } },
      },
      animation: { 'wm-in': 'wmIn 220ms ease-out', 'wm-up': 'wmUp 300ms ease-out' },
    },
  },
  plugins: [],
}
