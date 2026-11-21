/** @type {import('tailwindcss').Config} */
module.exports = {
  darkMode: ['class'],
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        canvas: {
          DEFAULT: 'var(--bg-canvas)',
          subtle: 'var(--bg-subtle)',
          inset: 'var(--bg-inset)',
        },
        border: {
          DEFAULT: 'var(--border)',
          subtle: 'var(--border-subtle, var(--border))',
        },
        fg: {
          DEFAULT: 'var(--text)',
          muted: 'var(--text-muted)',
        },
        accent: {
          DEFAULT: 'var(--accent)',
          hover: 'var(--accent-hover, var(--accent))',
        },
        success: {
          DEFAULT: 'var(--success)',
          hover: 'var(--success-hover, var(--success))',
        },
        danger: {
          DEFAULT: 'var(--danger)',
        },
        attention: {
          DEFAULT: 'var(--attention)',
        },
      },
      fontFamily: {
        sans: [
          '-apple-system',
          'BlinkMacSystemFont',
          '"Segoe UI"',
          'Roboto',
          '"Helvetica Neue"',
          'Arial',
          'sans-serif',
        ],
        mono: [
          'ui-monospace',
          'SFMono-Regular',
          '"SF Mono"',
          'Menlo',
          'Consolas',
          'monospace',
        ],
      },
    },
  },
  plugins: [],
};
