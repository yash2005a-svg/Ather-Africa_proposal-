import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./app/**/*.{js,ts,jsx,tsx}", "./components/**/*.{js,ts,jsx,tsx}"],
  theme: {
    extend: {
      colors: {
        ink: "#0b1010",
        panel: "#121a19",
        line: "#27322f",
        mint: "#b8f36b"
      }
    }
  },
  plugins: []
};

export default config;
