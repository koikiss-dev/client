// client/src/modules/rondasqr/pages/ScanPage.jsx
import React, { useState, useMemo, useEffect, useRef } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import SidebarGuard from "./SidebarGuard.jsx";
import QrScanner from "./QrScanner.jsx";
import { rondasqrApi } from "../api/rondasqrApi.js";
import { useAuth0 } from "@auth0/auth0-react";
import { useAssignmentSocket } from "../hooks/useAssignmentSocket.js";
import { emitLocalPanic, subscribeLocalPanic } from "../utils/panicBus.js";

import {
  getOutbox,
  queueCheckin,
  transmitOutbox,
  removeById,
  countOutbox,
} from "../utils/outbox.js";

/* utils pequeños */
function toArr(v) {
  return !v ? [] : Array.isArray(v) ? v : [v];
}
function uniqLower(arr) {
  return Array.from(
    new Set(
      toArr(arr)
        .map((x) => String(x).trim().toLowerCase())
        .filter(Boolean)
    )
  );
}
function readJsonLS(key, fallback) {
  try {
    if (typeof localStorage === "undefined") return fallback;
    const raw = localStorage.getItem(key);
    if (!raw) return fallback;
    const parsed = JSON.parse(raw);
    return parsed == null ? fallback : parsed;
  } catch {
    return fallback;
  }
}

export default function ScanPage() {
  const nav = useNavigate();
  const { pathname, hash } = useLocation();
  const { user } = useAuth0();

  /* ===== nav lateral móvil ===== */
  const [isNavOpen, setIsNavOpen] = useState(false);
  useEffect(() => {
    setIsNavOpen(false);
  }, [pathname]);
  useEffect(() => {
    document.body.style.overflow = isNavOpen ? "hidden" : "";
    return () => (document.body.style.overflow = "");
  }, [isNavOpen]);

  /* ===== notificaciones ===== */
  useEffect(() => {
    if ("Notification" in window && Notification.permission === "default") {
      Notification.requestPermission().catch(() => {});
    }
  }, []);

  /* ===== audio de alerta ===== */
  const alertAudioRef = useRef(null);
  const audioCtxRef = useRef(null);
  const [lastPanic, setLastPanic] = useState(null);

  /* ===== socket: alertas entrantes ===== */
  useAssignmentSocket(user, (evt) => {
    const t = evt?.type || evt?.event || evt?.kind;
    if (t === "panic" || t === "rondasqr:panic") {
      handleIncomingPanic(evt.payload || {});
    }
  });

  /* ===== bus local: alertas desde otra página ===== */
  useEffect(() => {
    const unsub = subscribeLocalPanic((payload) => handleIncomingPanic(payload));
    return () => unsub && unsub();
  }, []);

  function playAlarmTone() {
    try {
      if (!audioCtxRef.current) {
        const Ctx = window.AudioContext || window.webkitAudioContext;
        if (!Ctx) return;
        audioCtxRef.current = new Ctx();
      }
      const ctx = audioCtxRef.current;
      if (ctx.state === "suspended") {
        ctx.resume().catch(() => {});
      }

      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = "sawtooth";
      osc.connect(gain);
      gain.connect(ctx.destination);

      const now = ctx.currentTime;
      osc.frequency.setValueAtTime(500, now);
      osc.frequency.linearRampToValueAtTime(900, now + 0.4);
      osc.frequency.linearRampToValueAtTime(500, now + 0.8);
      osc.frequency.linearRampToValueAtTime(900, now + 1.2);
      osc.frequency.linearRampToValueAtTime(500, now + 1.6);

      gain.gain.setValueAtTime(0.0001, now);
      gain.gain.linearRampToValueAtTime(0.4, now + 0.05);
      gain.gain.linearRampToValueAtTime(0.4, now + 1.6);
      gain.gain.linearRampToValueAtTime(0.0001, now + 1.9);

      osc.start(now);
      osc.stop(now + 2.0);
    } catch {
      if (alertAudioRef.current) {
        alertAudioRef.current.currentTime = 0;
        alertAudioRef.current.play().catch(() => {});
      }
    }
  }

  function handleIncomingPanic(payload) {
    setLastPanic({ at: new Date().toLocaleTimeString(), ...payload });
    playAlarmTone();
  }

  /* ===== roles/permisos ===== */
  const ROLES_CLAIM = "https://senaf.local/roles";
  const PERMS_CLAIM = "https://senaf.local/permissions";

  const rolesAuth0 = uniqLower(user?.roles);
  const rolesClaim = uniqLower(user?.[ROLES_CLAIM]);
  const permsClaim = uniqLower(user?.[PERMS_CLAIM]);

  const devRoles = import.meta.env.DEV
    ? uniqLower((localStorage.getItem("iamDevRoles") || "").split(","))
    : [];
  const devPerms = import.meta.env.DEV
    ? uniqLower((localStorage.getItem("iamDevPerms") || "").split(","))
    : [];

  const roles = uniqLower([...rolesAuth0, ...rolesClaim, ...devRoles]);
  const perms = uniqLower([...permsClaim, ...devPerms]);

  const isAdminLike =
    perms.includes("*") || roles.includes("admin") || roles.includes("rondasqr.admin");
  const isSupervisorLike =
    roles.includes("supervisor") ||
    perms.includes("rondasqr.view") ||
    perms.includes("rondasqr.reports");

  /* ===== qué pestaña ===== */
  const tab = useMemo(() => {
    if (pathname.endsWith("/qr")) return "qr";
    if (pathname.endsWith("/msg")) return "msg";
    if (pathname.endsWith("/fotos")) return "fotos";
    if (pathname.endsWith("/outbox") || pathname.endsWith("/sync")) return "outbox";
    if (pathname.endsWith("/dump") || pathname.endsWith("/offline")) return "dump";
    return "home";
  }, [pathname]);

  // ✅ CAMBIO 1: cuando la pestaña es "msg", lo mandamos al formulario global en modo rondas
  useEffect(() => {
    if (tab === "msg") nav("/incidentes/nuevo?from=ronda", { replace: true });
  }, [tab, nav]);

  /* ===== estados varios ===== */
  const [msg, setMsg] = useState("");
  const [photos, setPhotos] = useState([null, null, null, null, null]);
  const [sendingAlert, setSendingAlert] = useState(false);
  const [sendingMsg, setSendingMsg] = useState(false);
  const [sendingPhotos, setSendingPhotos] = useState(false);

  /* ===== carga de plan/puntos ===== */
  const [points, setPoints] = useState([]);
  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const plans = await rondasqrApi.listPlans();
        const plan = plans?.items?.[0] || null;
        if (!alive || !plan) return;

        const pts = await rondasqrApi.listPoints({
          siteId: plan.siteId,
          roundId: plan.roundId,
        });
        if (!alive) return;
        setPoints(pts?.items || []);
      } catch (e) {
        console.warn("[ScanPage] No se pudieron cargar puntos", e);
      }
    })();
    return () => {
      alive = false;
    };
  }, []);

  /* ===== progreso local ===== */
  const [progress, setProgress] = useState({
    lastPoint: null,
    nextPoint: null,
    pct: 0,
  });
  function loadLocalProgress() {
    const lastPoint = localStorage.getItem("rondasqr:lastPointName") || null;
    const nextPoint = localStorage.getItem("rondasqr:nextPointName") || null;
    const pct = Math.max(
      0,
      Math.min(100, Number(localStorage.getItem("rondasqr:progressPct") || 0))
    );
    setProgress({ lastPoint, nextPoint, pct });
  }
  useEffect(() => {
    loadLocalProgress();
  }, []);

  /* ===== alerta rápida por hash ===== */
  useEffect(() => {
    if (hash === "#alert") {
      (async () => {
        await sendAlert();
        nav("/rondasqr/scan", { replace: true });
      })();
    }
  }, [hash, nav]);

  /* ===== enviar alerta ===== */
  async function sendAlert() {
    if (sendingAlert) return false;
    setSendingAlert(true);
    try {
      let gps;
      if ("geolocation" in navigator) {
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
      emitLocalPanic({ source: "home-button", user: user?.name || user?.email });
      playAlarmTone();
      alert("🚨 Alerta de pánico enviada.");
      return true;
    } catch (err) {
      console.error("[ScanPage] error al enviar alerta", err);
      alert("No se pudo enviar la alerta.");
      return false;
    } finally {
      setSendingAlert(false);
    }
  }

  /* ===== manejar QR ESCANEADO ===== */
  async function handleScan(result) {
    const qr = typeof result === "string" ? result : result?.text;
    if (!qr) return;

    if (!navigator.onLine) {
      queueCheckin({ qr, gps: null });
      alert("📦 Sin conexión. QR guardado para transmitir más tarde.");
      nav("/rondasqr/scan", { replace: true });
      return;
    }

    try {
      let gps = null;
      if ("geolocation" in navigator) {
        await new Promise((resolve) => {
          navigator.geolocation.getCurrentPosition(
            (pos) => {
              gps = { lat: pos.coords.latitude, lon: pos.coords.longitude };
              resolve();
            },
            () => resolve(),
            { enableHighAccuracy: true, timeout: 3000 }
          );
        });
      }

      if (typeof rondasqrApi.checkinScan === "function") {
        await rondasqrApi.checkinScan({ qr, gps });
      } else if (typeof rondasqrApi.scan === "function") {
        await rondasqrApi.scan({ qr, gps });
      } else {
        await fetch(
          (import.meta.env.VITE_API_BASE_URL || "http://localhost:4000") +
            "/api/rondasqr/v1/checkin/scan",
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            credentials: "include",
            body: JSON.stringify({ qr, gps }),
          }
        ).then((r) => {
          if (!r.ok) throw new Error("HTTP " + r.status);
        });
      }

      localStorage.setItem("rondasqr:lastPointName", qr);
      localStorage.setItem("rondasqr:progressPct", "100");
      setProgress((prev) => ({ ...prev, lastPoint: qr, pct: 100 }));

      alert("✅ Punto registrado: " + qr);
      window.dispatchEvent(new CustomEvent("qrscanner:stop"));
      nav("/rondasqr/scan", { replace: true });
    } catch (err) {
      console.error("[ScanPage] error al registrar punto (se guarda en pendientes)", err);
      queueCheckin({ qr, gps: null });
      alert("📦 No se pudo enviar. Guardado para transmitir más tarde.");
      nav("/rondasqr/scan/outbox", { replace: true });
    }
  }

  /* ===== mensaje legacy ===== */
  async function sendMessage() {
    if (sendingMsg) return;
    if (!msg.trim()) return alert("Escribe un mensaje.");
    setSendingMsg(true);
    try {
      await rondasqrApi.postIncident({ text: msg.trim() });
      alert("✅ Mensaje enviado.");
      setMsg("");
      nav("/rondasqr/scan");
    } catch {
      alert("No se pudo enviar el mensaje.");
    } finally {
      setSendingMsg(false);
    }
  }

  /* ===== fotos ===== */
  async function sendPhotos() {
    if (sendingPhotos) return;
    const base64s = photos.filter(Boolean);
    if (!base64s.length) return alert("Selecciona al menos una foto.");
    setSendingPhotos(true);
    try {
      await rondasqrApi.postIncident({ text: "Fotos de ronda", photosBase64: base64s });
      alert("📤 Fotos enviadas.");
      setPhotos([null, null, null, null, null]);
      nav("/rondasqr/scan");
    } catch {
      alert("No se pudieron enviar las fotos.");
    } finally {
      setSendingPhotos(false);
    }
  }

  /* ===== OUTBOX ===== */
  const [outbox, setOutbox] = useState(getOutbox());
  const [syncing, setSyncing] = useState(false);
  const refreshOutbox = () => setOutbox(getOutbox());

  async function sendCheckinViaApi(it) {
    if (typeof rondasqrApi.checkinScan === "function") {
      await rondasqrApi.checkinScan({ qr: it.qr, gps: it.gps || null });
    } else if (typeof rondasqrApi.scan === "function") {
      await rondasqrApi.scan({ qr: it.qr, gps: it.gps || null });
    } else {
      await fetch(
        (import.meta.env.VITE_API_BASE_URL || "http://localhost:4000") +
          "/api/rondasqr/v1/checkin/scan",
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          credentials: "include",
          body: JSON.stringify({ qr: it.qr, gps: it.gps || null }),
        }
      ).then((r) => {
        if (!r.ok) throw new Error("HTTP " + r.status);
      });
    }
  }

  async function transmitNow() {
    if (!outbox.length) {
      alert("No hay rondas pendientes.");
      return;
    }
    setSyncing(true);
    try {
      const res = await transmitOutbox(sendCheckinViaApi);
      refreshOutbox();
      alert(`Transmitidas: ${res.ok}  •  Fallidas: ${res.fail}`);
    } catch (e) {
      console.error("transmitNow error", e);
      alert("Ocurrió un error al transmitir.");
    } finally {
      setSyncing(false);
    }
  }

  useEffect(() => {
    if (tab === "outbox") refreshOutbox();
  }, [tab]);

  /* ===== Payload offline ===== */
  function buildOfflinePayload(authUser) {
    const outboxData = getOutbox();
    const progress = {
      lastPoint: localStorage.getItem("rondasqr:lastPointName") || null,
      nextPoint: localStorage.getItem("rondasqr:nextPointName") || null,
      pct: Number(localStorage.getItem("rondasqr:progressPct") || 0),
    };
    const device = {
      ua: typeof navigator !== "undefined" ? navigator.userAgent : "",
      online: typeof navigator !== "undefined" ? navigator.onLine : false,
      connection:
        typeof navigator !== "undefined" && navigator.connection
          ? {
              type: navigator.connection.effectiveType,
              downlink: navigator.connection.downlink,
            }
          : null,
    };
    const userInfo = authUser
      ? {
          id: authUser.sub || null,
          email: authUser.email || null,
          name: authUser.name || null,
        }
      : null;
    const assignments = readJsonLS("rondasqr:assignments", []);
    const logs = readJsonLS("rondasqr:logs", []);

    return {
      outbox: outboxData,
      progress,
      device,
      user: userInfo,
      assignments: Array.isArray(assignments) ? assignments : [],
      logs: Array.isArray(logs) ? logs : [],
      at: new Date().toISOString(),
    };
  }

  async function sendOfflineDump() {
    try {
      const payload = buildOfflinePayload(user);
      const pending = payload.outbox;
      if (!pending || !pending.length) {
        alert("No hay información offline para enviar.");
        return;
      }

      const apiBase = import.meta.env.VITE_API_BASE_URL || "http://localhost:4000";
      const res = await fetch(`${apiBase}/api/rondasqr/v1/offline/dump`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const txt = await res.text().catch(() => "");
        throw new Error(txt || `HTTP ${res.status}`);
      }

      const json = await res.json().catch(() => ({ ok: true }));
      alert("📤 Base de datos local enviada.\n" + (json?.message || ""));
    } catch (err) {
      console.error("[ScanPage] dump offline error", err);
      alert("No se pudo enviar la base de datos.");
    }
  }

  /* ===== estilos ===== */
  const pageClass = "flex min-h-screen bg-transparent text-slate-800 dark:text-slate-100";

  const headerClass =
    "rounded-2xl px-4 sm:px-6 py-3 mb-4 sm:mb-6 flex items-center justify-between " +
    "bg-slate-50/70 border border-slate-200/60 shadow-sm " +
    "dark:bg-white/5 dark:border-white/10 dark:shadow-none dark:backdrop-blur";

  const cardClass =
    "rounded-2xl p-4 sm:p-6 " +
    "bg-slate-50/70 border border-slate-200/60 shadow-sm " +
    "dark:bg-white/5 dark:border-white/10 dark:shadow-none dark:backdrop-blur";

  const neutralBtn =
    "px-4 py-2 rounded-lg border font-medium " +
    "border-slate-300 bg-slate-100 hover:bg-slate-200 text-slate-800 " +
    "dark:border-white/15 dark:bg-white/10 dark:hover:bg-white/20 dark:text-white";

  const neonStyles = `
    .btn-neon {
      padding:.5rem 1rem;
      border-radius:.5rem;
      font-weight:600;
      color:#fff;
      background-image:linear-gradient(90deg,#8b5cf6,#06b6d4);
      box-shadow:0 10px 28px rgba(99,102,241,.18),0 6px 20px rgba(6,182,212,.12);
      transition:filter .2s ease, transform .2s ease;
    }
    .btn-neon:hover { filter:brightness(1.04); transform:translateY(-1px); }
    .btn-neon:active { transform:translateY(0); }
    .btn-neon-green  { background-image:linear-gradient(90deg,#22c55e,#06b6d4); }
    .btn-neon-rose   { background-image:linear-gradient(90deg,#f43f5e,#fb7185); }
    .btn-neon-amber  { background-image:linear-gradient(90deg,#f59e0b,#ef4444); }
    .btn-neon-purple { background-image:linear-gradient(90deg,#a855f7,#6366f1); }
    .dark .btn-neon {
      box-shadow:0 14px 36px rgba(99,102,241,.38),0 10px 28px rgba(6,182,212,.28);
    }
    @keyframes panic-blink {
      0%, 100% { opacity: 1; box-shadow: 0 0 25px rgba(248,113,113,.8); }
      50% { opacity: .55; box-shadow: 0 0 6px rgba(248,113,113,.2); }
    }
    .panic-indicator { animation: panic-blink 1s ease-in-out infinite; }
  `;

  const homeCols =
    isAdminLike || isSupervisorLike ? "md:grid-cols-2 xl:grid-cols-3" : "md:grid-cols-2";

  const BEEP_SRC =
    "data:audio/wav;base64,UklGRo+eAABXQVZFZm10IBAAAAABAAEAIlYAAESsAAACABAAZGF0YZ+eAABW/////wAAAP///1b/////AAAA////Vv////8AAAD///9W/////wAAAP///1b/////AAAA////Vv////8AAAD///9W/////wAAAP///1b/////AAAA////Vv////8AAAD///9W/////wAAAP///1b/////AAAA////Vv////8AAAD///9W/////wAAAP///1b/////AAAA////Vv////8AAAD///9W/////wAAAP///1b/////AAAA////Vv////8AAAD///9W/////wAAAP///1b/////AAAA////Vv////8AAAD///9W/////wAAAP///1b/////AAAA////Vv////8AAAD///9W/////wAAAP///1b/////AAAA////Vv////8AAAD///9W/////wAAAP///w==";

  return (
    <div className={pageClass}>
      <style>{neonStyles}</style>

      <audio ref={alertAudioRef} src={BEEP_SRC} preload="auto" />

      {lastPanic && (
        <button
          onClick={() => setLastPanic(null)}
          className="fixed top-20 right-6 z-[120] w-16 h-16 rounded-full bg-red-600 border-4 border-red-300 flex flex-col items-center justify-center text-white panic-indicator shadow-lg"
          title={`Alerta recibida ${lastPanic.at}`}
        >
          <span className="text-[10px] leading-none font-bold">ALERTA</span>
          <span className="text-[9px] leading-none mt-1">¡NUEVA!</span>
        </button>
      )}

      {/* sidebar desktop */}
      <div className="hidden md:block">
        <SidebarGuard
          variant="desktop"
          onSendAlert={sendAlert}
          onDumpDb={() => nav("/rondasqr/scan/dump")}
        />
      </div>

      {/* drawer móvil */}
      {isNavOpen && (
        <>
          <div
            onClick={() => setIsNavOpen(false)}
            className="fixed inset-0 z-40 bg-black/40 backdrop-blur-sm md:hidden"
          />
          <SidebarGuard
            variant="mobile"
            onCloseMobile={() => setIsNavOpen(false)}
            onSendAlert={sendAlert}
            onDumpDb={() => nav("/rondasqr/scan/dump")}
          />
        </>
      )}

      <main className="flex-1 flex flex-col overflow-y-auto p-4 sm:p-6 relative gap-4">
        {/* hamburguesa */}
        <div className="md:hidden mb-1">
          <button
            onClick={() => setIsNavOpen(true)}
            className="inline-flex items-center gap-2 rounded-lg px-3 py-2
                       border border-slate-300 bg-slate-50 text-slate-800
                       dark:border-white/15 dark:bg-white/10 dark:text-white"
          >
            ☰ Menú
          </button>
        </div>

        {/* header */}
        <div className={headerClass}>
          <h2 className="text-xl sm:text-2xl font-bold">Visión General</h2>
          <div className="text-xs sm:text-sm">
            Pendientes: <span className="font-semibold">{countOutbox()}</span>
          </div>
        </div>

        {/* HOME */}
        {tab === "home" && (
          <div className={`grid grid-cols-1 ${homeCols} gap-4 sm:gap-6`}>
            {/* bloque alerta */}
            <section className={cardClass + " text-center"}>
              <div className="flex flex-col items-center">
                <button
                  onClick={async () => {
                    const ok = await sendAlert();
                    if (ok) nav("/rondasqr/scan", { replace: true });
                  }}
                  disabled={sendingAlert}
                  className={[
                    "rounded-full font-extrabold text-white",
                    "bg-rose-600 hover:bg-rose-500 border-4 border-rose-400",
                    "w-28 h-28 text-lg sm:w-32 sm:h-32 sm:text-xl md:w-36 md:h-36 md:text-2xl",
                    sendingAlert ? "cursor-not-allowed opacity-80" : "",
                  ].join(" ")}
                >
                  {sendingAlert ? "ENVIANDO..." : "ALERTA"}
                </button>
                <p className="text-sm mt-2 text-slate-600 dark:text-white/80">
                  Oprima en caso de emergencia
                </p>
              </div>

              <div className="mt-6 grid gap-3 max-w-md mx-auto w-full">
                <button onClick={() => nav("/rondasqr/scan/qr")} className="w-full btn-neon">
                  Registrador Punto Control
                </button>
                {/* ✅ CAMBIO 2: aquí ya con el query */}
                <button
                  onClick={() => nav("/incidentes/nuevo?from=ronda")}
                  className="w-full btn-neon btn-neon-purple"
                >
                  Mensaje Incidente
                </button>
                <button onClick={() => nav("/rondasqr/scan/outbox")} className="w-full btn-neon btn-neon-green">
                  Transmitir Rondas Pendientes ({countOutbox()})
                </button>
                <button onClick={() => nav("/rondasqr/scan/dump")} className="w-full btn-neon">
                  Base offline
                </button>
              </div>
            </section>

            {/* progreso */}
            <section className={cardClass}>
              <h3 className="font-semibold text-lg mb-3">Progreso de Ronda</h3>
              {progress.lastPoint || progress.nextPoint || progress.pct > 0 ? (
                <>
                  <div className="text-sm space-y-1 mb-3">
                    {progress.lastPoint && (
                      <div>
                        <span className="opacity-70">Último punto: </span>
                        <span className="font-medium">{progress.lastPoint}</span>
                      </div>
                    )}
                    {progress.nextPoint && (
                      <div>
                        <span className="opacity-70">Siguiente: </span>
                        <span className="font-medium">{progress.nextPoint}</span>
                      </div>
                    )}
                  </div>
                  <div className="w-full h-3 rounded-full bg-black/5 dark:bg-white/10 overflow-hidden">
                    <div
                      className="h-full bg-gradient-to-r from-indigo-500 to-cyan-400"
                      style={{ width: `${Math.max(0, Math.min(100, progress.pct))}%` }}
                    />
                  </div>
                  <div className="mt-1 text-right text-xs opacity-70">
                    {Math.max(0, Math.min(100, progress.pct))}% completado
                  </div>
                  <div className="mt-4 grid grid-cols-2 gap-3">
                    <button onClick={() => nav("/rondasqr/scan/qr")} className="btn-neon">
                      Continuar ronda
                    </button>
                    <button onClick={() => nav("/rondasqr/scan")} className="btn-neon btn-neon-amber">
                      Finalizar
                    </button>
                  </div>
                </>
              ) : (
                <>
                  <p className="text-sm text-slate-600 dark:text-white/80">
                    Para iniciar una ronda, abre el <strong>Registrador Punto Control</strong> y
                    escanea el primer punto asignado.
                  </p>
                  <ul className="mt-3 text-sm space-y-1 list-disc list-inside text-slate-600 dark:text-white/70">
                    <li>Da permisos de cámara al navegador.</li>
                    <li>Si no ves los puntos, confirma que el plan de ronda esté cargado.</li>
                    <li>Puedes reportar un incidente desde “Mensaje Incidente”.</li>
                  </ul>
                </>
              )}
            </section>

            {/* acciones admin/supervisor */}
            {(isAdminLike || isSupervisorLike) && (
              <section className={cardClass}>
                <h3 className="font-semibold text-lg mb-3">Acciones</h3>
                <p className="text-sm text-slate-600 dark:text-white/80 mb-4">
                  Acciones avanzadas disponibles para supervisores o administradores.
                </p>
                <div className="grid gap-3 max-w-sm">
                  <button onClick={() => nav("/rondasqr/reports")} className="btn-neon">
                    📊 Abrir informes
                  </button>
                  {isAdminLike && (
                    <button onClick={() => nav("/rondasqr/admin")} className="btn-neon btn-neon-purple">
                      ⚙️ Administración de rondas
                    </button>
                  )}
                </div>
              </section>
            )}

            {/* actividad reciente */}
            <section className={cardClass}>
              <h3 className="font-semibold mb-2">Actividad reciente</h3>
              <p className="text-sm text-slate-600 dark:text-white/70">Sin check-ins recientes.</p>
            </section>

            <section className={cardClass}>
              <h3 className="font-semibold mb-2">Consejos rápidos</h3>
              <ul className="list-disc list-inside text-sm text-slate-600 dark:text-white/70 space-y-1">
                <li>Antes de salir, verifica conexión o transmite pendientes.</li>
                <li>Si falla el QR, usa “Transmitir Rondas Pendientes”.</li>
                <li>La alerta también está en el menú lateral.</li>
              </ul>
            </section>

            <section className={cardClass + " md:col-span-2 xl:col-span-3"}>
              <h3 className="font-semibold mb-2">Rendimiento del dispositivo</h3>
              <p className="text-sm text-slate-600 dark:text-white/70 mb-2">
                Estado rápido del navegador y de la conexión actual.
              </p>
              <p className="text-sm">
                <strong>Online:</strong>{" "}
                {typeof navigator !== "undefined" && navigator.onLine ? "Sí" : "No"}
              </p>
              <p className="text-sm break-all">
                <strong>User-Agent:</strong>{" "}
                {typeof navigator !== "undefined" ? navigator.userAgent : ""}
              </p>
              <p className="text-sm">
                <strong>Último pánico:</strong> {lastPanic ? lastPanic.at : "No registrado."}
              </p>
            </section>
          </div>
        )}

        {/* QR */}
        {tab === "qr" && (
            <section className={cardClass}>
              <h3 className="font-semibold text-lg mb-3">Escanear Punto</h3>
              <div className="aspect-[3/2] rounded-xl overflow-hidden relative bg-slate-100/60 dark:bg-black/40">
                <QrScanner
                  facingMode="environment"
                  once={true}
                  enableTorch
                  enableFlip
                  onResult={handleScan}
                  onError={(e) => console.warn("QR error", e)}
                />
              </div>
              <div className="mt-4 grid grid-cols-2 gap-3">
                <button
                  onClick={() => {
                    window.dispatchEvent(new CustomEvent("qrscanner:stop"));
                    nav("/rondasqr/scan");
                  }}
                  className="btn-neon btn-neon-amber"
                >
                  Finalizar
                </button>
                <button
                  onClick={() => {
                    window.dispatchEvent(new CustomEvent("qrscanner:stop"));
                    nav("/rondasqr/scan/qr");
                  }}
                  className="btn-neon btn-neon-green"
                >
                  Reintentar
                </button>
              </div>
            </section>
        )}

        {/* OUTBOX */}
        {tab === "outbox" && (
          <section className={cardClass}>
            <div className="flex items-center justify-between gap-4 mb-3">
              <h3 className="font-semibold text-lg">Transmitir Rondas Pendientes</h3>
              <div className="text-sm opacity-70">Pendientes: {outbox.length}</div>
            </div>
            {outbox.length === 0 ? (
              <div className="text-slate-600 dark:text-white/80">
                No hay check-ins pendientes. ✨
              </div>
            ) : (
              <>
                <ul className="divide-y divide-slate-200 dark:divide-white/10 mb-4">
                  {outbox.map((it) => (
                    <li key={it.id} className="py-2 flex items-center justify-between gap-4">
                      <div className="text-sm">
                        <div className="font-medium">{it.qr}</div>
                        <div className="opacity-70">
                          {new Date(it.at).toLocaleString()}
                          {it.gps
                            ? ` • (${it.gps.lat.toFixed?.(4)}, ${it.gps.lon?.toFixed?.(4)})`
                            : ""}
                        </div>
                      </div>
                      <button
                        onClick={() => {
                          removeById(it.id);
                          refreshOutbox();
                        }}
                        className="px-2 py-1 rounded border text-sm
                                   border-rose-300 bg-rose-50 hover:bg-rose-100 text-rose-700
                                   dark:border-rose-600/40 dark:bg-rose-500/10 dark:hover:bg-rose-500/20 dark:text-rose-300"
                      >
                        Quitar
                      </button>
                    </li>
                  ))}
                </ul>
                <div className="flex justify-end gap-3">
                  <button onClick={transmitNow} disabled={syncing} className="btn-neon">
                    {syncing ? "Transmitiendo…" : "Transmitir ahora"}
                  </button>
                </div>
              </>
            )}
          </section>
        )}

        {/* BASE OFFLINE */}
        {tab === "dump" && (
          <section className={cardClass}>
            <div className="flex items-center justify-between gap-4 mb-4">
              <h3 className="font-semibold text-lg">Base de datos offline</h3>
              <span className="text-sm opacity-70">
                {getOutbox().length} check-ins almacenados
              </span>
            </div>

            {getOutbox().length === 0 ? (
              <div className="text-slate-600 dark:text-white/80 mb-4">
                No hay información offline guardada en este dispositivo.
              </div>
            ) : (
              <>
                <p className="text-sm text-slate-600 dark:text-white/70 mb-3">
                  Esto es lo que se enviará al servidor. Incluye check-ins, progreso, datos del
                  guardia y algunos registros locales.
                </p>

                <div className="grid md:grid-cols-2 gap-4 mb-4">
                  <div className="rounded-lg bg-slate-100/70 dark:bg-white/5 p-3">
                    <h4 className="font-medium mb-2">Progreso guardado</h4>
                    <p className="text-sm">
                      Último punto:{" "}
                      <strong>{localStorage.getItem("rondasqr:lastPointName") || "—"}</strong>
                    </p>
                    <p className="text-sm">
                      Siguiente:{" "}
                      <strong>{localStorage.getItem("rondasqr:nextPointName") || "—"}</strong>
                    </p>
                    <p className="text-sm">
                      % completado:{" "}
                      <strong>{Number(localStorage.getItem("rondasqr:progressPct") || 0)}%</strong>
                    </p>
                  </div>

                  <div className="rounded-lg bg-slate-100/70 dark:bg-white/5 p-3 space-y-1">
                    <h4 className="font-medium mb-2">Dispositivo / Usuario</h4>
                    <p className="text-sm break-all">
                      UA:{" "}
                      <span className="opacity-70">
                        {typeof navigator !== "undefined" ? navigator.userAgent : ""}
                      </span>
                    </p>
                    <p className="text-sm">
                      Online:{" "}
                      <strong>
                        {typeof navigator !== "undefined" && navigator.onLine ? "sí" : "no"}
                      </strong>
                    </p>
                    <p className="text-sm">
                      Usuario: <strong>{user?.email || user?.name || "—"}</strong>
                    </p>
                  </div>
                </div>

                {readJsonLS("rondasqr:assignments", []).length > 0 && (
                  <div className="mb-4">
                    <h4 className="font-medium mb-2">Asignaciones locales</h4>
                    <ul className="text-sm list-disc list-inside space-y-1">
                      {readJsonLS("rondasqr:assignments", []).map((a, idx) => (
                        <li key={idx}>
                          {a.roundName || a.roundId || "Ronda"} — guardia: {a.guardId || "?"} —
                          fecha: {a.date || "?"}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                {readJsonLS("rondasqr:logs", []).length > 0 && (
                  <div className="mb-4">
                    <h4 className="font-medium mb-2">Logs locales</h4>
                    <pre className="text-xs bg-black/5 dark:bg-white/5 rounded p-2 max-h-40 overflow-auto">
                      {JSON.stringify(readJsonLS("rondasqr:logs", []), null, 2)}
                    </pre>
                  </div>
                )}

                <div className="mb-4">
                  <h4 className="font-medium mb-2">Check-ins en memoria</h4>
                  <ul className="divide-y divide-slate-200 dark:divide-white/10">
                    {getOutbox().map((it) => (
                      <li key={it.id} className="py-2 text-sm flex justify-between gap-4">
                        <div>
                          <div className="font-medium">{it.qr}</div>
                          <div className="opacity-70">
                            {new Date(it.at).toLocaleString()}
                            {it.gps
                              ? ` • (${it.gps.lat?.toFixed?.(4)}, ${it.gps.lon?.toFixed?.(4)})`
                              : ""}
                          </div>
                        </div>
                        <button
                          onClick={() => {
                            removeById(it.id);
                            nav("/rondasqr/scan/dump", { replace: true });
                          }}
                          className="px-2 py-1 rounded bg-rose-500 text-white text-xs"
                        >
                          Quitar
                        </button>
                      </li>
                    ))}
                  </ul>
                </div>
              </>
            )}

            <div className="flex justify-end gap-3">
              <button onClick={() => nav("/rondasqr/scan")} className={neutralBtn}>
                Volver
              </button>
              <button
                onClick={sendOfflineDump}
                className="btn-neon btn-neon-green"
                disabled={getOutbox().length === 0}
              >
                Enviar base de datos
              </button>
            </div>
          </section>
        )}

        {/* MENSAJE legacy (ya redirigimos arriba, pero lo dejamos por si acaso) */}
        {tab === "msg" && (
          <section className={cardClass}>
            <h3 className="text-lg font-semibold mb-3">Mensaje / Incidente</h3>
            <textarea
              className="w-full rounded-lg px-3 py-2 border bg-slate-50 text-slate-800 placeholder-slate-400
                         border-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-300
                         dark:bg-black/30 dark:text-white dark:placeholder-white/60 dark:border-white/10"
              rows={5}
              placeholder="Describa el incidente..."
              value={msg}
              onChange={(e) => setMsg(e.target.value)}
            />
            <div className="mt-4 flex justify-end gap-3">
              <button onClick={() => nav("/rondasqr/scan")} className={neutralBtn}>
                Cancelar
              </button>
              <button onClick={sendMessage} disabled={sendingMsg} className="btn-neon">
                {sendingMsg ? "Enviando…" : "Enviar"}
              </button>
            </div>
          </section>
        )}

        {/* FOTOS */}
        {tab === "fotos" && (
          <section className={cardClass}>
            <h3 className="font-semibold text-lg mb-3">Enviar Fotos</h3>
            <PhotoPicker photos={photos} setPhotos={setPhotos} />
            <div className="mt-4 flex justify-end gap-3">
              <button onClick={() => nav("/rondasqr/scan")} className={neutralBtn}>
                Cancelar
              </button>
              <button onClick={sendPhotos} disabled={sendingPhotos} className="btn-neon">
                {sendingPhotos ? "Enviando…" : "Enviar"}
              </button>
            </div>
          </section>
        )}
      </main>
    </div>
  );
}

/* ========== subcomponentes ========== */
function PhotoPicker({ photos, setPhotos }) {
  return (
    <>
      {photos.map((f, i) => (
        <div key={i} className="flex items-center justify-between mb-2">
          <span className="text-sm text-slate-700 dark:text-white/90">Toma foto {i + 1}</span>
          <div className="flex gap-2">
            <input
              type="file"
              accept="image/*"
              onChange={async (e) => {
                const file = e.target.files?.[0];
                if (!file) return;
                const base64 = await fileToBase64(file);
                setPhotos((p) => {
                  const n = [...p];
                  n[i] = base64;
                  return n;
                });
              }}
              className="hidden"
              id={`foto-${i}`}
            />
            <label
              htmlFor={`foto-${i}`}
              className="px-3 py-1 rounded-md text-white bg-indigo-600 hover:bg-indigo-500 cursor-pointer"
            >
              Seleccionar
            </label>
            <button
              onClick={() => setPhotos((p) => p.map((f2, idx) => (idx === i ? null : f2)))}
              className="px-3 py-1 rounded-md text-white bg-rose-600 hover:bg-rose-500"
            >
              Eliminar
            </button>
          </div>
        </div>
      ))}
    </>
  );
}

function fileToBase64(file) {
  return new Promise((resolve, reject) => {
    const r = new FileReader();
    r.onload = () => resolve(r.result);
    r.onerror = reject;
    r.readAsDataURL(file);
  });
}
