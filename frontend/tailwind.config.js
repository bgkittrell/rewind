/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        teal: '#26A69A',
        primary: '#26A69A',
        secondary: '#004D40'
      },
      screens: {
        xs: '320px'
      }
    }
  },
  plugins: []
}