/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  darkMode: 'class',
  theme: {
    extend: {
      fontFamily: {
        sans: ['Inter', '"Noto Sans SC"', 'system-ui', 'sans-serif'],
        display: ['Inter', '"Noto Sans SC"', 'system-ui', 'sans-serif'],
      },
      colors: {
        // osu!lazer 质感：柔和多彩，非廉价霓虹
        lazer: {
          pink: '#ff66aa',
          purple: '#8866cc',
          cyan: '#66ccff',
          dark: '#0a0a0f',
          panel: '#111118',
        },
      },
      backgroundImage: {
        'lazer-glow': 'radial-gradient(ellipse at center, rgba(255,102,170,0.15), transparent 70%)',
      },
      transitionTimingFunction: {
        spring: 'cubic-bezier(0.34, 1.56, 0.64, 1)',
      },
    },
  },
  plugins: [],
};