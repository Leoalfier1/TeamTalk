/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ["./src/**/*.{js,jsx,ts,tsx}"],
  theme: {
    extend: {
      fontFamily: {
        sans: ['"Plus Jakarta Sans"', 'sans-serif'],
      },
      colors: {
        brand: {
          50: '#f5f3ff',
          100: '#ede9fe',
          500: '#6366f1', // This is the purple in your design
          600: '#4f46e5',
        }
      },
      borderRadius: {
        '4xl': '2.5rem', // The very rounded corners in your images
      }
    },
  },
  plugins: [],
}