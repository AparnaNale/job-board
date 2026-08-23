/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./app/**/*.{js,jsx}",
    "./components/**/*.{js,jsx}",
  ],
  theme: {
    extend: {
      colors: {
        // Clean SaaS-landing palette: near-white background, near-black
        // text, one confident violet accent for CTAs and highlights.
        ink: "#15121F",
        paper: "#FFFFFF",
        surface: "#F6F3FC",
        violet: "#6D28D9",
        violetSoft: "#EFE7FD",
        mint: "#16A34A",
        slate: "#635C74",
        line: "#E7E1F3",
      },
      fontFamily: {
        display: ["'Space Grotesk'", "sans-serif"],
        body: ["'Inter'", "sans-serif"],
        mono: ["'JetBrains Mono'", "monospace"],
        // Editorial serif used for the homepage hero headline only.
        serif: ["'Lora'", "serif"],
      },
    },
  },
  plugins: [],
};