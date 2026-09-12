/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        grid: {
          bg: "#f5f7fa",
          panel: "#ffffff",
          sidebar: "#111827",
          sidebarMuted: "#9ca3af",
          line: "#d9e0e8",
          ink: "#0f172a",
          muted: "#64748b",
          teal: "#0f766e",
          blue: "#2563eb",
          green: "#15803d",
          amber: "#b45309",
          red: "#b91c1c"
        }
      },
      boxShadow: {
        card: "0 1px 2px rgba(15, 23, 42, 0.06)"
      }
    }
  },
  plugins: []
};
