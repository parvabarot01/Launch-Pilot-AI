import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./src/**/*.{js,ts,jsx,tsx,mdx}"],
  darkMode: "class",
  theme: {
    extend: {
      colors: {
        brand: {
          50: "#f0f5ff",
          100: "#dbe6fe",
          200: "#bccffd",
          300: "#8daefb",
          400: "#5885f7",
          500: "#3660f0",
          600: "#2542e4",
          700: "#1f34c6",
          800: "#202da0",
          900: "#20297e",
          950: "#161a4d",
        },
      },
    },
  },
  plugins: [],
};

export default config;
