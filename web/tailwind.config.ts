import type { Config } from "tailwindcss";

// Values come from src/styles/tokens.css. Colors, radii and shadows replace (not extend)
// the defaults, so the default palette does not exist and only tokens can be used.
export default {
  content: [],
  theme: {
    colors: {
      transparent: "transparent",
      current: "currentColor",
      white: "var(--od-white)",
      paper: "var(--od-paper)",
      navy: { 50: "var(--od-navy-50)", 800: "var(--od-navy-800)", 900: "var(--od-navy-900)" },
      green: { 50: "var(--od-green-50)", 700: "var(--od-green-700)" },
      gold: { 500: "var(--od-gold-500)", 600: "var(--od-gold-600)" },
      cream: { 50: "var(--od-cream-50)" },
      graphite: { 900: "var(--od-graphite-900)" },
      gray: {
        50: "var(--od-gray-50)",
        100: "var(--od-gray-100)",
        200: "var(--od-gray-200)",
        500: "var(--od-gray-500)",
        600: "var(--od-gray-600)",
      },
      amber: { 50: "var(--od-amber-50)", 700: "var(--od-amber-700)" },
      brick: { 50: "var(--od-brick-50)", 700: "var(--od-brick-700)" },
    },
    borderRadius: {
      none: "0",
      control: "var(--od-radius-control)",
      card: "var(--od-radius-card)",
      full: "9999px",
    },
    boxShadow: {
      none: "none",
      hairline: "var(--od-shadow-hairline)",
      overlay: "var(--od-shadow-overlay)",
    },
    fontFamily: {
      serif: "var(--od-font-serif)",
      sans: "var(--od-font-sans)",
      mono: "var(--od-font-mono)",
    },
    extend: {
      // Spacing keeps Tailwind's 4 px base (p-1 = 4 px, p-5 = 20 px).
      transitionDuration: {
        fast: "var(--od-duration-fast)",
        base: "var(--od-duration-base)",
      },
      transitionTimingFunction: {
        od: "var(--od-ease)",
      },
    },
  },
} satisfies Config;
