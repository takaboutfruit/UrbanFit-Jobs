import type { Config } from "tailwindcss";

/**
 * Tailwind theme wired to the UrbanFit Jobs (dark-mode) reference design tokens
 * from references/urbanfit_jobs/DESIGN.md.
 *
 * The system sans-serif fallback stack preserves the typography scale sizing
 * defined below when Be Vietnam Pro fails to load (Requirement 1.3).
 */
const config: Config = {
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  darkMode: "class",
  theme: {
    extend: {
      colors: {
        // Surfaces
        surface: "#0a0c10",
        "surface-dim": "#161b22",
        "surface-bright": "#21262d",
        "surface-container-lowest": "#010409",
        "surface-container-low": "#0d1117",
        "surface-container": "#161b22",
        "surface-container-high": "#21262d",
        "surface-container-highest": "#30363d",
        // On-surface / outlines
        "on-surface": "#f0f6fc",
        "on-surface-variant": "#8b949e",
        outline: "#30363d",
        "outline-variant": "#484f58",
        // Primary accent
        primary: "#4edea3",
        "on-primary": "#003824",
        "primary-container": "#064e3b",
        "on-primary-container": "#34d399",
        // Secondary accent
        secondary: "#a2c9ff",
        "on-secondary": "#00315c",
        "secondary-container": "#003366",
        "on-secondary-container": "#a5d1ff",
        // Tertiary (radar market series)
        tertiary: "#ffb3af",
        "on-tertiary": "#650911",
        "tertiary-container": "#fc7c78",
        "on-tertiary-container": "#711419",
        // Semantic states
        warning: "#f2cc60",
        error: "#f85149",
        "on-error": "#690005",
        "error-container": "#93000a",
        "on-error-container": "#ffdad6",
        // Destructive is an alias of error for HR reject action
        destructive: "#f85149",
      },
      fontFamily: {
        // Be Vietnam Pro first, with a system sans-serif fallback stack that
        // preserves the typography scale sizing.
        sans: [
          '"Be Vietnam Pro"',
          "-apple-system",
          "BlinkMacSystemFont",
          '"Segoe UI"',
          "Roboto",
          '"Helvetica Neue"',
          "Arial",
          "sans-serif",
        ],
      },
      fontSize: {
        // Typography scale as [size, { lineHeight, fontWeight, letterSpacing }]
        "headline-lg": ["32px", { lineHeight: "1.2", fontWeight: "700" }],
        "headline-lg-mobile": ["28px", { lineHeight: "1.2", fontWeight: "700" }],
        "headline-md": ["24px", { lineHeight: "1.2", fontWeight: "700" }],
        "body-lg": ["16px", { lineHeight: "1.5", fontWeight: "400" }],
        "body-md": ["14px", { lineHeight: "1.5", fontWeight: "400" }],
        "label-sm": [
          "12px",
          { lineHeight: "1", fontWeight: "500", letterSpacing: "-0.01em" },
        ],
      },
      borderRadius: {
        sm: "0.25rem",
        DEFAULT: "0.5rem",
        md: "0.75rem",
        lg: "1rem",
        xl: "1.5rem",
        full: "9999px",
      },
      spacing: {
        "margin-desktop": "40px",
        "gutter-desktop": "24px",
        "margin-mobile": "16px",
        "gutter-mobile": "16px",
        "space-xs": "4px",
        "space-sm": "8px",
        "space-md": "16px",
        "space-lg": "24px",
        "space-xl": "48px",
      },
    },
  },
  plugins: [],
};

export default config;
