// client/src/components/Footer.jsx
import React from "react";
import { Link } from "react-router-dom";
import api from "../lib/api.js"; // ✅ import relativo (default export)
import { MessageCircle, Mail, ExternalLink, ShieldCheck, Server, Clock, Github } from "lucide-react";

export default function Footer() {
  const [apiUp, setApiUp] = React.useState(null);
  const [ping, setPing]   = React.useState(null);

  // Versión tomada de env (si no existe, fallback)
  const version = import.meta.env.VITE_APP_VERSION || "1.0.0";

  // Base real que está usando axios (más confiable que leer otra var env aquí)
  const apiBaseUrl = (api?.defaults?.baseURL || "http://localhost:4000").replace(/\/$/, "");
  const apiShown   = `${apiBaseUrl}/api`;

  React.useEffect(() => {
    let cancel = false;
    const pingApi = async () => {
      try {
        const t0 = performance.now();
        // 👇 siempre ping a /api/health (endpoint público de salud)
        const r  = await api.get("/api/health", { timeout: 5000 });
        const t1 = performance.now();
        if (cancel) return;
        setPing(Math.round(t1 - t0));
        setApiUp(r?.data?.ok === true);
      } catch {
        if (!cancel) { setApiUp(false); setPing(null); }
      }
    };
    pingApi();
    const id = setInterval(pingApi, 30000);
    return () => { cancel = true; clearInterval(id); };
  }, []);

  return (
    <footer className="mt-10">
      {/* línea superior dentro del contenido, no debajo del sidebar */}
      <div
        className="h-[2px] mx-4 md:mx-6 opacity-80"
        style={{ background: "linear-gradient(90deg, var(--fx1), var(--fx2), var(--fx3))" }}
        aria-hidden
      />

      {/* Tarjeta del footer: overflow-hidden para que los glows NO se salgan */}
      <div className="relative overflow-hidden rounded-2xl border border-neutral-200 dark:border-neutral-800 bg-white/80 dark:bg-neutral-950/70 backdrop-blur p-6 lg:p-8 mx-4 md:mx-6 mb-2">
        {/* Glows */}
        <div className="pointer-events-none absolute -z-10 inset-0">
          <div
            className="absolute w-[28rem] h-[28rem] left-[-10%] bottom-[-35%] rounded-full blur-3xl opacity-25"
            style={{ background: "radial-gradient(closest-side, var(--fx1), transparent 70%)" }}
          />
          <div
            className="absolute w-[24rem] h-[24rem] right-[-10%] top-[-30%] rounded-full blur-3xl opacity-20"
            style={{ background: "radial-gradient(closest-side, var(--fx2), transparent 70%)" }}
          />
        </div>

        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
          {/* Columna 1 */}
          <div>
            <div className="text-2xl font-bold fx-title">SENAF</div>
            <p className="mt-2 text-sm opacity-70">
              Plataforma integral de seguridad: accesos, rondas, incidentes, visitas y más.
            </p>
            <div className="mt-3 flex items-center gap-2 text-xs opacity-70">
              <ShieldCheck className="w-4 h-4" /> Datos protegidos · Roles · Auditoría
            </div>
          </div>

          {/* Columna 2 - Secciones */}
          <div>
            <div className="font-semibold mb-2">Secciones</div>
            <ul className="space-y-1 text-sm">
              <li><Link className="hover:underline" to="/accesos">Control de Acceso</Link></li>
              <li><Link className="hover:underline" to="/rondas">Rondas de Vigilancia</Link></li>
              <li><Link className="hover:underline" to="/incidentes">Gestión de Incidentes</Link></li>
              <li><Link className="hover:underline" to="/visitas">Control de Visitas</Link></li>
              <li><Link className="hover:underline" to="/bitacora">Bitácora Digital</Link></li>
              <li><Link className="hover:underline" to="/supervision">Supervisión</Link></li>
              <li><Link className="hover:underline" to="/evaluacion">Evaluación</Link></li>
            </ul>
          </div>

          {/* Columna 3 - Soporte */}
          <div>
            <div className="font-semibold mb-2">Soporte</div>
            <ul className="space-y-2 text-sm">
              <li className="flex items-center gap-2">
                <MessageCircle className="w-4 h-4 opacity-70" />
                <button
                  type="button"
                  onClick={() => window.dispatchEvent(new CustomEvent("chat:open"))}
                  className="hover:underline"
                >
                  Abrir chat
                </button>
              </li>
              <li className="flex items-center gap-2">
                <Mail className="w-4 h-4 opacity-70" />
                <a className="hover:underline" href="mailto:soporte@senaf.local">soporte@senaf.local</a>
              </li>
              <li className="flex items-center gap-2">
                <ExternalLink className="w-4 h-4 opacity-70" />
                <a className="hover:underline" href="#" onClick={(e)=>e.preventDefault()}>Documentación</a>
              </li>
            </ul>
          </div>

            {/* Columna 4 - Estado */}
          <div>
            <div className="font-semibold mb-2">Estado del sistema</div>
            <div className="text-sm space-y-1">
              <div className="flex items-center gap-2">
                <span
                  className={`inline-block w-2.5 h-2.5 rounded-full ${
                    apiUp === null ? "bg-neutral-400" : apiUp ? "bg-emerald-500" : "bg-rose-500"
                  }`}
                />
                <span className="opacity-80">API</span>
                <span className="opacity-60">·</span>
                <span className="opacity-70 break-all">{apiShown}</span>
              </div>
              <div className="flex items-center gap-2">
                <Clock className="w-4 h-4 opacity-70" />
                <span className="opacity-80">Ping</span>
                <span className="opacity-60">·</span>
                <span className="opacity-80">{ping != null ? `${ping} ms` : "—"}</span>
              </div>
              <div className="flex items-center gap-2">
                <Server className="w-4 h-4 opacity-70" />
                <span className="opacity-80">Versión</span>
                <span className="opacity-60">·</span>
                <span className="opacity-80">v{version}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Línea inferior */}
        <div className="mt-6 pt-6 border-t border-neutral-200 dark:border-neutral-800 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs opacity-70">
          <div>© {new Date().getFullYear()} SENAF · Todos los derechos reservados</div>
          <div className="flex items-center gap-4">
            <a className="hover:underline" href="#" onClick={(e)=>e.preventDefault()}>Privacidad</a>
            <a className="hover:underline" href="#" onClick={(e)=>e.preventDefault()}>Términos</a>
            <a className="inline-flex items-center gap-1 hover:underline" href="#" onClick={(e)=>e.preventDefault()}>
              <Github className="w-4 h-4" /> GitHub
            </a>
          </div>
        </div>
      </div>
    </footer>
  );
}
