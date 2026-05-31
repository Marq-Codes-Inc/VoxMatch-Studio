// tailwind.config.js
/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        primary: {
          DEFAULT: 'var(--primary)',
          hover: 'var(--primary-hover)',
        },
        success: 'var(--success)',
        danger: 'var(--danger)',
        warning: 'var(--warning)',
        app: {
          bg: 'var(--app-bg)',
          surface: 'var(--app-surface)',
          'surface-hover': 'var(--app-surface-hover)',
          'surface-active': 'var(--app-surface-active)',
          border: 'var(--app-border)',
          'border-light': 'var(--app-border-light)',
          'gray-light': 'var(--app-gray-light)',
          gray: 'var(--app-gray)',
          'gray-dark': 'var(--app-gray-dark)',
          text: 'var(--app-text)',
          'text-primary': 'var(--app-text-primary)',
          'text-secondary': 'var(--app-text-secondary)',
          'icon-color': 'var(--app-icon-color)',
          'input-bg': 'var(--app-input-bg)',
          'timeline-bg': 'var(--app-timeline-bg)',
          'border-disabled': 'var(--app-border-disabled)',
        },
      },
      fontFamily: {
        inter: ['Inter', 'sans-serif'],
      },
    },
  },
  plugins: [],
}

