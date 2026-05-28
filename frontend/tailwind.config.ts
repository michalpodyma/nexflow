import type { Config } from "tailwindcss";

const config: Config = {
  darkMode: ["class"],
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        /* ── shadcn/ui compat ──────────────────────────────────────────── */
        border: "hsl(var(--border))",
        input: "hsl(var(--input))",
        ring: "hsl(var(--ring))",
        background: "hsl(var(--background))",
        foreground: "hsl(var(--foreground))",
        primary: {
          DEFAULT: "hsl(var(--primary))",
          foreground: "hsl(var(--primary-foreground))",
        },
        secondary: {
          DEFAULT: "hsl(var(--secondary))",
          foreground: "hsl(var(--secondary-foreground))",
        },
        muted: {
          DEFAULT: "hsl(var(--muted))",
          foreground: "hsl(var(--muted-foreground))",
        },
        accent: {
          DEFAULT: "hsl(var(--accent))",
          foreground: "hsl(var(--accent-foreground))",
        },
        destructive: {
          DEFAULT: "hsl(var(--destructive))",
          foreground: "hsl(var(--destructive-foreground))",
        },
        card: {
          DEFAULT: "hsl(var(--card))",
          foreground: "hsl(var(--card-foreground))",
        },
        "cloud-white": "hsl(var(--cloud-white))",

        /* ── Nexflow surface ladder ────────────────────────────────────── */
        canvas:    "var(--canvas)",
        "surface-1": "var(--surface-1)",
        "surface-2": "var(--surface-2)",
        "surface-3": "var(--surface-3)",
        hairline:  "var(--hairline)",

        /* ── Nexflow ink ───────────────────────────────────────────────── */
        ink:           "var(--ink)",
        "ink-muted":   "var(--ink-muted)",
        "ink-subtle":  "var(--ink-subtle)",
        "ink-tertiary":"var(--ink-tertiary)",
        "ink-inverse": "var(--ink-inverse)",

        /* ── Nexflow accent ────────────────────────────────────────────── */
        /* accent.DEFAULT comes from shadcn compat above (hsl(var(--accent))) */
        "accent-hover": "hsl(var(--accent-hover))",
        "accent-deep":  "hsl(var(--accent-deep))",
        "logo-navy":    "var(--logo-navy)",

        /* ── Nexflow semantic ──────────────────────────────────────────── */
        success: "var(--success)",
        warning: "var(--warning)",
        danger:  "var(--danger)",

        /* ── Legacy aliases (kept for backward compat) ─────────────────── */
        "nexflow-navy":     "#0F2040",
        "nexflow-cyan":     "#00C2D1",
        "nexflow-cyan-dark":"#007B86",
        graphite:           "#1F2937",
        slate:              "#6B7280",
        "meadow-green":     "#10B981",
      },

      /* ── Border radius scale ─────────────────────────────────────────── */
      borderRadius: {
        none: "0",
        xs:   "var(--radius-xs)",
        sm:   "var(--radius-sm)",
        DEFAULT: "var(--radius-md)",
        md:   "var(--radius-md)",
        lg:   "var(--radius-lg)",
        pill: "var(--radius-pill)",
        // shadcn compat
        full: "9999px",
      },

      /* ── Spacing tokens ──────────────────────────────────────────────── */
      spacing: {
        xxs:        "var(--space-xxs)",
        xs:         "var(--space-xs)",
        sm:         "var(--space-sm)",
        md:         "var(--space-md)",
        lg:         "var(--space-lg)",
        xl:         "var(--space-xl)",
        "2xl":      "var(--space-2xl)",
        section:    "var(--space-section)",
        "section-lg":"var(--space-section-lg)",
      },

      /* ── Typography scale ────────────────────────────────────────────── */
      fontSize: {
        "display-xl": ["72px",  { lineHeight: "1.05", letterSpacing: "-0.025em" }],
        "display-lg": ["56px",  { lineHeight: "1.08", letterSpacing: "-0.02em"  }],
        "display-md": ["40px",  { lineHeight: "1.15", letterSpacing: "-0.01em"  }],
        "h1":         ["32px",  { lineHeight: "1.2",  letterSpacing: "-0.005em" }],
        "h2":         ["24px",  { lineHeight: "1.3",  letterSpacing: "-0.0025em"}],
        "h3":         ["20px",  { lineHeight: "1.35", letterSpacing: "0"        }],
        "body-lg":    ["18px",  { lineHeight: "1.6",  letterSpacing: "0"        }],
        "body":       ["16px",  { lineHeight: "1.6",  letterSpacing: "0"        }],
        "body-sm":    ["14px",  { lineHeight: "1.5",  letterSpacing: "0"        }],
        "eyebrow":    ["12px",  { lineHeight: "1",    letterSpacing: "0.1em"    }],
        "mono":       ["13px",  { lineHeight: "1.5",  letterSpacing: "0"        }],
      },

      fontWeight: {
        display: "600",
        body:    "400",
      },
    },
  },
  plugins: [require("@tailwindcss/typography")],
};

export default config;
