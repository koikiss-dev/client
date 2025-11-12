// src/modules/rondasqr/supervisor/ReportsPage.jsx
import React, { useEffect, useLayoutEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { rondasqrApi } from "../api/rondasqrApi";
import ReportSummary from "./ReportSummary";
import OmissionsTable from "./OmissionsTable";
import MessagesTable from "./MessagesTable";
import DetailedMarks from "./DetailedMarks";
import MapView from "./MapView";

const ROOT = (import.meta.env.VITE_API_BASE_URL || "http://localhost:4000").replace(/\/$/, "");

function today() {
  return new Date().toISOString().slice(0, 10);
}

/* =============== helpers para banner suave ================= */
function hexToRgba(hex, a = 0.16) {
  if (!hex) return `rgba(0,0,0,${a})`;
  const c = hex.replace("#", "");
  const n = c.length === 3 ? c.split("").map((x) => x + x).join("") : c.slice(0, 6);
  const r = parseInt(n.slice(0, 2), 16);
  const g = parseInt(n.slice(2, 4), 16);
  const b = parseInt(n.slice(4, 6), 16);
  return `rgba(${r}, ${g}, ${b}, ${a})`;
}
function readVar(name, fallback) {
  const v = getComputedStyle(document.documentElement).getPropertyValue(name).trim();
  return v || fallback;
}
/* =========================================================== */

/** Portal simple que posiciona un menú justo debajo de un anchor */
function DropdownPortal({ anchorRef, open, onClose, children, gap = 8 }) {
  const [pos, setPos] = useState({ top: 0, left: 0, width: 240 });

  useLayoutEffect(() => {
    if (!open || !anchorRef?.current) return;
    const rect = anchorRef.current.getBoundingClientRect();
    const scrollX = window.scrollX || window.pageXOffset;
    const scrollY = window.scrollY || window.pageYOffset;
    const maxWidth = 300;
    const width = Math.min(Math.max(rect.width, 176), maxWidth);
    setPos({
      top: rect.bottom + gap + scrollY,
      left: rect.right - width + scrollX,
      width,
    });
  }, [open, anchorRef, gap]);

  useEffect(() => {
    if (!open) return;
    const recalc = () => {
      if (!anchorRef?.current) return;
      const rect = anchorRef.current.getBoundingClientRect();
      const scrollX = window.scrollX || window.pageXOffset;
      const scrollY = window.scrollY || window.pageYOffset;
      const width = Math.min(Math.max(rect.width, 176), 300);
      setPos({ top: rect.bottom + gap + scrollY, left: rect.right - width + scrollX, width });
    };
    window.addEventListener("resize", recalc);
    window.addEventListener("scroll", recalc, true);
    return () => {
      window.removeEventListener("resize", recalc);
      window.removeEventListener("scroll", recalc, true);
    };
  }, [open, anchorRef, gap]);

  if (!open) return null;

  return createPortal(
    <>
      <div onClick={onClose} className="fixed inset-0 z-[1990] bg-black/40" aria-hidden="true" />
      <div
        className="fixed z-[2001] rounded-md border border-white/15 bg-neutral-900 text-white
                   shadow-2xl ring-1 ring-black/40 overflow-hidden"
        style={{ top: pos.top, left: pos.left, width: pos.width }}
      >
        {children}
      </div>
    </>,
    document.body
  );
}

export default function ReportsPage() {
  // Filtros (el backend espera la clave 'officer')
  const [f, setF] = useState({
    from: today(),
    to: today(),
    siteId: "",
    roundId: "",
    officer: "",
  });

  const [data, setData] = useState({
    stats: [],
    omissions: [],
    messages: [],
    detailed: [],
  });

  const [loading, setLoading] = useState(false);
  const [downloading, setDownloading] = useState(false);

  // Catálogos para selects
  const [sites, setSites] = useState([]);
  const [rounds, setRounds] = useState([]);

  // Cargar sitios al montar
  useEffect(() => {
    (async () => {
      try {
        const s = await rondasqrApi.listSites();
        setSites(s?.items || []);
      } catch (e) {
        console.warn("[ReportsPage] listSites error:", e);
      }
    })();
  }, []);

  // Cargar rondas cuando cambia siteId
  useEffect(() => {
    (async () => {
      if (!f.siteId) {
        setRounds([]);
        setF((prev) => ({ ...prev, roundId: "" }));
        return;
      }
      try {
        const r = await rondasqrApi.listRounds(f.siteId);
        setRounds(r?.items || []);
      } catch (e) {
        console.warn("[ReportsPage] listRounds error:", e);
      }
    })();
  }, [f.siteId]);

  async function load() {
    setLoading(true);
    try {
      const s = await rondasqrApi.getSummary(f);
      const d = await rondasqrApi.getDetailed(f);
      setData({
        stats: s?.stats || [],
        omissions: s?.omissions || [],
        messages: s?.messages || [],
        detailed: d?.items || [],
      });
    } catch (e) {
      console.warn("[ReportsPage] load error:", e);
    } finally {
      setLoading(false);
    }
  }

  // carga inicial
  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const setField = (k) => (e) => setF((prev) => ({ ...prev, [k]: e.target.value }));

  /* ---------- Menú Exportar ---------- */
  const [openMenu, setOpenMenu] = useState(false);
  const exportBtnRef = useRef(null);

  async function openFirstOk(urls) {
    for (const url of urls) {
      try {
        const ok = await rondasqrApi.ping(url);
        if (ok) {
          window.open(url, "_blank", "noreferrer");
          return true;
        }
      } catch {}
    }
    return false;
  }

  async function doExcel() {
    try {
      setDownloading(true);
      const qs = new URLSearchParams(f).toString();
      const candidates = [
        rondasqrApi.xlsxUrl(f),
        `${ROOT}/api/rondasqr/v1/reports/export/xlsx?${qs}`,
        `${ROOT}/api/rondasqr/v1/reports/xlsx?${qs}`,
        `${ROOT}/api/rondasqr/v1/reports/excel?${qs}`,
      ];
      const ok = await openFirstOk(candidates);
      if (!ok) alert("HTTP 404 - No se encontró endpoint de Excel. Verifica la ruta en el servidor.");
    } finally {
      setDownloading(false);
      setOpenMenu(false);
    }
  }

  async function doPdf() {
    try {
      setDownloading(true);
      const qs = new URLSearchParams(f).toString();
      const candidates = [
        rondasqrApi.pdfUrl(f),
        `${ROOT}/api/rondasqr/v1/reports/pdf?${qs}`,
        `${ROOT}/api/rondasqr/v1/reports/export/report.pdf?${qs}`,
      ];
      const ok = await openFirstOk(candidates);
      if (!ok) alert("HTTP 404 - No se encontró endpoint de PDF. Verifica la ruta en el servidor.");
    } finally {
      setDownloading(false);
      setOpenMenu(false);
    }
  }

  function doCsv() {
    window.open(rondasqrApi.csvUrl(f), "_blank", "noreferrer");
    setOpenMenu(false);
  }
  function doKml() {
    window.open(rondasqrApi.kmlUrl(f), "_blank", "noreferrer");
    setOpenMenu(false);
  }
  /* ----------------------------------- */

  // Banner suave: toma variables del tema
  const fromVar = readVar("--accent-from", "#38bdf8");
  const toVar = readVar("--accent-to", "#22d3ee");
  const alphaVar = parseFloat(readVar("--accent-alpha", "0.16")) || 0.16;
  const bannerStyle = {
    background: `linear-gradient(90deg, ${hexToRgba(fromVar, alphaVar)} 0%, ${hexToRgba(toVar, alphaVar)} 100%)`,
  };

  return (
    <div className="px-4 py-5 space-y-5">
      {/* Encabezado */}
      <div className="rounded-xl px-4 py-3 md:px-5 md:py-4" style={bannerStyle}>
        <h1 className="text-2xl md:text-3xl font-bold leading-tight tracking-tight">Informes</h1>
        <p className="opacity-90 text-sm md:text-base">Resumen de rondas, omisiones e incidentes</p>
      </div>

      {/* Filtros */}
      <div className="rounded-2xl border border-white/10 bg-white/5 backdrop-blur p-3 shadow-lg">
        <div className="grid md:grid-cols-6 gap-2 items-end">
          <div className="flex flex-col">
            <label className="text-[11px] text-white/70 mb-1">Desde</label>
            <input
              type="date"
              value={f.from}
              onChange={setField("from")}
              className="bg-black/30 border border-white/10 rounded-lg px-3 py-1.5 text-sm"
            />
          </div>

          <div className="flex flex-col">
            <label className="text-[11px] text-white/70 mb-1">Hasta</label>
            <input
              type="date"
              value={f.to}
              onChange={setField("to")}
              className="bg-black/30 border border-white/10 rounded-lg px-3 py-1.5 text-sm"
            />
          </div>

          <div className="flex flex-col">
            <label className="text-[11px] text-white/70 mb-1">Sitio (opcional)</label>
            <select
              value={f.siteId}
              onChange={setField("siteId")}
              className="bg-black/30 border border-white/10 rounded-lg px-3 py-1.5 text-sm"
            >
              <option value="">Todos</option>
              {sites.map((s) => (
                <option key={s._id} value={s._id}>
                  {s.name}
                </option>
              ))}
            </select>
          </div>

          <div className="flex flex-col">
            <label className="text-[11px] text-white/70 mb-1">Ronda (opcional)</label>
            <select
              value={f.roundId}
              onChange={setField("roundId")}
              disabled={!f.siteId}
              className="bg-black/30 border border-white/10 rounded-lg px-3 py-1.5 text-sm disabled:opacity-50"
            >
              <option value="">Todas</option>
              {rounds.map((r) => (
                <option key={r._id} value={r._id}>
                  {r.name}
                </option>
              ))}
            </select>
          </div>

          <div className="flex flex-col">
            <label className="text-[11px] text-white/70 mb-1">Oficial (opcional)</label>
            <input
              placeholder="correo / nombre / guardId"
              value={f.officer}
              onChange={setField("officer")}
              className="bg-black/30 border border-white/10 rounded-lg px-3 py-1.5 text-sm"
            />
          </div>

          <div className="flex gap-2 items-end">
            <button
              onClick={load}
              className="px-3 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-500 text-white text-sm shadow disabled:opacity-70"
              disabled={loading}
            >
              {loading ? "Consultando…" : "Consultar"}
            </button>

            {/* Botón Exportar con caret (anchor del portal) */}
            <button
              ref={exportBtnRef}
              type="button"
              onClick={() => setOpenMenu((o) => !o)}
              disabled={downloading}
              className="px-3 py-1.5 rounded-lg border border-white/20 bg-white/10 hover:bg-white/20 text-white text-sm"
              title="Exportar"
            >
              {downloading ? "Exportando…" : "Exportar ▾"}
            </button>
          </div>
        </div>
      </div>

      {/* Menú exportar en PORTAL */}
      <DropdownPortal anchorRef={exportBtnRef} open={openMenu} onClose={() => setOpenMenu(false)}>
        <button className="w-full text-left px-3 py-2 hover:bg-neutral-800 text-sm" onClick={doExcel} disabled={downloading}>
          Excel (.xlsx)
        </button>
        <button className="w-full text-left px-3 py-2 hover:bg-neutral-800 text-sm" onClick={doPdf} disabled={downloading}>
          PDF (.pdf)
        </button>
        <button className="w-full text-left px-3 py-2 hover:bg-neutral-800 text-sm" onClick={doCsv}>
          CSV (.csv)
        </button>
        <button className="w-full text-left px-3 py-2 hover:bg-neutral-800 text-sm" onClick={doKml}>
          KML (.kml)
        </button>
      </DropdownPortal>

      {/* Secciones de reporte */}
      <ReportSummary stats={data.stats} />
      <OmissionsTable items={data.omissions} />
      <MessagesTable items={data.messages} />
      {/* DetailedMarks debe ya mostrar startTime, endTime y onWindow que trae el backend */}
      <DetailedMarks items={data.detailed} />

      {/* Mapa embebido */}
      <div className="rounded-2xl border border-white/10 bg-white/5 backdrop-blur p-3 shadow-lg">
        <h3 className="font-semibold text-base mb-2">Mapa</h3>
        <MapView items={data.detailed} />
      </div>
    </div>
  );
}
