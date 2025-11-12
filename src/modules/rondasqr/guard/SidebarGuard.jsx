// client/src/modules/rondasqr/pages/SidebarGuard.jsx
import React from "react";
import { NavLink, useNavigate } from "react-router-dom";
import {
  Home,
  AlertTriangle,
  QrCode,
  MessageSquare,
  Send,
  Database,
  Settings,
  LogOut,
  FileBarChart,
} from "lucide-react";
import { rondasqrApi } from "../api/rondasqrApi.js";
import { emitLocalPanic } from "../utils/panicBus.js";

export default function SidebarGuard({
  variant = "desktop",
  collapsed = false,
  onCloseMobile,
  onSendAlert,
  onDumpDb,
}) {
  const navigate = useNavigate();

  const itemBase =
    "group relative block rounded-xl transition-colors focus-visible:outline-none " +
    "focus-visible:ring-2 focus-visible:ring-indigo-400 dark:focus-visible:ring-cyan-400";
  const itemHover = "hover:bg-slate-900/5 dark:hover:bg-white/10";
  const itemActive =
    "bg-slate-900/10 dark:bg-white/15 ring-1 ring-slate-900/10 dark:ring-white/20";

  const navItems = [
    { key: "home", label: "Hogar", icon: Home, to: "/rondasqr/scan", end: true },
    { key: "scan", label: "Registrador Punto Control", icon: QrCode, to: "/rondasqr/scan/qr" },
    { key: "reports", label: "Informes", icon: FileBarChart, to: "/rondasqr/reports" },
    { key: "admin", label: "Administración de Rondas", icon: Settings, to: "/rondasqr/admin" },
  ];

  const actionItems = [
    { key: "alert", label: "Enviar Alerta", icon: AlertTriangle },
    { key: "msg", label: "Mensaje Incidente", icon: MessageSquare },
    { key: "tx", label: "Transmitir Rondas Pendientes", icon: Send },
    { key: "dumpdb", label: "Enviar base de datos", icon: Database },
  ];

  async function handleAction(key) {
    try {
      switch (key) {
        case "alert": {
          if (typeof onSendAlert === "function") {
            await onSendAlert();
            break;
          }

          let gps;
          if (typeof navigator !== "undefined" && "geolocation" in navigator) {
            await new Promise((resolve) => {
              navigator.geolocation.getCurrentPosition(
                (pos) => {
                  gps = { lat: pos.coords.latitude, lon: pos.coords.longitude };
                  resolve();
                },
                () => resolve(),
                { enableHighAccuracy: true, timeout: 5000 }
              );
            });
          }
          await rondasqrApi.panic(gps || null);
          emitLocalPanic({ source: "sidebar" });
          window.alert("🚨 Alerta de pánico enviada.");
          navigate("/rondasqr/scan");
          break;
        }

        case "msg":
          // aquí lo metemos al formulario global PERO en modo rondas
          navigate("/incidentes/nuevo?from=ronda");
          break;

        case "tx":
          navigate("/rondasqr/scan/outbox");
          break;

        case "dumpdb": {
          if (typeof onDumpDb === "function") {
            await onDumpDb();
            break;
          }

          const apiBase = import.meta.env.VITE_API_BASE_URL || "http://localhost:4000";
          const payload = {
            at: new Date().toISOString(),
            device: {
              ua: typeof navigator !== "undefined" ? navigator.userAgent : "",
              online: typeof navigator !== "undefined" ? navigator.onLine : false,
            },
          };

          let resp;
          try {
            resp = await fetch(`${apiBase}/api/rondasqr/v1/offline/dump`, {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              credentials: "include",
              body: JSON.stringify(payload),
            });
          } catch (errFetch) {
            window.alert("No se pudo enviar la base de datos (fetch): " + errFetch.message);
            break;
          }

          let data = null;
          try {
            data = await resp.json();
          } catch {}

          if (resp.ok && data && data.ok) {
            window.alert(
              "📤 Base enviada.\n" +
                `marks: ${data.saved?.marks ?? 0}, incidents: ${data.saved?.incidents ?? 0}, device: ${data.saved?.device ?? 0}` +
                (Array.isArray(data.errors) && data.errors.length
                  ? `\ncon errores: ${data.errors.length}`
                  : "")
            );
          } else {
            window.alert(
              "No se pudo enviar la base de datos.\n" +
                `HTTP ${resp.status} ${resp.statusText}\n` +
                (data ? "Respuesta: " + JSON.stringify(data) : "")
            );
          }
          break;
        }

        case "logout":
          navigate("/login");
          break;

        default:
          break;
      }

      if (variant === "mobile" && onCloseMobile) onCloseMobile();
    } catch (err) {
      console.error("[SidebarGuard] error en acción", err);
      window.alert("Ocurrió un error: " + err.message);
    }
  }

  const widthClass = variant === "mobile" ? "w-72" : collapsed ? "w-16" : "w-64";

  const containerBase =
    variant === "mobile"
      ? "fixed inset-y-0 left-0 z-50 p-4 border-r overflow-y-auto overscroll-contain " +
        "bg-slate-50 border-slate-200 text-slate-800 backdrop-blur md:hidden " +
        "dark:bg-gradient-to-b dark:from-[#2a0f3a]/90 dark:via-[#1b0e2b]/90 dark:to-[#062a22]/90 " +
        "dark:border-white/10 dark:text-white"
      : "hidden md:flex p-4 border-r overflow-y-auto overscroll-contain " +
        "bg-slate-50/80 border-slate-200 text-slate-800 backdrop-blur " +
        "dark:bg-transparent dark:border-white/10 dark:text-white";

  const labelClass = collapsed ? "hidden" : "block";
  const itemPadding = collapsed ? "px-3 py-3" : "px-4 py-3";

  return (
    <aside
      className={`${containerBase} ${widthClass} flex-col`}
      aria-label="Navegación del módulo de rondas"
    >
      <div className={`${collapsed ? "text-center" : ""} mb-5`}>
        <div
          className={`font-extrabold tracking-tight ${
            collapsed ? "text-base" : "text-2xl"
          } text-slate-900 dark:text-white`}
        >
          SENAF
        </div>
        {!collapsed && (
          <div className="text-xs text-slate-500 dark:text-white/80 -mt-1">
            Rondas de Vigilancia
          </div>
        )}
      </div>

      <nav className="flex-1 flex flex-col gap-1">
        {navItems.map((it) => {
          const Icon = it.icon;
          return (
            <NavLink
              key={it.key}
              to={it.to}
              end={it.end}
              onClick={variant === "mobile" ? onCloseMobile : undefined}
              className={({ isActive }) => [itemBase, isActive ? itemActive : itemHover].join(" ")}
            >
              <div className={`flex items-center gap-3 ${itemPadding}`}>
                <Icon size={18} aria-hidden />
                <span className={`text-[15px] leading-none ${labelClass}`}>{it.label}</span>
              </div>
            </NavLink>
          );
        })}

        {actionItems.map((it) => {
          const Icon = it.icon;
          return (
            <button
              key={it.key}
              type="button"
              onClick={() => handleAction(it.key)}
              className={[itemBase, itemHover, "text-left"].join(" ")}
            >
              <div className={`flex items-center gap-3 ${itemPadding}`}>
                <Icon size={18} aria-hidden />
                <span className={`text-[15px] leading-none ${labelClass}`}>{it.label}</span>
              </div>
            </button>
          );
        })}

        <div className="mt-auto pt-3 border-t border-white/10">
          <button
            type="button"
            onClick={() => handleAction("logout")}
            className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-left 
                       bg-red-600/10 hover:bg-red-600/20 text-red-500 font-medium
                       transition-colors duration-150"
          >
            <LogOut size={18} aria-hidden />
            <span className={`text-[15px] leading-none ${labelClass}`}>Aplicación Salir</span>
          </button>
        </div>
      </nav>
    </aside>
  );
}
