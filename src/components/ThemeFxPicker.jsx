// client/src/components/ThemeFxPicker.jsx
import React from "react";

/* =========================
   Paletas
========================= */
const PALETTES = [
  { key: "neon",    name: "Neón",     colors: ["#ff00e6", "#00e1ff", "#00ff87"] },
  { key: "candy",   name: "Candy",    colors: ["#ff3cac", "#784ba0", "#2b86c5"] },
  { key: "retro",   name: "Retro",    colors: ["#f72585", "#4361ee", "#4cc9f0"] },
  { key: "holo",    name: "Holo",     colors: ["#a1ffce", "#faffd1", "#fcb045"] },
  { key: "cyber",   name: "Cyber",    colors: ["#8a2be2", "#00ffff", "#39ff14"] },
  { key: "sunset",  name: "Sunset",   colors: ["#ff5f6d", "#ffc371", "#ffd166"] },
  { key: "ocean",   name: "Océano",   colors: ["#00c6ff", "#0072ff", "#00ffa3"] },
  // 🚀 extras “de otro planeta”
  { key: "aurora",  name: "Aurora",   colors: ["#00ffa3", "#00c2ff", "#7c4dff"] },
  { key: "nebula",  name: "Nébula",   colors: ["#ff6ec7", "#845ef7", "#57d8ff"] },
  { key: "galaxy",  name: "Galaxia",  colors: ["#06b6d4", "#3b82f6", "#a78bfa"] },
  { key: "inferno", name: "Ígneo",    colors: ["#ff4d00", "#f59e0b", "#fde047"] },
  { key: "ice",     name: "Hielo",    colors: ["#e0fbfc", "#90cdf4", "#a7f3d0"] },
  { key: "acid",    name: "Ácido",    colors: ["#d9f99d", "#22d3ee", "#a78bfa"] },
  { key: "prism",   name: "Prisma",   colors: ["#ff0080", "#ff8c00", "#40e0d0"] },
  { key: "quantum", name: "Quantum",  colors: ["#00ffd1", "#00a1ff", "#b300ff"] },
];

const PAL_MAP = Object.fromEntries(PALETTES.map(p => [p.key, p.colors]));

/* =========================
   Icono (más fino / discreto)
========================= */
function PaletteIcon(props) {
  return (
    <svg viewBox="0 0 24 24" width="16" height="16" fill="none"
         stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" {...props}>
      <path d="M12 22A10 10 0 1 1 22 12a3 3 0 0 1-3 3h-1a2 2 0 0 0 0 4h.5" />
      <circle cx="7.5" cy="10.5" r="1" />
      <circle cx="12"  cy="7.2"  r="1" />
      <circle cx="16.5" cy="10.5" r="1" />
    </svg>
  );
}

/* =========================
   Estilos (botón + panel + fondo animado)
========================= */
const THEME_PICKER_CSS = `
/* ---------- Botón Paleta (sutil) ---------- */
.btn-palette{
  position:relative; color:#fff; border:0; border-radius:14px;
  background: linear-gradient(135deg,#f59e0b 0%, #06b6d4 55%, #a78bfa 100%);
  background-size: 200% 200%;
  padding: .45rem .9rem;
  box-shadow: 0 8px 20px rgba(6,182,212,.18), 0 6px 16px rgba(167,139,250,.14);
  isolation:isolate;
  animation: paletteShift 14s ease-in-out infinite;
}
.btn-palette::before{
  content:""; position:absolute; inset:-2px; border-radius:inherit; padding:2px;
  background: linear-gradient(135deg,rgba(245,158,11,.75),rgba(6,182,212,.75),rgba(167,139,250,.75));
  -webkit-mask:linear-gradient(#000 0 0) content-box,linear-gradient(#000 0 0);
  -webkit-mask-composite:xor; mask-composite:exclude; pointer-events:none;
}
.btn-palette::after{
  content:""; position:absolute; inset:-24%; border-radius:inherit; z-index:-1;
  background: radial-gradient(60% 60% at 30% 40%,
                rgba(6,182,212,.28),
                rgba(245,158,11,.22) 42%,
                rgba(167,139,250,.22) 58%,
                transparent 70%);
  filter: blur(14px);
}
.btn-palette:hover{ filter:brightness(1.04); box-shadow:0 10px 26px rgba(6,182,212,.28),0 8px 20px rgba(167,139,250,.22); }
.btn-palette:active{ transform:translateY(1px); }
.btn-palette .sheen{ position:absolute; inset:0; border-radius:inherit; overflow:hidden; pointer-events:none; }
.btn-palette .sheen::before{
  content:""; position:absolute; inset:-80%;
  background: radial-gradient(closest-side,rgba(255,255,255,.20),transparent 60%);
  transform: translateX(var(--x,-60%)); transition: transform .35s ease;
}
.btn-palette:hover .sheen::before{ --x: 40%; }

.dropdown-panel{
  border:1px solid rgba(115,115,115,.2);
  backdrop-filter: blur(6px);
}

/* ---------- Swatches ---------- */
.swatch-btn{
  width:30px; height:30px; border-radius:9999px;
  border:1px solid rgba(0,0,0,.14);
  background-size: 160% 160%;
  transition: transform .18s ease, box-shadow .2s ease, filter .2s ease;
}
.dark .swatch-btn{ border-color: rgba(255,255,255,.16); }
.swatch-btn:hover{ transform: translateY(-1px); filter: brightness(1.04) saturate(1.04); }
.swatch-btn.is-active{
  outline:2px solid #fff; box-shadow: 0 0 0 2px rgba(0,0,0,.20) inset, 0 0 18px rgba(255,255,255,.10);
  animation: swatchWave 8s ease-in-out infinite;
}
.dark .swatch-btn.is-active{ outline-color:#000; box-shadow: 0 0 0 2px rgba(255,255,255,.28) inset, 0 0 18px rgba(255,255,255,.06); }

/* ---------- Fondo global animado ---------- */
#fx-ambient{
  position: fixed; inset: 0; z-index: -1; pointer-events:none;
  background:
    radial-gradient(45% 55% at 18% 22%, var(--fx1, #00e1ff) 0%, transparent 62%),
    radial-gradient(55% 60% at 82% 28%, var(--fx2, #a78bfa) 0%, transparent 66%),
    radial-gradient(60% 70% at 48% 82%, var(--fx3, #22c55e) 0%, transparent 66%),
    linear-gradient(180deg, rgba(255,255,255,.02), rgba(0,0,0,.20));
  background-repeat: no-repeat;
  filter: saturate(1.05) brightness(1);
  will-change: transform, background-position, filter;
  animation: fxFloat 26s ease-in-out infinite alternate;
}
:root:not(.dark) #fx-ambient{ filter: saturate(1.02) brightness(1.02); }
.dark #fx-ambient{ filter: saturate(1.05) brightness(.98); }

/* ---------- Keyframes ---------- */
@keyframes paletteShift{
  0%{ background-position: 0% 50%; }
  50%{ background-position: 100% 50%; }
  100%{ background-position: 0% 50%; }
}
@keyframes swatchWave{
  0%{ background-position: 0% 50%; }
  50%{ background-position: 100% 50%; }
  100%{ background-position: 0% 50%; }
}
@keyframes fxFloat{
  0%{
    background-position:
      0% 0%,
      100% 30%,
      0% 100%,
      0% 0%;
    transform: scale(1.015) translate3d(0,0,0);
  }
  50%{
    background-position:
      50% 80%,
      0% 20%,
      100% 10%,
      0% 0%;
    transform: scale(1.02) translate3d(0,0,0);
  }
  100%{
    background-position:
      100% 10%,
      40% 50%,
      10% 90%,
      0% 0%;
    transform: scale(1.015) translate3d(0,0,0);
  }
}

/* Respeta accesibilidad */
@media (prefers-reduced-motion: reduce){
  .btn-palette, .swatch-btn, #fx-ambient{ animation: none !important; }
}
`;

/* =========================
   Util: asegurar capa de fondo
========================= */
function ensureAmbientLayer() {
  if (typeof document === "undefined") return;
  let el = document.getElementById("fx-ambient");
  if (!el) {
    el = document.createElement("div");
    el.id = "fx-ambient";
    // Colócalo al principio del body para que siempre quede detrás
    document.body.prepend(el);
  }
}

/* =========================
   Componente
========================= */
export default function ThemeFxPicker({ palettes = PALETTES, onChange }) {
  const [open, setOpen] = React.useState(false);
  const [fx, setFx] = React.useState("neon");
  const ref = React.useRef(null);

  const applyFx = React.useCallback((next) => {
    if (typeof document === "undefined") return;
    const root = document.documentElement;
    const [c1, c2, c3] = PAL_MAP[next] || PAL_MAP.neon;

    root.setAttribute("data-fx", next);
    root.style.setProperty("--fx1", c1);
    root.style.setProperty("--fx2", c2);
    root.style.setProperty("--fx3", c3);
    root.style.setProperty("--accent", c2);

    localStorage.setItem("fx", next);
    onChange?.(next, [c1, c2, c3]);
  }, [onChange]);

  React.useEffect(() => {
    ensureAmbientLayer();
    const saved = (typeof localStorage !== "undefined" && localStorage.getItem("fx")) || "neon";
    setFx(saved);
    applyFx(saved);
  }, [applyFx]);

  // cerrar al hacer click afuera / ESC
  React.useEffect(() => {
    const click = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false); };
    const esc   = (e) => { if (e.key === "Escape") setOpen(false); };
    if (open) { document.addEventListener("mousedown", click); document.addEventListener("keydown", esc); }
    return () => { document.removeEventListener("mousedown", click); document.removeEventListener("keydown", esc); };
  }, [open]);

  function choose(key) {
    setFx(key);
    applyFx(key);
    setOpen(false);
  }

  return (
    <div ref={ref} className="relative">
      <style>{THEME_PICKER_CSS}</style>

      {/* Botón Paleta (discreto) */}
      <button
        type="button"
        onClick={() => setOpen(v => !v)}
        className="btn-palette inline-flex items-center gap-2 px-4 py-2 rounded-2xl ring-1 ring-white/10"
        aria-haspopup="menu"
        aria-expanded={open}
        title="Cambiar paleta de colores"
      >
        <PaletteIcon />
        <span className="font-medium">Paleta</span>
        <span className="sheen" />
      </button>

      {/* Panel tipo Exportadores */}
      {open && (
        <div
          role="menu"
          className="absolute right-0 mt-2 w-72 rounded-xl dropdown-panel bg-white/90 dark:bg-neutral-950/85 shadow-2xl p-3 z-50"
        >
          {/* Swatches compactos */}
          <div className="grid grid-cols-8 gap-2">
            {palettes.map(({ key, colors }) => {
              const gradient = `linear-gradient(135deg, ${colors[0]}, ${colors[1]} 60%, ${colors[2]})`;
              const active = fx === key;
              return (
                <button
                  key={key}
                  className={`swatch-btn ${active ? "is-active" : ""}`}
                  style={{ background: gradient }}
                  aria-label={key}
                  aria-pressed={active}
                  onClick={() => choose(key)}
                />
              );
            })}
          </div>

          {/* Nombres (opcional) */}
          <div className="mt-3 grid grid-cols-2 gap-1">
            {palettes.map(p => (
              <button
                key={`label-${p.key}`}
                className="w-full text-left px-2 py-1.5 rounded-md hover:bg-black/5 dark:hover:bg-white/10 flex items-center gap-2"
                onClick={() => choose(p.key)}
              >
                <span className="inline-block w-3.5 h-3.5 rounded-full"
                      style={{ background: `linear-gradient(135deg, ${p.colors[0]}, ${p.colors[1]} 60%, ${p.colors[2]})` }} />
                <span className="text-sm">{p.name}</span>
                {fx === p.key && <span className="ml-auto text-xs opacity-70">Actual</span>}
              </button>
            ))}
          </div>

          <div className="flex items-center justify-between mt-3 pt-2 border-t border-neutral-200/60 dark:border-neutral-800/60">
            <button
              className="px-2 py-1 text-xs rounded-md border border-neutral-300/60 dark:border-neutral-700/60"
              onClick={() => choose("neon")}
            >
              Predeterminado
            </button>
            <button
              className="px-2 py-1 text-xs rounded-md border border-transparent hover:border-neutral-300/60 dark:hover:border-neutral-700/60"
              onClick={() => setOpen(false)}
            >
              Cerrar
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
// Componente ThemeFxPicker: selector de paleta de colores y fondo animado