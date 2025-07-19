/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {},
  },
  plugins: [require('daisyui')],
  daisyui: {
    themes: [
      {
        medical: {
          "primary": "#2563eb", // Professional medical blue
          "secondary": "#7c3aed", // Supportive purple
          "accent": "#059669", // Healing green
          "neutral": "#374151", // Calm gray
          "base-100": "#ffffff", // Clean white
          "base-200": "#f8fafc", // Light gray background
          "base-300": "#e2e8f0", // Border gray
          "base-content": "#1f2937", // Dark text
          "info": "#0ea5e9", // Information blue
          "success": "#10b981", // Success green
          "warning": "#f59e0b", // Warning amber
          "error": "#ef4444", // Error red
        }
      },
      "light", 
      "dark"
    ],
    darkTheme: "dark",
    base: true,
    styled: true,
    utils: true,
    rtl: false,
    prefix: "",
    logs: true,
  },
};