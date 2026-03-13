/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,jsx,ts,tsx}"],
  theme: {
    extend: {
      colors: {
        background: "hsl(210 40% 98%)",
        foreground: "hsl(222.2 47.4% 11.2%)",
        card: "hsl(0 0% 100%)",
        "card-foreground": "hsl(222.2 47.4% 11.2%)",
        primary: "hsl(202 80% 40%)",
        "primary-foreground": "hsl(210 40% 98%)",
        secondary: "hsl(210 22% 92%)",
        "secondary-foreground": "hsl(222.2 47.4% 11.2%)",
        muted: "hsl(210 20% 92%)",
        "muted-foreground": "hsl(215.4 16.3% 46.9%)",
        border: "hsl(214.3 31.8% 85%)",
        input: "hsl(214.3 31.8% 85%)",
        destructive: "hsl(0 84.2% 60.2%)",
        "destructive-foreground": "hsl(210 40% 98%)"
      },
      borderRadius: {
        lg: "0.75rem",
        md: "0.5rem",
        sm: "0.375rem"
      }
    }
  },
  plugins: []
};
