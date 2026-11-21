/** @type {import('tailwindcss').Config} */

// Projust design system — taken from the landing page (hero-split-mind / landing-page branch).
// Warm paper canvas, ink text, white cards with a 1px line border, lime as the one pop colour,
// olive for active nav, orange for focus. Light theme only. Tokens live in src/app/globals.css.

// The app has hundreds of hardcoded `neutral-*` classes. Remapping the scale to the landing's
// warm greys keeps them all on-palette without touching every file.
const warm = {
  50: '#FBFAF7',
  100: '#F3F1EC',
  200: '#E3DFD7',
  300: '#D6D1C7',
  400: '#A8A39A',
  500: '#7A766F',
  600: '#5E5B56',
  700: '#3F3D3A',
  800: '#2A2927',
  900: '#111110',
  950: '#0A0A09',
};

// Olive (landing nav pill) replaces the generic blue accent.
const olive = {
  50: '#F5F8EA',
  100: '#E9F0D2',
  200: '#D3E2A6',
  300: '#B5CC73',
  400: '#8FA748',
  500: '#6B7F2C',
  600: '#4A5A1E',
  700: '#3A4716',
  800: '#2C3611',
  900: '#1F260C',
  950: '#12170A',
};

// Orange (landing focus + "neuron" dots) replaces purple/violet — the landing bans violet.
const orange = {
  50: '#FFF4EE',
  100: '#FFE6D9',
  200: '#FFCBB0',
  300: '#FFA87D',
  400: '#FF8C55',
  500: '#FF7A3D',
  600: '#E85F1F',
  700: '#C04A14',
  800: '#963A12',
  900: '#6E2B0E',
  950: '#3D1706',
};

// Mint/green for "verified / pass".
const mint = {
  50: '#EFFAF4',
  100: '#E6F5D0',
  200: '#C4EBD6',
  300: '#9BD9B8',
  400: '#5CCB9A',
  500: '#3FAE7E',
  600: '#2E8C63',
  700: '#26704F',
  800: '#1F5940',
  900: '#174331',
  950: '#0C261C',
};

module.exports = {
  // Kept so existing `dark:` classes compile, but the `dark` class is never applied (light only).
  darkMode: ['class'],
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        neutral: warm,
        gray: warm,
        slate: warm,
        zinc: warm,
        stone: warm,
        blue: olive,
        indigo: olive,
        purple: orange,
        violet: orange,
        emerald: mint,
        green: mint,

        // Landing tokens
        paper: { DEFAULT: 'var(--bg)', 2: 'var(--paper)' },
        sheet: 'var(--white)',
        ink: { DEFAULT: 'var(--ink)', 2: 'var(--ink-2)' },
        muted: 'var(--muted)',
        line: { DEFAULT: 'var(--line)', 2: 'var(--line-2)' },
        lime: { DEFAULT: 'var(--lime)', soft: '#EEF7C8' },
        olive: { DEFAULT: 'var(--olive)', d: 'var(--olive-d)' },
        tangerine: 'var(--orange)',
        sky2: 'var(--sky)',
        pass: 'var(--pass)',
        warn: 'var(--red)',

        // Legacy semantic tokens used across the app, now pointing at the landing palette
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
        serif: ['"Instrument Serif"', 'Georgia', 'serif'],
        sans: ['Geist', 'ui-sans-serif', 'system-ui', '-apple-system', '"Segoe UI"', 'sans-serif'],
        mono: ['"JetBrains Mono"', 'ui-monospace', 'SFMono-Regular', 'Menlo', 'monospace'],
      },
      borderRadius: {
        s: '12px',
        m: '20px',
        l: '28px',
      },
      boxShadow: {
        card: '0 1px 0 rgba(255,255,255,.9) inset, 0 18px 40px -18px rgba(30,25,15,.22), 0 2px 6px rgba(30,25,15,.06)',
        lift: '0 24px 50px -28px rgba(30,25,15,.35)',
        pill: '0 6px 14px -6px rgba(58,71,22,.6), inset 0 1px 0 rgba(255,255,255,.12)',
      },
      transitionTimingFunction: {
        land: 'cubic-bezier(.2,.8,.2,1)',
      },
    },
  },
  plugins: [],
};
