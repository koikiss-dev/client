// components/Topbar.jsx
import React from "react";
import { useAuth0 } from "@auth0/auth0-react";
import { useLocation, useNavigate, Link } from "react-router-dom";
import ThemeToggle from "./ThemeToggle.jsx";
import ThemeFxPicker from "./ThemeFxPicker.jsx";
import {
  Menu, LogOut, Search, Bell, Plus, X, ArrowLeft,
  DoorOpen, KeyRound, Footprints, Route,
  AlertTriangle, UsersRound, Users, NotebookPen,
  ClipboardList, ClipboardCheck, Award, BarChart3,
  ShieldCheck,
} from "lucide-react";

// === Socket para eventos en vivo ===
import { io } from "socket.io-client";

// === API de notificaciones (stub seguro) ===
import NotificationsAPI from "../lib/notificationsApi.js";

// Raíz del backend (sin /api) para sockets
const API_ROOT = (import.meta.env.VITE_API_BASE_URL || "http://localhost:4000").replace(/\/$/, "");
const SOCKET_URL = API_ROOT;

const PATH_LABELS = {
  "/": "Panel principal",
  "/accesos": "Control de Acceso",
  "/rondas": "Rondas de Vigilancia",
  "/incidentes": "Gestión de Incidentes",
  "/visitas": "Control de Visitas",
  "/bitacora": "Bitácora Digital",
  "/supervision": "Supervisión",
  "/evaluacion": "Evaluación",
  "/iam": "Usuarios y Permisos",
  "/iam/admin": "Usuarios y Permisos",
};

// Íconos alineados con “Secciones”
const IconDoor       = DoorOpen || KeyRound;
const IconFootprints = Footprints || Route;
const IconVisitors   = UsersRound || Users;
const IconEval       = ClipboardCheck || Award;
const IconIAM        = ShieldCheck || Users;

const MODULES = [
  { to: "/accesos",     label: "Control de Acceso",     Icon: IconDoor },
  { to: "/rondas",      label: "Rondas de Vigilancia",  Icon: IconFootprints },
  { to: "/incidentes",  label: "Gestión de Incidentes", Icon: AlertTriangle },
  { to: "/visitas",     label: "Control de Visitas",    Icon: IconVisitors },
  { to: "/bitacora",    label: "Bitácora Digital",      Icon: NotebookPen },
  { to: "/supervision", label: "Supervisión",           Icon: ClipboardList },
  { to: "/evaluacion",  label: "Evaluación",            Icon: IconEval },
  // 👇 NUEVO: aparece en el menú rápido del topbar
  { to: "/iam/admin",   label: "Usuarios y Permisos",   Icon: IconIAM },
];

// ---------- Breadcrumbs ----------
function Breadcrumbs() {
  const { pathname } = useLocation();
  const parts = pathname.split("/").filter(Boolean);
  const crumbs = ["/", ...parts.map((_, i) => `/${parts.slice(0, i + 1).join("/")}`)];

  return (
    <nav aria-label="Breadcrumb" className="hidden lg:flex items-center gap-2 text-sm">
      {crumbs.map((p, i) => {
        const label = PATH_LABELS[p] ?? p.replaceAll("/", "");
        const last = i === crumbs.length - 1;
        return (
          <span key={p} className="flex items-center gap-2">
            {i > 0 && <span className="opacity-40">›</span>}
            {last ? (
              <span className="font-medium opacity-80">{label}</span>
            ) : (
              <Link to={p} className="opacity-70 hover:opacity-100 hover:underline">
                {label}
              </Link>
            )}
          </span>
        );
      })}
    </nav>
  );
}

// --- utilidades popover fixed (para móvil sin cortes) ---
function clampMenuX(left, menuWidth, gap = 8) {
  const vw = Math.max(document.documentElement.clientWidth, window.innerWidth || 0);
  const min = gap;
  const max = vw - menuWidth - gap;
  return Math.min(max, Math.max(min, left));
}
function useDismissOnOutside(open, refs, onClose) {
  React.useEffect(() => {
    if (!open) return;
    function handler(e) {
      const inside = refs.some(r => r.current && r.current.contains(e.target));
      if (!inside) onClose();
    }
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [open, refs, onClose]);
}

export default function Topbar({ onToggleMenu, showBack = false }) {
  const { user, logout } = useAuth0();
  const nav = useNavigate();
  const { pathname } = useLocation();

  // -------- búsqueda --------
  const [q, setQ] = React.useState("");
  const [searchOpen, setSearchOpen] = React.useState(false);
  React.useEffect(() => {
    function onKey(e) {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setSearchOpen(v => !v);
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);
  function runSearch() {
    const base =
      pathname.startsWith("/visitas") ? "/visitas" :
      pathname.startsWith("/supervision") ? "/supervision" :
      pathname.startsWith("/bitacora") ? "/bitacora" :
      "/incidentes";
    if (q.trim()) nav(`${base}?q=${encodeURIComponent(q.trim())}`); else nav(base);
    setSearchOpen(false);
  }
  function goBack() { if (window.history.length > 2) nav(-1); else nav("/"); }

  // -------- menú + (fixed responsive) --------
  const quickBtnRef = React.useRef(null);
  const quickMenuRef = React.useRef(null);
  const [quickOpen, setQuickOpen] = React.useState(false);
  const [quickPos, setQuickPos] = React.useState({ left: 0, top: 0 });

  const toggleQuick = () => {
    setQuickOpen(next => {
      const willOpen = !next;
      if (willOpen && quickBtnRef.current) {
        const r = quickBtnRef.current.getBoundingClientRect();
        const menuW = 320; // w-80
        const gap = 8;
        setQuickPos({ left: clampMenuX(r.left, menuW, gap), top: r.bottom + gap });
      }
      return willOpen;
    });
  };
  React.useEffect(() => {
    if (!quickOpen) return;
    const recalc = () => {
      if (!quickBtnRef.current) return;
      const r = quickBtnRef.current.getBoundingClientRect();
      const menuW = 320; const gap = 8;
      setQuickPos({ left: clampMenuX(r.left, menuW, gap), top: r.bottom + gap });
    };
    window.addEventListener("resize", recalc);
    window.addEventListener("scroll", recalc, true);
    return () => {
      window.removeEventListener("resize", recalc);
      window.removeEventListener("scroll", recalc, true);
    };
  }, [quickOpen]);
  useDismissOnOutside(quickOpen, [quickBtnRef, quickMenuRef], () => setQuickOpen(false));

  // -------- campana (fixed + notificaciones) --------
  const bellBtnRef = React.useRef(null);
  const bellMenuRef = React.useRef(null);
  const [bellOpen, setBellOpen] = React.useState(false);
  const [bellPos, setBellPos] = React.useState({ left: 0, top: 0 });

  // Conteos de notificaciones
  const [counts, setCounts] = React.useState({ unread: 0, alerts: 0, total: 0 });
  const hasNew = (counts?.unread || 0) > 0 || (counts?.alerts || 0) > 0;

  const fetchCounts = React.useCallback(async () => {
    try {
      const n = await NotificationsAPI.getCount();
      setCounts({ unread: Number(n || 0), alerts: 0, total: Number(n || 0) });
    } catch {}
  }, []);

  const clearCounts = React.useCallback(async () => {
    try {
      await NotificationsAPI.markAllRead();
      await fetchCounts();
    } catch {}
  }, [fetchCounts]);

  React.useEffect(() => {
    fetchCounts();
    const s = io(SOCKET_URL, { transports: ["websocket"], withCredentials: true });
    const update = () => fetchCounts();

    s.on("notifications:count-updated", update);
    s.on("email:new", update);
    s.on("message:new", update);
    s.on("appointment:new", update);

    return () => {
      s.off("notifications:count-updated", update);
      s.off("email:new", update);
      s.off("message:new", update);
      s.off("appointment:new", update);
      s.disconnect();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="flex items-center gap-3 px-4 md:px-6 h-14">
      {/* Hamburguesa móvil */}
      <button
        type="button"
        onClick={onToggleMenu}
        className="md:hidden inline-flex items-center justify-center p-2 rounded-lg border border-neutral-300 dark:border-neutral-700 hover:bg-neutral-100 dark:hover:bg-neutral-800"
        aria-label="Abrir menú"
      >
        <Menu className="w-5 h-5" />
      </button>

      {/* Regresar (opcional) */}
      {showBack && (
        <button
          type="button"
          onClick={goBack}
          className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg border border-neutral-300 dark:border-neutral-700 hover:bg-neutral-100 dark:hover:bg-neutral-800"
          title="Regresar"
        >
          <ArrowLeft className="w-4 h-4" />
          <span className="hidden sm:inline">Regresar</span>
        </button>
      )}

      {/* Migas */}
      <Breadcrumbs />
      <div className="flex-1" />

      {/* Búsqueda rápida */}
      <div className="hidden md:flex items-center gap-2">
        <div className="relative">
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && runSearch()}
            placeholder="Buscar… (Ctrl/⌘+K)"
            className="w-64 px-9 py-2 rounded-xl border border-neutral-300 dark:border-neutral-700 bg-white/80 dark:bg-neutral-900/60 placeholder:opacity-60 focus:outline-none"
          />
          <Search className="w-4 h-4 opacity-60 absolute left-3 top-1/2 -translate-y-1/2" />
          {q && (
            <button
              className="absolute right-2 top-1/2 -translate-y-1/2 p-1 rounded hover:bg-neutral-200/60 dark:hover:bg-neutral-800/60"
              onClick={() => setQ("")}
              aria-label="Limpiar"
            >
              <X className="w-4 h-4 opacity-60" />
            </button>
          )}
        </div>
      </div>

      {/* Botón + */}
      <TopbarQuickMenu nav={nav} />

      {/* Botón campana */}
      <div ref={bellBtnRef} className="relative">
        <button
          onClick={() => setBellOpen(v => !v)}
          className="relative inline-flex items-center justify-center p-2 rounded-lg border border-neutral-300 dark:border-neutral-700 hover:bg-neutral-100 dark:hover:bg-neutral-800"
          aria-label="Notificaciones"
          aria-haspopup="menu"
          aria-expanded={bellOpen}
        >
          <Bell className={"w-5 h-5 " + (hasNew ? "text-rose-500" : "")} />
          {hasNew && (
            <span className="absolute -top-0.5 -right-0.5 min-w-[18px] h-[18px] px-1 rounded-full bg-rose-600 text-white text-[10px] leading-[18px] text-center ring-2 ring-white dark:ring-neutral-950">
              {Math.min((counts.unread || 0) + (counts.alerts || 0), 99)}
            </span>
          )}
        </button>

        {/* Panel de notificaciones */}
        {bellOpen && (
          <BellMenu
            anchorRef={bellBtnRef}
            counts={counts}
            onClear={() => { clearCounts(); setBellOpen(false); }}
            onClose={() => setBellOpen(false)}
            setPosFn={setBellPos}
            pos={bellPos}
          />
        )}
      </div>

      {/* === Paleta + Tema SIEMPRE visibles, conservando funcionalidad === */}
      {/* MÓVIL: versión compacta visible en xs (misma lógica) */}
      <div className="sm:hidden flex items-center gap-2 shrink-0">
        <div className="shrink-0">
          <ThemeFxPicker />
        </div>
        <div className="shrink-0">
          <ThemeToggle />
        </div>
      </div>

      {/* ESCRITORIO (sm+): versión normal + usuario/salir */}
      <div className="hidden sm:flex items-center gap-2 shrink-0">
        <div className="shrink-0">
          <ThemeFxPicker />
        </div>
        <div className="shrink-0">
          <ThemeToggle />
        </div>

        {/* Usuario + logout */}
        <span className="hidden sm:block text-sm opacity-80">{user?.name}</span>
        <button
          onClick={() =>
            logout({
              logoutParams: { returnTo: `${window.location.origin}/login`, federated: true },
            })
          }
          className="btn-outline-neon inline-flex items-center gap-1"
          title="Salir"
        >
          <LogOut className="w-4 h-4" />
          <span className="hidden sm:inline">Salir</span>
        </button>
      </div>

      {/* Modal búsqueda */}
      {searchOpen && (
        <div
          className="fixed inset-0 z-[60] grid place-items-start pt-24 bg-black/40"
          onClick={() => setSearchOpen(false)}
        >
          <div
            className="w-[min(680px,92vw)] mx-auto rounded-2xl border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-950 shadow-2xl p-4"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="text-sm mb-2 opacity-70">Búsqueda global</div>
            <div className="relative">
              <input
                autoFocus
                value={q}
                onChange={(e) => setQ(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") runSearch();
                  if (e.key === "Escape") setSearchOpen(false);
                }}
                placeholder="Escribe y presiona Enter…"
                className="w-full px-10 py-3 rounded-xl border border-neutral-300 dark:border-neutral-700 bg-white/80 dark:bg-neutral-900/60 focus:outline-none"
              />
              <Search className="w-4 h-4 opacity-60 absolute left-3 top-1/2 -translate-y-1/2" />
              {q && (
                <button
                  className="absolute right-2 top-1/2 -translate-y-1/2 p-1 rounded hover:bg-neutral-200/60 dark:hover:bg-neutral-800/60"
                  onClick={() => setQ("")}
                  aria-label="Limpiar"
                >
                  <X className="w-4 h-4 opacity-60" />
                </button>
              )}
            </div>
            <div className="text-xs opacity-60 mt-2">
              Enter para buscar en el módulo actual · Esc para cerrar
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

/* ---------- Subcomponentes pequeños para limpiar el JSX principal ---------- */

function TopbarQuickMenu({ nav }) {
  const btnRef = React.useRef(null);
  const menuRef = React.useRef(null);
  const [open, setOpen] = React.useState(false);
  const [pos, setPos] = React.useState({ left: 0, top: 0 });

  const toggle = () => {
    setOpen(next => {
      const willOpen = !next;
      if (willOpen && btnRef.current) {
        const r = btnRef.current.getBoundingClientRect();
        const menuW = 320, gap = 8;
        setPos({ left: clampMenuX(r.left, menuW, gap), top: r.bottom + gap });
      }
      return willOpen;
    });
  };

  React.useEffect(() => {
    if (!open) return;
    const recalc = () => {
      if (!btnRef.current) return;
      const r = btnRef.current.getBoundingClientRect();
      const menuW = 320, gap = 8;
      setPos({ left: clampMenuX(r.left, menuW, gap), top: r.bottom + gap });
    };
    window.addEventListener("resize", recalc);
    window.addEventListener("scroll", recalc, true);
    return () => {
      window.removeEventListener("resize", recalc);
      window.removeEventListener("scroll", recalc, true);
    };
  }, [open]);

  useDismissOnOutside(open, [btnRef, menuRef], () => setOpen(false));

  return (
    <>
      <div ref={btnRef}>
        <button
          onClick={toggle}
          className="inline-flex items-center justify-center p-2 rounded-lg border border-neutral-300 dark:border-neutral-700 hover:bg-neutral-100 dark:hover:bg-neutral-800"
          title="Abrir módulo"
          aria-haspopup="menu"
          aria-expanded={open}
        >
          <Plus className="w-5 h-5" />
        </button>
      </div>

      {open && (
        <div
          ref={menuRef}
          className="fixed z-[70] w-80 rounded-xl border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-950 shadow-xl p-1"
          style={{ left: `${pos.left}px`, top: `${pos.top}px` }}
          role="menu"
        >
          <div className="px-3 py-2 text-xs font-semibold opacity-70">Abrir módulo</div>
          {MODULES.map(({ to, label, Icon }) => (
            <button
              key={to}
              onClick={() => { setOpen(false); nav(to); }}
              className="w-full flex items-center gap-2 px-3 py-2 rounded-lg hover:bg-neutral-100 dark:hover:bg-neutral-800 text-left"
              role="menuitem"
            >
              <Icon className="w-4 h-4 opacity-80" />
              <span>{label}</span>
            </button>
          ))}
        </div>
      )}
    </>
  );
}

function BellMenu({ anchorRef, counts, onClear, onClose, setPosFn, pos }) {
  React.useEffect(() => {
    if (!anchorRef.current) return;
    const r = anchorRef.current.getBoundingClientRect();
    const menuW = 320, gap = 8;
    setPosFn({ left: clampMenuX(r.left, menuW, gap), top: r.bottom + gap });
  }, [anchorRef, setPosFn]);

  return (
    <div
      className="fixed z-[70] w-80 rounded-xl border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-950 shadow-xl p-2"
      style={{ left: `${pos.left}px`, top: `${pos.top}px` }}
      role="menu"
    >
      <div className="px-2 py-1 text-sm opacity-70">Notificaciones</div>

      <div className="p-2 text-sm space-y-1">
        <div className="flex items-center justify-between">
          <span className="opacity-80">Sin leer</span>
          <span className="text-xs px-2 py-0.5 rounded bg-neutral-100 dark:bg-neutral-800">
            {counts.unread || 0}
          </span>
        </div>
        <div className="flex items-center justify-between">
          <span className="opacity-80">Alertas</span>
          <span className="text-xs px-2 py-0.5 rounded bg-neutral-100 dark:bg-neutral-800">
            {counts.alerts || 0}
          </span>
        </div>
        <div className="flex items-center justify-between">
          <span className="opacity-80">Total</span>
          <span className="text-xs px-2 py-0.5 rounded bg-neutral-100 dark:bg-neutral-800">
            {counts.total || 0}
          </span>
        </div>
      </div>

      <div className="p-2 pt-1 flex gap-2">
        <button
          onClick={onClear}
          className="flex-1 px-3 py-2 rounded-lg bg-rose-600 text-white hover:bg-rose-700"
        >
          Marcar todo como leído
        </button>
        <button
          onClick={onClose}
          className="px-3 py-2 rounded-lg border dark:border-neutral-700"
        >
          Cerrar
        </button>
      </div>
    </div>
  );
}
