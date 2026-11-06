import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./app/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}"],
  theme: {
    extend: {
      fontFamily: {
        sans: ["var(--font-jost)", "Helvetica Neue", "Arial", "sans-serif"],
      },
      colors: {
        ink: "#111111",
        "ink-soft": "#3A3734",
        mute: "#5E5A55",
        faint: "#8A847D",
        line: "#E2DED8",
        "line-soft": "#EFECE7",
        "line-faint": "#F0EDE8",
        sand: "#F5F3EF",
        stone: "#EDEAE5",
        "stone-text": "#9A938B",
        hero: "#F1EEEA",
        wine: "#1E1A1C",
      },
      maxWidth: { site: "1440px" },
      spacing: { gutter: "clamp(16px, 2.4vw, 32px)" },
      fontSize: {
        h2: ["clamp(22px, 2.2vw, 30px)", { lineHeight: "1.2" }],
        h1: ["clamp(24px, 2.4vw, 34px)", { lineHeight: "1.2" }],
        brand: ["clamp(16px, 1.55vw, 22px)", { lineHeight: "1" }],
      },
      transitionTimingFunction: { lux: "cubic-bezier(.2,.7,.2,1)" },
      keyframes: {
        slideInL: { from: { transform: "translateX(-100%)" }, to: { transform: "translateX(0)" } },
        slideOutL: { from: { transform: "translateX(0)" }, to: { transform: "translateX(-100%)" } },
        slideInR: { from: { transform: "translateX(100%)" }, to: { transform: "translateX(0)" } },
        slideOutR: { from: { transform: "translateX(0)" }, to: { transform: "translateX(100%)" } },
        dropIn: { from: { transform: "translateY(-100%)" }, to: { transform: "translateY(0)" } },
        dropOut: { from: { transform: "translateY(0)" }, to: { transform: "translateY(-100%)" } },
        fadeIn: { from: { opacity: "0" }, to: { opacity: "1" } },
        fadeOut: { from: { opacity: "1" }, to: { opacity: "0" } },
        rise: { from: { opacity: "0", transform: "translateY(10px)" }, to: { opacity: "1", transform: "none" } },
        subIn: { from: { opacity: "0", transform: "translateX(24px)" }, to: { opacity: "1", transform: "none" } },
      },
      animation: {
        "drawer-in": "slideInL .5s cubic-bezier(.2,.7,.2,1) both",
        "drawer-out": "slideOutL .35s cubic-bezier(.4,0,.6,1) both",
        "drawer-r-in": "slideInR .5s cubic-bezier(.2,.7,.2,1) both",
        "drawer-r-out": "slideOutR .35s cubic-bezier(.4,0,.6,1) both",
        "search-in": "dropIn .45s cubic-bezier(.2,.7,.2,1) both",
        "search-out": "dropOut .3s cubic-bezier(.4,0,.6,1) both",
        "back-in": "fadeIn .4s ease both",
        "back-out": "fadeOut .35s ease both",
        rise: "rise .5s cubic-bezier(.2,.7,.2,1) both",
        "sub-in": "subIn .4s cubic-bezier(.2,.7,.2,1) both",
      },
    },
  },
  plugins: [],
};
export default config;
