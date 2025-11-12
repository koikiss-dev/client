import React from "react";
import { motion } from "framer-motion";

/* Íconos SVG */
const Sun = (props) => (
  <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="1.8" {...props}>
    <circle cx="12" cy="12" r="4" />
    <path d="M12 2v2M12 20v2M4 12H2M22 12h-2M5 5l-1.4-1.4M20.4 20.4 19 19M5 19l-1.4 1.4M20.4 3.6 19 5" />
  </svg>
);
const Moon = (props) => (
  <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="1.8" {...props}>
    <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" />
  </svg>
);

export default function ThemeToggle() {
  const prefersDark = React.useMemo(() => window.matchMedia("(prefers-color-scheme: dark)").matches, []);
  const [theme, setTheme] = React.useState(() => localStorage.getItem("theme") || (prefersDark ? "dark" : "light"));

  React.useEffect(() => {
    const root = document.documentElement;
    const isDark = theme === "dark";
    root.classList.toggle("dark", isDark);
    localStorage.setItem("theme", theme);
  }, [theme]);

  const next = theme === "dark" ? "light" : "dark";

  return (
    <motion.button
      onClick={() => setTheme(next)}
      aria-label="Cambiar tema"
      title={theme === "dark" ? "Cambiar a claro" : "Cambiar a oscuro"}
      className="inline-flex items-center gap-2 px-3 py-1.5 text-sm rounded-lg border border-neutral-300 dark:border-neutral-700 hover:bg-neutral-100 dark:hover:bg-neutral-800"
      whileTap={{ scale: 0.96 }}
      whileHover={{ scale: 1.02 }}
      transition={{ type: "spring", stiffness: 260, damping: 22 }}
    >
      <motion.span
        key={theme}
        initial={{ rotate: -90, opacity: 0, y: -2 }}
        animate={{ rotate: 0, opacity: 1, y: 0 }}
        transition={{ type: "spring", stiffness: 300, damping: 18 }}
      >
        {theme === "dark" ? <Moon /> : <Sun />}
      </motion.span>
      <span className="hidden sm:inline">{theme === "dark" ? "Oscuro" : "Claro"}</span>
    </motion.button>
  );
}
