/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        primary: "#1890ff",
        secondary: "#722ed1",
        success: "#52c41a",
        danger: "#f5222d",
        "dark-blue": "#001529",
        "dark-blue-light": "#003a70",
      },
      boxShadow: {
        card: "0 2px 8px rgba(0,0,0,0.06)",
        cardHover: "0 4px 16px rgba(0,0,0,0.12)",
      },
      borderRadius: {
        card: "12px",
        button: "8px",
      },
    },
  },
  plugins: [],
}
