// src/components/ThemeAIControl.jsx
import React from "react";
import { useSmartTheme, MOODS } from "../lib/useSmartTheme";

const Brain = (p)=>(
  <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="1.8" {...p}>
    <path d="M8 8a3 3 0 1 1 0-6 3 3 0 0 1 0 6Zm8 0a3 3 0 1 1 0-6 3 3 0 0 1 0 6Z" />
    <path d="M3 13a5 5 0 0 0 5 5h8a5 5 0 0 0 5-5c0-2.5-2-5-5-5H8c-3 0-5 2.5-5 5Z" />
  </svg>
);

export default function ThemeAIControl() {
  const { mood, setMood } = useSmartTheme("auto");

  const next = React.useCallback(() => {
    const i = MOODS.indexOf(mood);
    setMood(MOODS[(i + 1) % MOODS.length]);
  }, [mood, setMood]);

  return (
    <button
      onClick={next}
      title={`Paleta IA: ${mood}`}
      className="inline-flex items-center gap-2 px-3 py-1.5 text-xs rounded-full
                 bg-[var(--accent)] text-[var(--accent-foreground)]
                 shadow-sm hover:brightness-110"
    >
      <Brain /> {mood}
    </button>
  );
}
// Componente de control para cambiar la paleta de colores generada por IA
// Muestra el estado actual y permite ciclar entre las opciones disponibles