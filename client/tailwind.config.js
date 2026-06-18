/** @type {import('tailwindcss').Config} */
export default {
  darkMode: "class",
  content: ["./index.html", "./src/**/*.{js,jsx}"],
  theme: {
    extend: {
      colors: {
        ink: "#15171a",
        canvas: "#f6f7f3",
        lime: { 400: "#b8f34a", 500: "#9ee52d" },
        violet: { 400: "#9b87f5", 500: "#7f68e8" }
      },
      fontFamily: {
        sans: ["DM Sans", "sans-serif"],
        display: ["Manrope", "sans-serif"]
      },
      boxShadow: {
        soft: "0 18px 50px rgba(18, 20, 24, .08)"
      }
    }
  },
  plugins: []
};
