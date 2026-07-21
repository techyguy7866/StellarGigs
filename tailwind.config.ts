import type { Config } from "tailwindcss";

const config: Config = {
  darkMode: "class",
  content: [
    "./pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: ["var(--font-inter)", "system-ui", "sans-serif"],
        mono: ["var(--font-fira-code)", "monospace"],
      },
      colors: {
        background: "hsl(var(--background))",
        foreground: "hsl(var(--foreground))",
        card: {
          DEFAULT: "hsl(var(--card))",
          foreground: "hsl(var(--card-foreground))",
        },
        popover: {
          DEFAULT: "hsl(var(--popover))",
          foreground: "hsl(var(--popover-foreground))",
        },
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
        border: "hsl(var(--border))",
        input: "hsl(var(--input))",
        ring: "hsl(var(--ring))",
        // Custom brand colors
        stellar: {
          50: "hsl(152, 100%, 97%)",
          100: "hsl(152, 98%, 88%)",
          200: "hsl(152, 96%, 76%)",
          300: "hsl(152, 95%, 62%)",
          400: "hsl(152, 100%, 50%)",
          500: "hsl(152, 100%, 42%)",
          600: "hsl(152, 100%, 34%)",
          700: "hsl(152, 100%, 26%)",
          800: "hsl(152, 100%, 18%)",
          900: "hsl(152, 100%, 10%)",
        },
        cyan: {
          50: "hsl(185, 100%, 97%)",
          100: "hsl(185, 98%, 88%)",
          200: "hsl(185, 96%, 76%)",
          300: "hsl(185, 95%, 64%)",
          400: "hsl(185, 100%, 55%)",
          500: "hsl(185, 100%, 46%)",
          600: "hsl(185, 100%, 38%)",
          700: "hsl(185, 100%, 28%)",
          800: "hsl(185, 100%, 18%)",
          900: "hsl(185, 100%, 10%)",
        },
      },
      backgroundImage: {
        "gradient-radial": "radial-gradient(var(--tw-gradient-stops))",
        "gradient-conic":
          "conic-gradient(from 180deg at 50% 50%, var(--tw-gradient-stops))",
        "hero-gradient":
          "linear-gradient(135deg, hsl(152,100%,4%) 0%, hsl(185,100%,6%) 50%, hsl(220,20%,5%) 100%)",
        "card-gradient":
          "linear-gradient(135deg, rgba(255,255,255,0.04) 0%, rgba(255,255,255,0.02) 100%)",
        "stellar-gradient":
          "linear-gradient(135deg, hsl(152,100%,42%) 0%, hsl(185,100%,50%) 100%)",
      },
      keyframes: {
        "fade-in": {
          "0%": { opacity: "0", transform: "translateY(10px)" },
          "100%": { opacity: "1", transform: "translateY(0)" },
        },
        "slide-in": {
          "0%": { opacity: "0", transform: "translateX(-20px)" },
          "100%": { opacity: "1", transform: "translateX(0)" },
        },
        shimmer: {
          "0%": { backgroundPosition: "-200% 0" },
          "100%": { backgroundPosition: "200% 0" },
        },
        pulse: {
          "0%, 100%": { opacity: "1" },
          "50%": { opacity: "0.5" },
        },
        "glow-pulse": {
          "0%, 100%": {
            boxShadow: "0 0 20px hsl(152 100% 45% / 0.25)",
          },
          "50%": {
            boxShadow: "0 0 45px hsl(152 100% 45% / 0.5)",
          },
        },
        float: {
          "0%, 100%": { transform: "translateY(0px)" },
          "50%": { transform: "translateY(-8px)" },
        },
      },
      animation: {
        "fade-in": "fade-in 0.5s ease-out",
        "slide-in": "slide-in 0.4s ease-out",
        shimmer: "shimmer 2s infinite linear",
        "glow-pulse": "glow-pulse 3s ease-in-out infinite",
        float: "float 3s ease-in-out infinite",
      },
      borderRadius: {
        lg: "var(--radius)",
        md: "calc(var(--radius) - 2px)",
        sm: "calc(var(--radius) - 4px)",
      },
      boxShadow: {
        glow: "0 0 30px hsl(152 100% 45% / 0.2)",
        "glow-cyan": "0 0 30px hsl(185 100% 55% / 0.2)",
        card: "0 4px 24px rgba(0, 0, 0, 0.35)",
        "card-hover": "0 8px 40px rgba(0, 0, 0, 0.5)",
      },
    },
  },
  plugins: [],
};

export default config;
