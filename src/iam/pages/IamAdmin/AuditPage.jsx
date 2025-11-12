
import React, { useEffect, useState, useMemo, useState as useStateAlt } from "react";
import { iamApi } from "../../api/iamApi.js";
import { saveAs } from "file-saver";
import * as XLSX from "xlsx";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";

// Valores reales que guarda el backend
const ACTIONS = ["", "create", "update", "activate", "deactivate", "delete"];
const ENTITIES = ["", "user", "role", "permission"];

// Etiquetas en español
const ACTION_LABEL = {
  create: "creación",
  update: "actualización",
  activate: "activación",
  deactivate: "desactivación",
  delete: "eliminación",
};
const ENTITY_LABEL = {
  user: "Usuario",
  role: "Rol",
  permission: "Permiso",
};
const KEY_LABEL = {
  name: "Nombre",
  email: "Correo",
  active: "Activo",
  roles: "Roles",
  perms: "Permisos",
  permissions: "Permisos",
  provider: "Proveedor",
};

// --- Componente para truncar texto largo ---
function Truncate({ children, max = 220 }) {
  const [open, setOpen] = useStateAlt(false);
  const text = typeof children === "string" ? children : String(children ?? "");
  if (text.length <= max) return <>{text}</>;
  return (
    <span className="inline">
      {open ? text : text.slice(0, max) + "…"}{" "}
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="text-sky-300 hover:underline text-[11px]"
      >
        {open ? "ver menos" : "ver más"}
      </button>
    </span>
  );
}

// --- Render de valores bonitos ---
function fmtValue(v) {
  if (v === null || v === undefined) return "—";
  if (typeof v === "boolean") {
    return (
      <span
        className={`inline-flex items-center px-2 py-0.5 rounded-full text-[11px] ${
          v
            ? "bg-emerald-600/20 text-emerald-300 ring-1 ring-emerald-500/30"
            : "bg-rose-600/20 text-rose-300 ring-1 ring-rose-500/30"
        }`}
      >
        {v ? "Sí" : "No"}
      </span>
    );
  }
  if (Array.isArray(v)) {
    if (v.length === 0) return "—";
    return (
      <div className="flex flex-wrap gap-1">
        {v.map((x, i) => (
          <span
            key={i}
            className="px-2 py-0.5 rounded-full text-[11px] bg-white/5 ring-1 ring-white/10"
          >
            {String(x)}
          </span>
        ))}
      </div>
    );
  }
  if (typeof v === "object") {
    const entries = Object.entries(v);
    if (entries.length === 0) return "—";
    // Para objetos anidados, mostramos compacto
    return (
      <Truncate max={260}>
        {entries
          .map(
            ([k, val]) =>
              `${KEY_LABEL[k] || k}: ${
                typeof val === "object" ? JSON.stringify(val) : String(val)
              }`
          )
          .join(" · ")}
      </Truncate>
    );
  }
  return String(v);
}

// --- Detección de cambios campo a campo ---
function diffKeys(before = {}, after = {}) {
  const keys = new Set([...Object.keys(before || {}), ...Object.keys(after || {})]);
  return [...keys];
}

// Caja “bonita” para Antes/Después. En “Después” resalta cambios.
function PrettyBox({ obj, compareWith, emphasizeChanges = false }) {
  if (!obj || (typeof obj === "object" && Object.keys(obj).length === 0))
    return <span className="text-slate-400">—</span>;

  if (typeof obj !== "object" || Array.isArray(obj)) {
    return <div className="text-slate-200">{fmtValue(obj)}</div>;
  }

  const keys = diffKeys(compareWith, obj);
  return (
    <div className="space-y-1">
      {keys.map((k) => {
        const changed =
          emphasizeChanges &&
          JSON.stringify((compareWith || {})[k]) !== JSON.stringify(obj[k]);
        return (
          <div
            key={k}
            className={`flex gap-2 ${
              changed ? "bg-emerald-500/5 ring-1 ring-emerald-500/20 rounded-md px-2 py-1" : ""
            }`}
          >
            <span className="shrink-0 text-slate-300">
              {KEY_LABEL[k] || k}:
            </span>
            <div className="text-slate-200">{fmtValue(obj[k])}</div>
          </div>
        );
      })}
    </div>
  );
}

// Para exportar valores legibles
const toPlain = (v) =>
  typeof v === "boolean"
    ? v ? "Sí" : "No"
    : Array.isArray(v)
    ? v.join(", ")
    : v && typeof v === "object"
    ? Object.entries(v)
        .map(([k, val]) => `${KEY_LABEL[k] || k}: ${typeof val === "object" ? JSON.stringify(val) : String(val)}`)
        .join(" | ")
    : v ?? "—";

export default function AuditPage() {
  const [audits, setAudits] = useState([]);
  const [filtered, setFiltered] = useState([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState("");

  // Filtros
  const [filterAction, setFilterAction] = useState("");
  const [filterEntity, setFilterEntity] = useState("");
  const [filterActor, setFilterActor] = useState("");
  const [dateFrom, setDateFrom] = useState(""); // YYYY-MM-DD
  const [dateTo, setDateTo] = useState("");     // YYYY-MM-DD
  const [dateErr, setDateErr] = useState("");

  // -------- Fetch (consulta real al backend con filtros) ----------
  async function fetchAudits() {
    try {
      setErr("");
      setLoading(true);

      if (dateFrom && dateTo && new Date(dateFrom) > new Date(dateTo)) {
        setDateErr("La fecha 'desde' no puede ser mayor que 'hasta'.");
        setAudits([]);
        setFiltered([]);
        return;
      }
      setDateErr("");

      const params = {};
      if (filterAction) params.action = filterAction;
      if (filterEntity) params.entity = filterEntity;
      if (filterActor)  params.actor  = filterActor;
      if (dateFrom)     params.from   = dateFrom;
      if (dateTo)       params.to     = dateTo;
      params.limit = 500;

      const res = await iamApi.listAudit(params);

      const raw =
        (Array.isArray(res?.data) && res.data) ||
        (Array.isArray(res?.items) && res.items) ||
        (Array.isArray(res?.data?.items) && res.data.items) ||
        [];

      const items = raw.map((x) => ({
        _id: x._id,
        createdAt: x.createdAt || x.ts || null,
        action: x.action || "",
        entity: x.entity || "",
        actorEmail: x.actorEmail || x.actor || x.actorId || "",
        before: x.before ?? null,
        after: x.after ?? null,
      }));

      setAudits(items);
      setFiltered(items);
    } catch (e) {
      setErr(e?.message || "No se pudo cargar el historial de auditoría");
      setAudits([]);
      setFiltered([]);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { fetchAudits(); }, []);

  // -------- Helpers de fecha ----------
  const toStartOfDay = (s) => (s ? new Date(`${s}T00:00:00`) : null);
  const toEndOfDay   = (s) => (s ? new Date(`${s}T23:59:59.999`) : null);

  // -------- Filters locales ----------
  useEffect(() => {
    let list = [...audits];

    const from = toStartOfDay(dateFrom);
    const to   = toEndOfDay(dateTo);

    if (from && to && from > to) setDateErr("La fecha 'desde' no puede ser mayor que 'hasta'.");
    else setDateErr("");

    if (from)
      list = list.filter((a) => (a.createdAt ? new Date(a.createdAt).getTime() : 0) >= from.getTime());
    if (to)
      list = list.filter((a) => (a.createdAt ? new Date(a.createdAt).getTime() : 0) <= to.getTime());
    if (filterAction) list = list.filter((a) => a.action === filterAction);
    if (filterEntity) list = list.filter((a) => a.entity === filterEntity);
    if (filterActor)
      list = list.filter((a) => (a.actorEmail || "").toLowerCase().includes(filterActor.toLowerCase()));

    setFiltered(list);
  }, [filterAction, filterEntity, filterActor, dateFrom, dateTo, audits]);

  // -------- Export Excel ----------
  const exportExcel = () => {
    const rows = filtered.map((a) => ({
      Fecha: a.createdAt ? new Date(a.createdAt).toLocaleString() : "",
      Acción: ACTION_LABEL[a.action] || a.action,
      Entidad: ENTITY_LABEL[a.entity] || a.entity,
      Actor: a.actorEmail || "",
      Antes: a.before ? toPlain(a.before) : "",
      Después: a.after ? toPlain(a.after) : "",
    }));
    const ws = XLSX.utils.json_to_sheet(rows);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Auditoría");
    const buf = XLSX.write(wb, { bookType: "xlsx", type: "array" });
    saveAs(new Blob([buf], { type: "application/octet-stream" }), `Historial_Auditoria_${Date.now()}.xlsx`);
  };

  // -------- Export PDF ----------
  const exportPDF = async () => {
    const doc = new jsPDF({ orientation: "landscape", unit: "pt", format: "a4" });
    const marginX = 40;
    const marginY = 32;
    const generatedAt = new Date().toLocaleString();

    doc.setFontSize(14);
    doc.text("Sistema SENAF - Historial de Auditoría", marginX, marginY);
    doc.setFontSize(10);
    doc.text(`Generado: ${generatedAt}`, marginX, marginY + 12);

    let rango = "";
    if (dateFrom && dateTo) rango = `Rango: ${dateFrom} → ${dateTo}`;
    else if (dateFrom) rango = `Desde: ${dateFrom}`;
    else if (dateTo) rango = `Hasta: ${dateTo}`;
    if (rango) doc.text(rango, doc.internal.pageSize.getWidth() - marginX, marginY + 12, { align: "right" });

    const body = filtered.map((a) => [
      a.createdAt ? new Date(a.createdAt).toLocaleString() : "",
      ACTION_LABEL[a.action] || a.action,
      ENTITY_LABEL[a.entity] || a.entity,
      a.actorEmail || "",
      a.before ? toPlain(a.before) : "",
      a.after ? toPlain(a.after) : "",
    ]);

    autoTable(doc, {
      startY: marginY + 22,
      head: [["Fecha", "Acción", "Entidad", "Actor", "Antes", "Después"]],
      body,
      styles: { fontSize: 9, cellPadding: 4 },
      headStyles: { fillColor: [32, 32, 32] },
    });
    doc.save(`Historial_Auditoria_${Date.now()}.pdf`);
  };

  // -------- UI helpers ----------
  const zebra = useMemo(
    () => filtered.map((_, i) => (i % 2 === 0 ? "bg-white/5" : "bg-white/[0.03]")),
    [filtered]
  );

  return (
    <div className="min-h-[calc(100vh-4rem)] relative">
      {/* Fondo */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 opacity-70"
        style={{
          background:
            "radial-gradient(1000px 600px at 10% 10%, rgba(0,255,255,0.08), transparent 60%), radial-gradient(800px 500px at 90% 20%, rgba(168,85,247,0.10), transparent 60%)",
        }}
      />

      <div className="relative z-10 space-y-6 p-4 md:p-6">
        {/* HEADER */}
        <div className="rounded-2xl border border-gray-700/40 bg-neutral-900/80 backdrop-blur-md p-6 shadow-[0_0_30px_rgba(0,0,0,0.2)]">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <div>
              <h1 className="text-3xl font-semibold text-slate-100">Historial de Auditoría</h1>
              <p className="text-sm text-slate-400">Bitácora de acciones sobre usuarios, roles y permisos</p>
            </div>
            <div className="flex gap-2">
              <button onClick={fetchAudits} className="px-3 py-2 rounded-lg bg-slate-800 text-white hover:bg-slate-700">
                Actualizar
              </button>
              <button onClick={exportExcel} className="px-3 py-2 rounded-lg bg-emerald-600 text-white hover:bg-emerald-500" disabled={!!dateErr} title={dateErr || ""}>
                Excel
              </button>
              <button onClick={exportPDF} className="px-3 py-2 rounded-lg bg-rose-600 text-white hover:bg-rose-500" disabled={!!dateErr} title={dateErr || ""}>
                PDF
              </button>
            </div>
          </div>

          {/* Filtros */}
          <div className="mt-4 grid grid-cols-1 md:grid-cols-5 gap-3">
            <select className="bg-neutral-800 border border-gray-700 rounded-lg px-3 py-2 text-slate-200 focus:outline-none"
              value={filterAction} onChange={(e) => setFilterAction(e.target.value)}>
              {ACTIONS.map((a, idx) => (
                <option key={idx} value={a}>{a ? ACTION_LABEL[a] : "Todas las acciones"}</option>
              ))}
            </select>

            <select className="bg-neutral-800 border border-gray-700 rounded-lg px-3 py-2 text-slate-200 focus:outline-none"
              value={filterEntity} onChange={(e) => setFilterEntity(e.target.value)}>
              {ENTITIES.map((e, idx) => (
                <option key={idx} value={e}>{e ? ENTITY_LABEL[e] : "Todas las entidades"}</option>
              ))}
            </select>

            <input type="text" placeholder="Buscar actor…" className="bg-neutral-800 border border-gray-700 rounded-lg px-3 py-2 text-slate-200 placeholder-slate-500 focus:outline-none"
              value={filterActor} onChange={(e) => setFilterActor(e.target.value)} />

            <input type="date" className="bg-neutral-800 border border-gray-700 rounded-lg px-3 py-2 text-slate-200 focus:outline-none"
              value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} />
            <input type="date" className="bg-neutral-800 border border-gray-700 rounded-lg px-3 py-2 text-slate-200 focus:outline-none"
              value={dateTo} onChange={(e) => setDateTo(e.target.value)} />
          </div>

          {dateErr && <div className="mt-2 text-xs text-rose-300">{dateErr}</div>}
        </div>

        {/* TABLA */}
        <div className="rounded-2xl border border-gray-700/40 bg-neutral-900/80 backdrop-blur-md overflow-hidden shadow-[0_0_30px_rgba(0,0,0,0.2)]">
          {err && <div className="p-3 text-rose-300 text-sm">{err}</div>}

          <div className="overflow-auto">
            <table className="min-w-full text-sm text-slate-200">
              <thead className="sticky top-0 bg-neutral-800/95 backdrop-blur">
                <tr className="[&>th]:px-3 [&>th]:py-2 [&>th]:font-semibold border-b border-gray-700/60">
                  <th>Fecha</th>
                  <th>Acción</th>
                  <th>Entidad</th>
                  <th>Actor</th>
                  <th>Antes</th>
                  <th>Después</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr><td colSpan="6" className="text-center py-12 text-slate-400">Cargando…</td></tr>
                ) : filtered.length === 0 ? (
                  <tr><td colSpan="6" className="text-center py-12 text-slate-400">Sin registros</td></tr>
                ) : (
                  filtered.map((a, i) => (
                    <tr key={a._id || i} className={`${zebra[i]} hover:bg-slate-800/50 transition-colors border-b border-gray-800`}>
                      <td className="px-3 py-2 text-slate-300">{a.createdAt ? new Date(a.createdAt).toLocaleString() : ""}</td>
                      <td className="px-3 py-2">
                        <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-white/5 text-slate-200 ring-1 ring-white/10">
                          {ACTION_LABEL[a.action] || a.action}
                        </span>
                      </td>
                      <td className="px-3 py-2">{ENTITY_LABEL[a.entity] || a.entity || "—"}</td>
                      <td className="px-3 py-2 text-slate-300">{a.actorEmail || "—"}</td>

                      {/* Antes */}
                      <td className="px-3 py-2 text-xs text-slate-300 whitespace-pre-wrap align-top">
                        <PrettyBox obj={a.before} compareWith={a.after} emphasizeChanges={false} />
                      </td>

                      {/* Después (resalta cambios) */}
                      <td className="px-3 py-2 text-xs text-slate-300 whitespace-pre-wrap align-top">
                        <PrettyBox obj={a.after} compareWith={a.before} emphasizeChanges={true} />
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          <div className="px-4 py-3 text-[12px] text-slate-400 border-t border-gray-800">
            Mostrando <span className="text-slate-200">{filtered.length}</span> de{" "}
            <span className="text-slate-200">{audits.length}</span> registros totales
            {dateFrom || dateTo ? <> · rango aplicado {dateFrom || "—"} → {dateTo || "—"}</> : null}
          </div>
        </div>
      </div>
    </div>
  );
}
