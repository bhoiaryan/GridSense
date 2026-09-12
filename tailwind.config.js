/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        grid: {
          bg: "#edf4f0",           // Soft Nordic sage background
          panel: "#ffffff",        // Crisp white card panels
          sidebar: "#0d261b",      // Deep Nordic spruce / pine
          sidebarMuted: "#8fa99c", // Soft sage muted text
          sidebarHover: "#163a2b", // Hover state in sidebar
          sidebarActive: "#1a4634",// Active state in sidebar
          line: "#334d3f",         // Prominent dark forest border
          lineDark: "#1a3326",     // Extra dark accent border
          ink: "#0c2419",          // Deep pine black text
          muted: "#4e6b5d",        // Calm forest slate muted text
          teal: "#047857",         // Primary forest emerald / pine teal
          emerald: "#059669",      // Vibrant energy green
          green: "#15803d",        // Forest green
          amber: "#b45309",        // Warm sunlight amber
          red: "#b91c1c"           // Alert crimson
        }
      },
      boxShadow: {
        card: "0 1px 3px rgba(12, 36, 25, 0.05), 0 1px 2px rgba(12, 36, 25, 0.03)"
      }
    }
  },
  plugins: []
};
