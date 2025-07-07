/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
    './node_modules/daisyui/dist/**/*.js',
  ],
  safelist: [
    'btn',
    'btn-primary',
    'btn-lg',
    'hero',
    'hero-content',
    'card',
    'card-body',
    'modal',
    'modal-box',
    'navbar',
    'drawer',
    'bg-base-100',
    'bg-base-200',
    'bg-base-300',
    'text-base-content',
    'text-primary',
    'text-secondary',
    'text-accent',
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
          "primary": "oklch(59.435% 0.077 254.027)",
          "primary-content": "oklch(11.887% 0.015 254.027)",
          "secondary": "oklch(69.651% 0.059 248.687)",
          "secondary-content": "oklch(13.93% 0.011 248.687)",
          "accent": "oklch(77.464% 0.062 217.469)",
          "accent-content": "oklch(15.492% 0.012 217.469)",
          "neutral": "oklch(45.229% 0.035 264.131)",
          "neutral-content": "oklch(89.925% 0.016 262.749)",
          "base-100": "oklch(95.127% 0.007 260.731)",
          "base-200": "oklch(93.299% 0.01 261.788)",
          "base-300": "oklch(89.925% 0.016 262.749)",
          "base-content": "oklch(32.437% 0.022 264.182)",
          "info": "oklch(69.207% 0.062 332.664)",
          "info-content": "oklch(13.841% 0.012 332.664)",
          "success": "oklch(76.827% 0.074 131.063)",
          "success-content": "oklch(15.365% 0.014 131.063)",
          "warning": "oklch(85.486% 0.089 84.093)",
          "warning-content": "oklch(17.097% 0.017 84.093)",
          "error": "oklch(60.61% 0.12 15.341)",
          "error-content": "oklch(12.122% 0.024 15.341)",
        },
      }
    ],
    darkTheme: false,
    base: true,
    styled: true,
    utils: true,
  },
}