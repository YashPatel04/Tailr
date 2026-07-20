import type { Config } from "tailwindcss"
import defaultTheme from "tailwindcss/defaultTheme"

const config: Config = {
  darkMode: "class",
  content: ["./app/**/*.{js,ts,jsx,tsx,mdx}", "./components/**/*.{js,ts,jsx,tsx,mdx}"],
  theme: {
    extend: {
      colors: {
        paper: "#ffffff",
        ink: "#0d0d0d",
        slate: "#6b6e7b",
        brass: "#10a37f",
        "brass-hover": "#0d8c6d",
        "proof-green": "#10a37f",
        "proof-red": "#ef4444",
        danger: "#ef4444",
        sidebar: "#171717",
        "sidebar-hover": "#212121",
        "sidebar-active": "#2b2b2b",
        "sidebar-text": "#ececec",
        "sidebar-muted": "#8e8e8e",
        "message-assistant": "#f7f7f8",
        "message-user": "#f4f4f4",
        "border-subtle": "#e5e5e5",
        muted: "#e5e5e5",
        canvas: "#f7f7f8",
      },
      fontFamily: {
        sans: [
          "Inter",
          "-apple-system",
          "BlinkMacSystemFont",
          "\"Segoe UI\"",
          "system-ui",
          "sans-serif",
        ],
        serif: [
          "ui-serif",
          "Georgia",
          "Cambria",
          "\"Times New Roman\"",
          "Times",
          "serif",
        ],
        mono: [
          "ui-monospace",
          "SFMono-Regular",
          "SF Mono",
          "Menlo",
          "Consolas",
          "\"Liberation Mono\"",
          "monospace",
        ],
      },
    },
  },
  plugins: [],
}

export default config
