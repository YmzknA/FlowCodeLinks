/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        background: 'var(--background)',
        foreground: 'var(--foreground)',
      },
      fontFamily: {
        'raleway': ['Raleway', 'sans-serif'],
      },
    },
  },
  plugins: [require('daisyui')],
  daisyui: {
    themes: [
      {
        nord: {
          "primary": "#5e81ac",
          "primary-content": "#eceff4",
          "secondary": "#81a1c1", 
          "secondary-content": "#2e3440",
          "accent": "#88c0d0",
          "accent-content": "#2e3440",
          "neutral": "#4c566a",
          "neutral-content": "#eceff4",
          "base-100": "#eceff4",
          "base-200": "#e5e9f0",
          "base-300": "#d8dee9",
          "base-content": "#2e3440",
          "info": "#88c0d0",
          "info-content": "#2e3440",
          "success": "#a3be8c",
          "success-content": "#2e3440", 
          "warning": "#ebcb8b",
          "warning-content": "#2e3440",
          "error": "#bf616a",
          "error-content": "#eceff4",
        },
      },
    ],
    base: true,
    styled: true,
    utils: true,
  },
}