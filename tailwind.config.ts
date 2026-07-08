import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./src/**/*.{js,ts,jsx,tsx,mdx}"],
  darkMode: ["selector", '[data-theme="dark"]'],
  theme: {
    extend: {
      fontFamily: {
        sans: ["var(--font-geist-sans)", "system-ui", "sans-serif"],
        mono: ["var(--font-geist-mono)", "ui-monospace", "monospace"],
      },
      colors: {
        brand: {
          DEFAULT: "var(--brand)",
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
        ink: "var(--ink)",
        slate: {
          DEFAULT: "var(--slate)",
        },
        mute: "var(--mute)",
        rule: "var(--rule)",
        surface: "var(--surface)",
        wash: "var(--wash)",
        risk: {
          clear: "var(--risk-clear)",
          "clear-wash": "var(--risk-clear-wash)",
          watch: "var(--risk-watch)",
          "watch-wash": "var(--risk-watch-wash)",
          halt: "var(--risk-halt)",
          "halt-wash": "var(--risk-halt-wash)",
          inert: "var(--risk-inert)",
          "inert-wash": "var(--risk-inert-wash)",
        },
        "brand-wash": "var(--brand-wash)",
        chrome: {
          ship: "var(--chrome-ship)",
          oversee: "var(--chrome-oversee)",
          ask: "var(--chrome-ask)",
        },
        env: {
          dev: "var(--env-dev)",
          staging: "var(--env-staging)",
          prod: "var(--env-prod)",
        },
        id: {
          coral: "var(--id-coral)",
          "coral-wash": "var(--id-coral-wash)",
          "coral-deep": "var(--id-coral-deep)",
          violet: "var(--id-violet)",
          "violet-wash": "var(--id-violet-wash)",
          "violet-deep": "var(--id-violet-deep)",
          teal: "var(--id-teal)",
          "teal-wash": "var(--id-teal-wash)",
          "teal-deep": "var(--id-teal-deep)",
          gold: "var(--id-gold)",
          "gold-wash": "var(--id-gold-wash)",
          "gold-deep": "var(--id-gold-deep)",
          sky: "var(--id-sky)",
          "sky-wash": "var(--id-sky-wash)",
          "sky-deep": "var(--id-sky-deep)",
          plum: "var(--id-plum)",
          "plum-wash": "var(--id-plum-wash)",
          "plum-deep": "var(--id-plum-deep)",
        },
      },
      fontSize: {
        "page-title": ["30px", { lineHeight: "36px", fontWeight: "600", letterSpacing: "-0.02em" }],
        "section-head": ["19px", { lineHeight: "26px", fontWeight: "600", letterSpacing: "-0.01em" }],
        eyebrow: ["11px", { lineHeight: "14px", fontWeight: "600", letterSpacing: "0.08em" }],
        data: ["13px", { lineHeight: "18px", fontWeight: "500", letterSpacing: "-0.01em" }],
        "stat-figure": ["34px", { lineHeight: "38px", fontWeight: "500", letterSpacing: "-0.03em" }],
      },
      borderRadius: {
        card: "6px",
        control: "5px",
      },
      boxShadow: {
        hairline: "0 1px 2px rgba(11,15,25,0.04)",
      },
      keyframes: {
        "fade-in-up": {
          "0%": { opacity: "0", transform: "translateY(4px)" },
          "100%": { opacity: "1", transform: "translateY(0)" },
        },
        "lift-settle": {
          "0%": { transform: "translateY(0)" },
          "40%": { transform: "translateY(-3px)" },
          "100%": { transform: "translateY(0)" },
        },
        "toast-in": {
          "0%": { opacity: "0", transform: "translateY(8px)" },
          "100%": { opacity: "1", transform: "translateY(0)" },
        },
        "draw-stroke": {
          "0%": { strokeDashoffset: "1" },
          "100%": { strokeDashoffset: "0" },
        },
        "drawer-in": {
          "0%": { opacity: "0", transform: "translateX(24px)" },
          "100%": { opacity: "1", transform: "translateX(0)" },
        },
      },
      animation: {
        "fade-in-up": "fade-in-up 120ms ease-out both",
        "lift-settle": "lift-settle 400ms ease-out",
        "toast-in": "toast-in 180ms ease-out both",
        "draw-stroke": "draw-stroke 500ms ease-out 200ms both",
        "drawer-in": "drawer-in 200ms cubic-bezier(0.32, 0.72, 0, 1) both",
      },
    },
  },
  plugins: [],
};

export default config;
