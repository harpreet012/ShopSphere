/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        primary: { DEFAULT: '#2874F0', dark: '#1a5cd8', light: '#e8f0fe' },
        accent: { DEFAULT: '#FF9F00', dark: '#e58a00' },
        success: '#388e3c',
        danger: '#ff6161',
        surface: '#ffffff',
        muted: '#f1f3f6'
      },
      fontFamily: { sans: ['Inter', 'Roboto', 'system-ui', 'sans-serif'] },
      boxShadow: {
        card: '0 1px 2px 0 rgba(0,0,0,0.08)',
        cardHover: '0 4px 12px 0 rgba(0,0,0,0.12)'
      }
    }
  },
  plugins: []
};
