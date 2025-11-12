// client/src/components/Sidebar.jsx
import React from "react";
import { NavLink, useLocation, useNavigate } from "react-router-dom";
import {
  Home,
  DoorOpen,
  KeyRound,
  Footprints,
  Route,
  AlertTriangle,
  UsersRound,
  Users,
  NotebookPen,
  ClipboardList,
  ClipboardCheck,
  Award,
  LogIn,
  LogOut,
  ShieldCheck,
} from "lucide-react";
import { useAuth0 } from "@auth0/auth0-react";

/* Íconos alineados con “Secciones” (+ fallbacks) */
const IconDoor = DoorOpen || KeyRound;
const IconFootprints = Footprints || Route;
const IconVisitors = UsersRound || Users;
const IconEval = ClipboardCheck || Award;
const IconIAM = ShieldCheck || Users;

const NAV_ITEMS = [
  { to: "/", label: "Panel principal", Icon: Home, emphasizeDark: true },
  { to: "/accesos", label: "Control de Acceso", Icon: IconDoor },
  { to: "/rondasqr", label: "Rondas de Vigilancia", Icon: IconFootprints },
  { to: "/incidentes", label: "Gestión de Incidentes", Icon: AlertTriangle },
  { to: "/visitas", label: "Control de Visitas", Icon: IconVisitors },
  { to: "/bitacora", label: "Bitácora Digital", Icon: NotebookPen },
  { to: "/supervision", label: "Supervisión", Icon: ClipboardList },
  { to: "/evaluacion", label: "Evaluación", Icon: IconEval },
  { to: "/iam/admin", label: "Usuarios y Permisos", Icon: IconIAM },
];

function NavItem({ to, label, Icon, onClick, emphasizeDark = false }) {
  return (
    <NavLink
      to={to}
      onClick={onClick}
      className={({ isActive }) =>
        [
          "group relative block rounded-xl transition-colors",
          "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[--ring]",
          !isActive
            ? "hover:bg-white/60 hover:ring-1 hover:ring-neutral-400/40"
            : "bg-white/70 ring-1 ring-neutral-300/70",
          "dark:hover:bg-white/10",
          emphasizeDark && "dark:bg-white/10 dark:ring-1 dark:ring-white/15",
          isActive && "dark:bg-white/14 dark:ring-white/20",
        ].join(" ")
      }
    >
      <div className="flex items-center gap-3 px-4 py-3">
        <Icon
          className="w-6 h-6 shrink-0 text-neutral-800 dark:text-white"
          strokeWidth={2}
        />
        <span className="text-[17px] leading-none text-neutral-900 dark:text-white">
          {label}
        </span>
      </div>
    </NavLink>
  );
}

export default function Sidebar({ onNavigate }) {
  const { isAuthenticated, isLoading, loginWithRedirect, logout } = useAuth0();
  const audience = import.meta.env.VITE_AUTH0_AUDIENCE; // opcional, solo si creaste la API
  const nav = useNavigate();
  const loc = useLocation();

  // Botón "Acceso": si no logueado → Auth0; si logueado → ir a /accesos
  const handleAccessClick = async () => {
    onNavigate?.();
    if (isLoading) return;

    try {
      if (!isAuthenticated) {
        const opts = {
          appState: { returnTo: loc.pathname + loc.search },
          // TIP: no forces redirect_uri aquí; deja que lo provea tu Auth0Provider
          scope: "openid profile email offline_access",
        };
        if (audience) {
          opts.authorizationParams = { audience };
        }
        await loginWithRedirect(opts);
      } else {
        nav("/accesos");
      }
    } catch (err) {
      // Útil si Auth0 rechaza por URLs no permitidas
      // eslint-disable-next-line no-console
      console.error("Error al iniciar sesión:", err);
    }
  };

  // Botón "Salir": cerrar sesión y volver al home
  /* const handleLogoutClick = () => {
    onNavigate?.();
    try {
      logout();
    } catch (err) {
      // eslint-disable-next-line no-console
      console.error("Error al cerrar sesión:", err);
    }
  }; */

  return (
    <div
      className={[
        "w-full h-full flex flex-col overflow-y-auto overscroll-contain",
        "border-r border-white/10 p-4 sidebar-aurora",
      ].join(" ")}
      aria-label="Barra lateral"
    >
      <div className="text-2xl font-extrabold mb-6 tracking-tight">SENAF</div>

      <nav className="flex flex-col gap-1 text-[15px]">
        {NAV_ITEMS.map(({ to, label, Icon, emphasizeDark }) => (
          <NavItem
            key={to}
            to={to}
            label={label}
            Icon={Icon}
            onClick={onNavigate}
            emphasizeDark={emphasizeDark}
          />
        ))}
      </nav>

      {/* Acciones al fondo */}
      <div className="mt-auto pt-6">
        <div className="border-t border-white/10 mb-3" />

        {/* Acceso */}
        <button
          type="button"
          onClick={handleAccessClick}
          title={isAuthenticated ? "Ir a Control de Acceso" : "Iniciar sesión"}
          disabled={isLoading}
          className={[
            "group w-full flex items-center gap-3 px-4 py-3 rounded-xl text-left",
            "bg-white/70 border border-neutral-300/70 text-neutral-900 hover:bg-white/80 hover:ring-1 hover:ring-neutral-400/40",
            "dark:bg-white/5 dark:border-white/15 dark:text-white dark:hover:bg-white/10",
            isLoading && "opacity-60 cursor-not-allowed",
          ].join(" ")}
        >
          <LogIn
            className="w-5 h-5 text-neutral-900 dark:text-white"
            strokeWidth={2.5}
          />
          <span className="font-medium">
            {isAuthenticated ? "Acceso (ir a módulo)" : "Acceso (login)"}
          </span>
        </button>

        {/* Salir (sólo si autenticado) */}
        {isAuthenticated && (
          <>
            <div className="h-2" />
            <button
              type="button"
              onClick={() =>
                logout({
                  logoutParams: {
                    returnTo: `${window.location.origin}/login`,
                    federated: true,
                  },
                })
              }
              title="Cerrar sesión"
              className={[
                "group w-full flex items-center gap-3 px-4 py-3 rounded-xl text-left",
                "bg-white/70 border border-neutral-300/70 text-neutral-900 hover:bg-white/80 hover:ring-1 hover:ring-neutral-400/40",
                "dark:bg-white/5 dark:border-white/15 dark:text-white dark:hover:bg-white/10",
              ].join(" ")}
            >
              <LogOut
                className="w-5 h-5 text-neutral-900 dark:text-white"
                strokeWidth={2.5}
              />
              <span className="font-medium">Salir</span>
            </button>
          </>
        )}
      </div>
    </div>
  );
}
