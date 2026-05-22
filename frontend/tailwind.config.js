/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      fontFamily: {
        display: ['"Fraunces"', 'Georgia', 'serif'],
        sans: ['"Geist"', 'system-ui', 'sans-serif'],
        mono: ['"JetBrains Mono"', 'ui-monospace', 'monospace'],
      },
      colors: {
        ink: {
          900: '#0a0807',
          800: '#11100e',
          700: '#181613',
          600: '#221f1a',
          500: '#2c2823',
          400: '#3a342c',
        },
        bone: {
          50: '#f4ede1',
          100: '#e8dfcf',
          200: '#cfc4ad',
          300: '#a89a7d',
        },
        ember: {
          400: '#ffb86b',
          500: '#f59333',
          600: '#d97608',
          700: '#a85602',
        },
        crimson: {
          400: '#ff5a5a',
          500: '#e23c3c',
          600: '#9b1c1c',
        },
      },
      boxShadow: {
        'inset-amber': 'inset 0 0 0 1px rgba(245,147,51,0.25)',
        'glow-amber': '0 0 40px -10px rgba(245,147,51,0.5)',
        'hard': '6px 6px 0 0 rgba(0,0,0,0.6)',
      },
      letterSpacing: {
        'cinema': '0.18em',
      },
      animation: {
        'pulse-soft': 'pulseSoft 2.4s ease-in-out infinite',
        'aperture': 'aperture 1.4s ease-out forwards',
        'flicker': 'flicker 3.6s linear infinite',
        'rise': 'rise 0.6s cubic-bezier(0.2, 0.8, 0.2, 1) both',
      },
      keyframes: {
        pulseSoft: {
          '0%, 100%': { opacity: 0.55 },
          '50%': { opacity: 1 },
        },
        aperture: {
          '0%': { clipPath: 'circle(0% at 50% 50%)' },
          '100%': { clipPath: 'circle(140% at 50% 50%)' },
        },
        flicker: {
          '0%, 18%, 22%, 25%, 53%, 57%, 100%': { opacity: 1 },
          '20%, 24%, 55%': { opacity: 0.85 },
        },
        rise: {
          '0%': { transform: 'translateY(12px)', opacity: 0 },
          '100%': { transform: 'translateY(0)', opacity: 1 },
        },
      },
    },
  },
  plugins: [],
};
