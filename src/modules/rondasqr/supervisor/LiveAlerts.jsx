// client/src/modules/rondasqr/supervisor/LiveAlerts.jsx
import React from "react";
import { io } from "socket.io-client";

function classNames(...xs) {
  return xs.filter(Boolean).join(" ");
}

function badgeClasses(type) {
  switch ((type || "").toLowerCase()) {
    case "panic":
      return "bg-red-600/20 text-red-200 border-red-500/40";
    case "fall":
      return "bg-orange-600/20 text-orange-200 border-orange-500/40";
    case "inactivity":
      return "bg-yellow-600/20 text-yellow-100 border-yellow-500/40";
    case "noncompliance":
      return "bg-fuchsia-600/20 text-fuchsia-200 border-fuchsia-500/40";
    case "incident":
    case "custom":
    default:
      return "bg-slate-600/20 text-slate-200 border-slate-500/40";
  }
}

export default function LiveAlerts() {
  const [events, setEvents] = React.useState([]);
  const [status, setStatus] = React.useState("connecting"); // connecting | connected | disconnected
  const [autoScroll, setAutoScroll] = React.useState(true);
  const bottomRef = React.useRef(null);
  const socketRef = React.useRef(null);

  // Auto-scroll al tope cuando llegan eventos (si está activo)
  React.useEffect(() => {
    if (autoScroll && bottomRef.current) {
      bottomRef.current.scrollIntoView({ behavior: "smooth", block: "end" });
    }
  }, [events, autoScroll]);

  React.useEffect(() => {
    const ROOT = (import.meta.env.VITE_API_BASE_URL || "http://localhost:4000").replace(/\/$/, "");

    // Si más adelante quieres enviar token por socket:
    // const token = localStorage.getItem("access_token") || null;
    const socket = io(ROOT, {
      transports: ["websocket"],       // fuerza WS (evita fallbacks raros)
      withCredentials: true,           // respeta CORS credenciales
      // auth: token ? { token } : undefined, // opcional si exiges JWT en sockets
      reconnection: true,
      reconnectionAttempts: Infinity,
      reconnectionDelay: 1000,
      reconnectionDelayMax: 5000,
      timeout: 20000,
    });

    socketRef.current = socket;

    socket.on("connect", () => {
      setStatus("connected");
      // console.log("[live] connected", socket.id);
    });

    socket.on("disconnect", (reason) => {
      setStatus("disconnected");
      // console.warn("[live] disconnected:", reason);
    });

    socket.on("connect_error", (err) => {
      setStatus("disconnected");
      // console.warn("[live] connect_error:", err?.message || err);
    });

    // Incidentes y alertas (panic, fall, inactivity, etc.)
    socket.on("rondasqr:incident", (evt) => {
      setEvents((prev) => {
        // opcional: deduplicar por id+timestamp
        const key = `${evt?._id || ""}-${evt?.at || ""}-${evt?.type || ""}-${evt?.text || ""}`;
        if (prev.length && (prev[0]?.__k === key)) return prev;
        const enriched = {
          ...evt,
          __k: key,
        };
        return [enriched, ...prev].slice(0, 200); // limita a 200
      });
    });

    // Si quieres mostrar marcas en vivo también
    socket.on("rondasqr:mark", (evt) => {
      // Puedes habilitar esto si te interesa ver cada check-in:
      // setEvents(prev => [{ ...evt, __k:`mark-${evt?.at||Date.now()}` }, ...prev].slice(0, 200));
    });

    return () => {
      // Limpieza ordenada de listeners
      try {
        socket.off("rondasqr:incident");
        socket.off("rondasqr:mark");
        socket.off("connect");
        socket.off("disconnect");
        socket.off("connect_error");
        socket.close();
      } catch {}
      socketRef.current = null;
    };
  }, []);

  const renderItem = (e, i) => {
    const when = e?.at ? new Date(e.at) : new Date();
    const who = e?.officerName || e?.officerEmail || e?.guardName || "-";
    const gpsOk = typeof e?.gps?.lat === "number" && typeof e?.gps?.lon === "number";
    const mapsUrl = gpsOk
      ? `https://www.google.com/maps?q=${e.gps.lat},${e.gps.lon}`
      : null;

    return (
      <li key={e.__k || i} className="bg-black/30 rounded-lg px-3 py-2 border border-white/10">
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <span
              className={classNames(
                "text-[11px] px-2 py-0.5 rounded border",
                badgeClasses(e?.type || "incident")
              )}
              title="Tipo de alerta"
            >
              {(e?.type || "incident").toUpperCase()}
            </span>
            <span className="text-xs text-white/70">{when.toLocaleString()}</span>
          </div>
          <div className="text-xs text-white/70">
            {e?.siteName ? <span className="mr-2">🏢 {e.siteName}</span> : null}
            {e?.roundName ? <span className="mr-2">🔁 {e.roundName}</span> : null}
            {who ? <span>👤 {who}</span> : null}
          </div>
        </div>

        {e?.text ? (
          <div className="mt-1 text-sm leading-snug whitespace-pre-wrap">{e.text}</div>
        ) : null}

        <div className="mt-1 text-xs flex flex-wrap gap-3 text-white/70">
          {gpsOk ? (
            <a
              href={mapsUrl}
              target="_blank"
              rel="noreferrer"
              className="underline hover:text-white"
              title="Ver en Google Maps"
            >
              📍 {e.gps.lat.toFixed(6)}, {e.gps.lon.toFixed(6)}
            </a>
          ) : (
            <span>📍 sin GPS</span>
          )}
          {typeof e?.stepsAtAlert === "number" ? (
            <span>👟 pasos: {e.stepsAtAlert}</span>
          ) : null}
          {typeof e?.durationMin === "number" ? (
            <span>⏱️ inactividad: {e.durationMin} min</span>
          ) : null}
        </div>
      </li>
    );
  };

  return (
    <div className="rounded-2xl border border-white/10 bg-white/5 backdrop-blur p-4 shadow-lg">
      <div className="flex items-center justify-between mb-2">
        <h3 className="font-semibold text-lg">Alertas en vivo</h3>
        <div className="flex items-center gap-3">
          <span
            className={classNames(
              "inline-flex items-center gap-2 text-xs px-2 py-0.5 rounded border",
              status === "connected"
                ? "bg-emerald-600/20 text-emerald-200 border-emerald-500/40"
                : status === "connecting"
                ? "bg-yellow-600/20 text-yellow-100 border-yellow-500/40"
                : "bg-red-600/20 text-red-200 border-red-500/40"
            )}
            title="Estado de conexión con el servidor en tiempo real"
          >
            <span
              className={classNames(
                "inline-block w-2 h-2 rounded-full",
                status === "connected"
                  ? "bg-emerald-400"
                  : status === "connecting"
                  ? "bg-yellow-400"
                  : "bg-red-400"
              )}
            />
            {status}
          </span>

          <label className="text-xs flex items-center gap-2 select-none cursor-pointer">
            <input
              type="checkbox"
              className="accent-blue-500"
              checked={autoScroll}
              onChange={(e) => setAutoScroll(e.target.checked)}
            />
            Auto-scroll
          </label>
        </div>
      </div>

      {!events.length ? (
        <div className="text-sm text-white/70">Sin alertas por ahora.</div>
      ) : (
        <div className="max-h-80 overflow-auto pr-1">
          <ul className="space-y-2">
            {events.map(renderItem)}
          </ul>
          <div ref={bottomRef} />
        </div>
      )}
    </div>
  );
}
