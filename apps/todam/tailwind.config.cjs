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
        paper: "#FFFDF8",
        ink: "#151515",
        muted: "#6F6B64",
        accent: "#C43D28",
        line: "#D8D1C6",
      },
      borderRadius: {
        todam: "12px",
      },
      maxWidth: {
        content: "1120px",
      },
    },
  },
  plugins: [],
};
