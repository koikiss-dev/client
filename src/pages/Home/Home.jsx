import React from "react";
import { useNavigate } from "react-router-dom";
import { useAuth0 } from "@auth0/auth0-react";
import { io } from "socket.io-client";
import { NAV_SECTIONS } from "../../config/navConfig.js";
import api, { setAuthToken } from "../../lib/api.js";
import IamGuard from "../../iam/api/IamGuard.jsx";

import {
  DoorOpen,
  Footprints,
  AlertTriangle,
  Users,
  NotebookPen,
  ClipboardList,
  ShieldCheck, // 👈 icono para IAM
} from "lucide-react";

/* ===========================
   Normaliza API y SOCKET_URL
   =========================== */
const RAW_API =
  import.meta.env.VITE_API_BASE_URL ?? "http://localhost:4000/api";
const API_BASE =
  typeof RAW_API === "string" && RAW_API.trim()
    ? RAW_API.trim()
    : "http://localhost:4000/api";
const API_NORM = /\/api\/?$/.test(API_BASE)
  ? API_BASE
  : API_BASE.replace(/\/+$/, "") + "/api";
// Base para socket (sin /api al final)
const SOCKET_URL = API_NORM.replace(/\/api\/?$/, "");

/* ===============
   Mapa de íconos
   =============== */
const ICONS = {
  accesos: DoorOpen,
  rondas: Footprints,
  rondasqr: Footprints,
  incidentes: AlertTriangle,
  visitas: Users,
  bitacora: NotebookPen,
  evaluacion: ClipboardList,
  supervision: ClipboardList,
  iam: ShieldCheck,
};

/* ==========================================
   Permisos requeridos por sección (anyOf)
   ========================================== */
const PERMS_BY_SECTION = {
  accesos: ["accesos.read", "accesos.write", "accesos.export", "*"],
  rondasqr: [
    "rondasqr.view",
    "rondasqr.admin",
    "rondasqr.reports",
    "guardia",
    "*",
  ],
  rondas: [
    "rondasqr.view",
    "rondasqr.admin",
    "rondasqr.reports",
    "rondas.read",
    "rondas.reports",
    "guardia",
    "*",
  ],
  incidentes: [
    "incidentes.read",
    "incidentes.create",
    "incidentes.edit",
    "incidentes.reports",
    "*",
  ],
  visitas: ["visitas.read", "visitas.write", "visitas.close", "*"],
  bitacora: ["bitacora.read", "bitacora.write", "bitacora.export", "*"],
  supervision: [
    "supervision.read",
    "supervision.create",
    "supervision.edit",
    "supervision.reports",
    "*",
  ],
  evaluacion: [
    "evaluacion.list",
    "evaluacion.create",
    "evaluacion.edit",
    "evaluacion.reports",
    "evaluacion.kpi",
    "*",
  ],
  iam: ["iam.users.manage", "iam.roles.manage", "*"],
};

export default function Home() {
  const nav = useNavigate();
  const { getAccessTokenSilently } = useAuth0();

  // ✅ Agregamos los mismos contadores que el módulo de incidentes
  const [incStats, setIncStats] = React.useState({
    total: 0,
    abiertos: 0,
    enProceso: 0,
    resueltos: 0,
    alta: 0,
  });

  const socketRef = React.useRef(null);

  /* -------------------------
     Socket.IO (solo 1 vez)
     ------------------------- */
  React.useEffect(() => {
    if (!socketRef.current) {
      socketRef.current = io(SOCKET_URL, {
        transports: ["websocket", "polling"],
        withCredentials: true,
      });
    }
    const socket = socketRef.current;

    const onCheck = () => {
      // Aquí podrías actualizar KPIs en tiempo real si deseas
    };

    socket.on("rondasqr:check", onCheck);
    socket.on("rondas:check", onCheck);

    return () => {
      socket.off("rondasqr:check", onCheck);
      socket.off("rondas:check", onCheck);
    };
  }, []);

  /* -------------------------
     Token para axios
     ------------------------- */
  React.useEffect(() => {
    setAuthToken(() =>
      getAccessTokenSilently({
        authorizationParams: {
          audience: import.meta.env.VITE_AUTH0_AUDIENCE,
          scope: "openid profile email",
        },
      })
    );
  }, [getAccessTokenSilently]);

  /* -------------------------
     KPIs de incidentes
     ------------------------- */
  React.useEffect(() => {
    (async () => {
      try {
        const r = await api.get("/api/incidentes", { params: { limit: 500 } });
        const data = Array.isArray(r.data)
          ? r.data
          : Array.isArray(r.data?.items)
          ? r.data.items
          : [];

        // ✅ Mismos criterios que en la tabla de incidentes
        const total = data.length;
        const abiertos = data.filter((i) => i.status === "abierto").length;
        const enProceso = data.filter((i) => i.status === "en_proceso").length;
        const resueltos = data.filter((i) => i.status === "resuelto").length;
        const alta = data.filter((i) => i.priority === "alta").length;

        setIncStats({ total, abiertos, enProceso, resueltos, alta });
      } catch (err) {
        console.warn("Error cargando incidentes:", err);
      }
    })();
  }, []);

  /* ---------------------------------------------
     Secciones: alias y normalización de "rondas"
     --------------------------------------------- */
  const SECTIONS = React.useMemo(() => {
    const base = NAV_SECTIONS.map((s) => {
      if (s.key === "rondas") return { ...s, path: "/rondasqr" };
      if (s.key === "rondasqr") return { ...s, path: "/rondasqr" };
      return s;
    });

    if (!base.some((s) => s.key === "iam")) {
      base.push({
        key: "iam",
        label: "Usuarios y Permisos",
        path: "/iam/admin",
      });
    }
    return base;
  }, []);

  return (
    <div className="space-y-6">
      {/* KPIs */}
      <div className="grid gap-4 md:grid-cols-5">
        <div className="fx-kpi">
          <div className="text-sm opacity-75">Incidentes</div>
          <div className="text-3xl font-extrabold">{incStats.total}</div>
        </div>
        <div className="fx-kpi">
          <div className="text-sm opacity-75">Abiertos</div>
          <div className="text-3xl font-extrabold text-red-400">
            {incStats.abiertos}
          </div>
        </div>
        <div className="fx-kpi">
          <div className="text-sm opacity-75">En Proceso</div>
          <div className="text-3xl font-extrabold text-blue-400">
            {incStats.enProceso}
          </div>
        </div>
        <div className="fx-kpi">
          <div className="text-sm opacity-75">Resueltos</div>
          <div className="text-3xl font-extrabold text-green-400">
            {incStats.resueltos}
          </div>
        </div>
        <div className="fx-kpi">
          <div className="text-sm opacity-75">Alta Prioridad</div>
          <div className="text-3xl font-extrabold text-yellow-400">
            {incStats.alta}
          </div>
        </div>
      </div>

      {/* Secciones */}
      <div className="card fx-card">
        <h2 className="font-semibold mb-3">Secciones</h2>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {SECTIONS.map((s) => {
            const sectionKey = s.key === "rondas" ? "rondasqr" : s.key;
            const Icon = ICONS[sectionKey] || ICONS[s.key];
            const anyOf = PERMS_BY_SECTION[sectionKey] || ["*"];

            return (
              <IamGuard key={s.key} anyOf={anyOf} fallback={null}>
                <button
                  onClick={() => nav(s.path)}
                  className="fx-tile text-left p-4"
                >
                  <div className="flex items-center gap-3">
                    {Icon && <Icon className="w-5 h-5 opacity-80" />}
                    <div className="font-medium">{s.label}</div>
                  </div>
                  <div className="text-xs mt-1 opacity-70">
                    Ir a {s.label}
                  </div>
                </button>
              </IamGuard>
            );
          })}
        </div>
      </div>
    </div>
  );
}
