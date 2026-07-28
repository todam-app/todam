/** @type {import('tailwindcss').Config} */
module.exports = {
  darkMode: "class",
  content: [
    "./app/**/*.{js,jsx,ts,tsx}",
    "./components/**/*.{js,jsx,ts,tsx}",
    "../../packages/design-system/src/**/*.{js,jsx,ts,tsx}",
  ],
  presets: [require("nativewind/preset")],
  theme: {
    extend: {
      colors: {
        canvas: "#FCF8F2",
        gutter: "#FAF3E8",
        paper: "#FFFDF8",
        placeholder: "#F0E9DF",
        ink: "#151515",
        muted: "#6F6B64",
        accent: "#C43D28",
        line: "#D8D1C6",
        control: "#9B9388",
        disabled: "#E5E0D8",
        selected: "#FCEFEA",
        coral: "#F3A995",
        lilac: "#C8B8F0",
        aqua: "#9FD8D0",
        success: "#17633A",
        error: "#A1261A",
        danger: "#A1261A",
      },
      borderRadius: {
        todam: "6px",
        panel: "12px",
        media: "16px",
      },
      fontFamily: {
        sans: ['"Work Sans"', "system-ui", "sans-serif"],
        serif: ['"Playfair Display"', "Georgia", "serif"],
      },
      boxShadow: {
        soft: "0 10px 30px rgba(43, 34, 27, 0.10)",
      },
      maxWidth: {
        content: "1120px",
      },
    },
  },
  plugins: [],
};
