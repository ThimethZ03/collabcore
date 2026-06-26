/** @type {import('tailwindcss').Config} */
export default {
  darkMode: 'class',
  content: ["./index.html", "./src/**/*.{js,jsx}"],
  theme: {
    extend: {
      colors: {
        primary: {
          DEFAULT: '#4A90D9',
          dark: '#2563EB',
          light: '#EBF4FF',
          hover: '#3A7FC8',
        },
        success: '#22C55E',
        warning: '#F59E0B',
        danger: '#EF4444',
        info: '#3B82F6',
        neutral: '#94A3B8',
        surface: {
          bg: '#F0F7FF',
          card: '#FFFFFF',
          border: '#CBD5E1',
          input: '#F8FAFC',
        },
        dark: {
          bg: '#0F172A',
          card: '#1E293B',
          elevated: '#2D3A4F',
          border: '#334155',
          input: '#1E293B',
          primaryAccent: '#60A5FA',
          primaryLight: '#1E3A5F',
        },
        text: {
          primary: '#1E293B',
          secondary: '#64748B',
          muted: '#94A3B8',
          inverted: '#F1F5F9',
        },
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
      },
      backgroundImage: {
        'gradient-primary': 'linear-gradient(135deg, #2563EB 0%, #4A90D9 50%, #7EC8F0 100%)',
        'gradient-primary-dark': 'linear-gradient(135deg, #1E3A5F 0%, #1D4ED8 50%, #3B82F6 100%)',
        'gradient-card-light': 'linear-gradient(135deg, #EBF4FF 0%, #DBEAFE 100%)',
        'gradient-card-dark': 'linear-gradient(135deg, #1E293B 0%, #1E3A5F 100%)',
      },
    },
  },
  plugins: [],
}
