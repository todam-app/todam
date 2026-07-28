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
        canvas: "#F7F3EC",
        gutter: "#F0EAE1",
        paper: "#FFFDF8",
        ink: "#151515",
        muted: "#6F6B64",
        accent: "#C43D28",
        line: "#D8D1C6",
        control: "#9B9388",
        disabled: "#E5E0D8",
        success: "#17633A",
        error: "#A1261A",
        danger: "#A1261A",
      },
      borderRadius: {
        todam: "6px",
      },
      fontFamily: {
        sans: ["Inter", "system-ui", "sans-serif"],
        serif: ['"Source Serif 4"', "Georgia", "serif"],
      },
      maxWidth: {
        content: "1120px",
      },
    },
  },
  plugins: [],
};
