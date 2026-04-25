/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,jsx}"],
  theme: {
    extend: {
      fontFamily: {
        display: ["Cormorant Garamond", "serif"],
        body: ["Manrope", "sans-serif"]
      },
      boxShadow: {
        glow: "0 18px 50px rgba(38, 41, 56, 0.08)",
        card: "0 24px 80px rgba(22, 27, 45, 0.08)"
      },
      animation: {
        "pulse-fast": "pulse 1s linear infinite"
      }
    }
  },
  plugins: []
};
