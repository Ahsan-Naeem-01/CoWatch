/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      fontFamily: {
        display: ['"Instrument Serif"', '"Bodoni Moda"', 'Georgia', 'serif'],
        sans: ['"Geist"', '-apple-system', 'BlinkMacSystemFont', 'Segoe UI', 'system-ui', 'sans-serif'],
        mono: ['"Geist Mono"', '"JetBrains Mono"', 'ui-monospace', 'SF Mono', 'Menlo', 'monospace'],
      },
      colors: {
        bg: {
          DEFAULT: '#07090f',
          2: '#0d1119',
        },
        surface: {
          DEFAULT: '#11151f',
          2: '#161b28',
          3: '#1c2230',
        },
        line: {
          DEFAULT: 'rgba(180, 200, 255, 0.07)',
          strong: 'rgba(180, 200, 255, 0.16)',
        },
        fg: {
          DEFAULT: '#e8ecf5',
          2: 'rgba(232, 236, 245, 0.7)',
          3: 'rgba(232, 236, 245, 0.4)',
        },
        accent: {
          DEFAULT: '#7c7cf5',
          soft: 'rgba(124, 124, 245, 0.16)',
          contrast: '#ffffff',
        },
        danger: '#f06c8a',
        success: '#5dd6a3',
        // Avatar palette
        av: {
          0: '#f5a524',
          1: '#7c7cf5',
          2: '#5dd6a3',
          3: '#f06c8a',
          4: '#e5b85d',
          5: '#6fb8d1',
        },
      },
      borderRadius: {
        'xl-2': '14px',
      },
      boxShadow: {
        'glow-accent': '0 0 40px -10px rgba(124, 124, 245, 0.55)',
        'card-lg': '0 30px 80px -20px rgba(0,0,0,0.6), 0 1px 0 rgba(255,255,255,0.04) inset',
        'pop': '0 12px 32px -12px rgba(0,0,0,0.6)',
      },
      letterSpacing: {
        cinema: '0.16em',
      },
      animation: {
        'pulse-soft': 'pulseSoft 2.4s ease-in-out infinite',
        'rise': 'rise 0.6s cubic-bezier(0.2, 0.8, 0.2, 1) both',
        'fade-in': 'fadeIn .35s ease-out both',
        'blink': 'blink 1s infinite',
        'orb-rotate': 'orbRotate 22s linear infinite',
      },
      keyframes: {
        pulseSoft: {
          '0%, 100%': { opacity: 0.5 },
          '50%': { opacity: 1 },
        },
        rise: {
          '0%': { transform: 'translateY(12px)', opacity: 0 },
          '100%': { transform: 'translateY(0)', opacity: 1 },
        },
        fadeIn: {
          '0%': { opacity: 0, transform: 'translateY(6px)' },
          '100%': { opacity: 1, transform: 'translateY(0)' },
        },
        blink: {
          '0%, 100%': { opacity: 0.4 },
          '50%': { opacity: 1 },
        },
        orbRotate: {
          '0%': { transform: 'rotate(0deg)' },
          '100%': { transform: 'rotate(360deg)' },
        },
      },
    },
  },
  plugins: [],
};
