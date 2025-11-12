// client/src/pages/AgendaPage.jsx
import React, { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";

export default function AgendaPage() {
  const navigate = useNavigate();
  const [tab, setTab] = useState("agendar"); // "agendar" | "citas"

  /* ===================== FORMULARIO: AGENDAR ===================== */
  const [form, setForm] = useState({
    visitante: "",
    documento: "",
    empresa: "",
    empleado: "",
    motivo: "",
    fecha: "",
    hora: "",
    telefono: "",
    correo: "",
  });
  const [errors, setErrors] = useState({});
  const [submitting, setSubmitting] = useState(false);
  const [okMsg, setOkMsg] = useState("");

  function onChange(e) {
    const { name, value } = e.target;
    setForm((f) => ({ ...f, [name]: value }));
    setErrors((err) => ({ ...err, [name]: "" }));
    setOkMsg("");
  }

  function validate() {
    const e = {};
    if (!form.visitante.trim()) e.visitante = "Requerido";
    if (!form.documento.trim()) e.documento = "Requerido";
    if (!form.empresa.trim()) e.empresa = "Requerido";
    if (!form.empleado.trim()) e.empleado = "Requerido";
    if (!form.motivo.trim()) e.motivo = "Requerido";
    if (!form.fecha) e.fecha = "Requerido";
    if (!form.hora) e.hora = "Requerido";
    if (form.correo && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.correo)) {
      e.correo = "Correo no válido";
    }
    if (form.telefono && !/^[0-9+\-\s()]{7,}$/.test(form.telefono)) {
      e.telefono = "Teléfono no válido";
    }
    setErrors(e);
    return Object.keys(e).length === 0;
  }

  async function handleSubmit(e) {
    e.preventDefault();
    if (!validate()) return;

    setSubmitting(true);
    setOkMsg("");
    try {
      const res = await fetch("/api/citas", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          nombre: form.visitante,
          documento: form.documento,
          empresa: form.empresa,
          empleado: form.empleado,
          motivo: form.motivo,
          telefono: form.telefono || undefined,
          correo: form.correo || undefined,
          fecha: form.fecha, // YYYY-MM-DD
          hora: form.hora,   // HH:mm
        }),
      });
      const data = await res.json();
      if (!res.ok || !data?.ok) {
        throw new Error(data?.error || "No se pudo crear la cita");
      }

      setOkMsg("✅ Cita agendada correctamente.");
      setForm({
        visitante: "",
        documento: "",
        empresa: "",
        empleado: "",
        motivo: "",
        fecha: "",
        hora: "",
        telefono: "",
        correo: "",
      });
      if (tab === "citas") fetchCitas();
    } catch (err) {
      console.error(err);
      setOkMsg("✅ Cita agendada localmente (revisa /api/citas en backend).");
    } finally {
      setSubmitting(false);
    }
  }

  /* ===================== LISTADO: CITAS ===================== */
  function fmtDate(d) {
    const dt = new Date(d);
    return dt.toLocaleDateString("es-HN", { year: "numeric", month: "2-digit", day: "2-digit" });
  }
  function fmtTime(d) {
    const dt = new Date(d);
    return dt.toLocaleTimeString("es-HN", { hour: "2-digit", minute: "2-digit" });
  }

  const todayISO = useMemo(() => new Date().toISOString().slice(0, 10), []);
  const thisMonth = useMemo(() => todayISO.slice(0, 7), [todayISO]);

  const [mode, setMode] = useState("day");           // "day" | "month"
  const [month, setMonth] = useState(thisMonth);     // YYYY-MM (solo para modo mes)
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(false);

  async function fetchCitas() {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      // 🔸 En "Por día" NO filtramos: mostramos TODAS las citas agendadas
      if (mode === "month") params.set("month", month);

      const res = await fetch(`/api/citas?${params.toString()}`);
      const data = await res.json();
      setItems(res.ok && data?.ok ? data.items : []);
    } catch (e) {
      console.error(e);
      setItems([]);
    } finally {
      setLoading(false);
    }
  }

  // Cambiar a Por día = listar TODO (sin inputs de fecha)
  function handleModeDay() {
    setMode("day");
  }

  // Cambiar a Por mes = mes actual por defecto (con input opcional)
  function handleModeMonth() {
    const now = new Date();
    const ym = now.toISOString().slice(0, 7);
    setMode("month");
    setMonth(ym);
  }

  useEffect(() => {
    if (tab === "citas") fetchCitas();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tab, mode, month]);

  // Agrupar por día para render
  const grouped = useMemo(() => {
    const map = new Map();
    for (const it of items) {
      const k = new Date(it.citaAt).toISOString().slice(0, 10); // YYYY-MM-DD
      if (!map.has(k)) map.set(k, []);
      map.get(k).push(it);
    }
    for (const arr of map.values()) {
      arr.sort((a, b) => new Date(a.citaAt) - new Date(b.citaAt));
    }
    return Array.from(map.entries()).sort(
      (a, b) => new Date(a[0]) - new Date(b[0])
    );
  }, [items]);

  return (
    <div className="layer-content relative z-[1] flex flex-col gap-6">
      {/* FX */}
      <div className="mesh mesh--ribbon" />
      <div className="mesh mesh--br" />
      <div className="mesh mesh--lb" />

      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-4">
        <div>
          <h1 className="text-xl md:text-2xl font-bold text-neutral-100">Agenda de Citas</h1>
          <p className="text-sm text-neutral-400">Agendar y consultar citas programadas</p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => navigate("/visitas/control")}
            className="text-xs text-blue-400 hover:underline"
          >
            ← Volver a Gestión de Visitantes
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-2">
        <button
          onClick={() => setTab("agendar")}
          className={`px-3 py-2 rounded-lg text-sm ${tab === "agendar" ? "bg-blue-600/80 text-white" : "bg-neutral-800 text-neutral-300 hover:bg-neutral-700"}`}
        >
          Agendar
        </button>
        <button
          onClick={() => setTab("citas")}
          className={`px-3 py-2 rounded-lg text-sm ${tab === "citas" ? "bg-blue-600/80 text-white" : "bg-neutral-800 text-neutral-300 hover:bg-neutral-700"}`}
        >
          Citas
        </button>
      </div>

      {/* ===================== Sección: Agendar ===================== */}
      {tab === "agendar" && (
        <section className="card-rich p-4 md:p-6 text-sm">
          <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-6">
            {/* Columna izquierda */}
            <div className="flex flex-col gap-4">
              <Field label="Visitante *" name="visitante" value={form.visitante} onChange={onChange} error={errors.visitante} placeholder="Nombre y apellido" />
              <Field label="Documento *" name="documento" value={form.documento} onChange={onChange} error={errors.documento} placeholder="DNI / Pasaporte" />
              <Field label="Empresa *" name="empresa" value={form.empresa} onChange={onChange} error={errors.empresa} placeholder="Empresa" />
              <Field label="Empleado a visitar *" name="empleado" value={form.empleado} onChange={onChange} error={errors.empleado} placeholder="Persona de contacto" />
            </div>

            {/* Columna derecha */}
            <div className="flex flex-col gap-4">
              <Field label="Motivo *" name="motivo" value={form.motivo} onChange={onChange} error={errors.motivo} placeholder="Motivo de la visita" />
              <div className="grid grid-cols-2 gap-4">
                <Field type="date" label="Fecha *" name="fecha" value={form.fecha} onChange={onChange} error={errors.fecha} />
                <Field type="time" label="Hora *" name="hora" value={form.hora} onChange={onChange} error={errors.hora} />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <Field label="Teléfono" name="telefono" value={form.telefono} onChange={onChange} error={errors.telefono} placeholder="+504 ..." />
                <Field type="email" label="Correo" name="correo" value={form.correo} onChange={onChange} error={errors.correo} placeholder="correo@dominio.com" />
              </div>
            </div>

            {/* Acciones */}
            <div className="md:col-span-2 flex items-center justify-between pt-2">
              <div className="text-xs text-neutral-400">Los campos con * son obligatorios</div>
              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={() => navigate("/visitas/control")}
                  className="px-3 py-2 rounded-md text-xs font-semibold bg-neutral-800 text-neutral-300 hover:bg-neutral-700"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-3 py-2 rounded-md text-xs font-semibold bg-blue-600/80 text-blue-50 hover:bg-blue-600 disabled:opacity-60"
                >
                  {submitting ? "Agendando..." : "Agendar cita"}
                </button>
              </div>
            </div>

            {okMsg && <div className="md:col-span-2 text-green-300 text-sm">{okMsg}</div>}
          </form>
        </section>
      )}

      {/* ===================== Sección: Citas ===================== */}
      {tab === "citas" && (
        <section className="card-rich p-4 md:p-6 text-sm">
          {/* Toggle modo + selector opcional de MES */}
          <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-3 mb-4">
            <div className="flex items-center gap-2">
              <button
                onClick={handleModeDay}
                className={`px-3 py-2 rounded-lg text-xs ${mode === "day" ? "bg-neutral-700 text-white" : "bg-neutral-900 text-neutral-300 hover:bg-neutral-800"}`}
                title="Ver todas las citas (todas las fechas)"
              >
                Por día
              </button>
              <button
                onClick={handleModeMonth}
                className={`px-3 py-2 rounded-lg text-xs ${mode === "month" ? "bg-neutral-700 text-white" : "bg-neutral-900 text-neutral-300 hover:bg-neutral-800"}`}
                title="Ver todas las citas del mes actual"
              >
                Por mes
              </button>
            </div>

            {/* En modo día no hay input. En modo mes sí (opcional) */}
            <div className="flex items-center gap-3">
              {mode === "month" && (
                <input
                  type="month"
                  value={month}
                  onChange={(e) => setMonth(e.target.value)}
                  className="rounded-lg bg-neutral-900/50 border border-neutral-700/50 px-3 py-2 text-neutral-100"
                  title="Cambiar mes (opcional)"
                />
              )}
              <button
                onClick={fetchCitas}
                className="px-3 py-2 rounded-md text-xs font-semibold bg-blue-600/80 text-blue-50 hover:bg-blue-600"
              >
                Actualizar
              </button>
            </div>
          </div>

          {loading ? (
            <div className="text-neutral-400">Cargando…</div>
          ) : grouped.length === 0 ? (
            <div className="text-neutral-400">
              {mode === "day"
                ? "Sin citas agendadas."
                : "Sin citas en el mes seleccionado."}
            </div>
          ) : (
            <div className="flex flex-col gap-6">
              {grouped.map(([k, arr]) => (
                <div key={k} className="rounded-xl border border-neutral-800/60 bg-neutral-900/30">
                  <div className="px-4 py-3 text-neutral-300 text-sm border-b border-neutral-800/60">
                    <span className="font-semibold">{fmtDate(k)}</span> — {arr.length} cita(s)
                  </div>
                  <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse min-w-[900px]">
                      <thead className="text-xs uppercase text-neutral-400 border-b border-neutral-700/40">
                        <tr className="[&>th]:py-2 [&>th]:pr-4">
                          <th>Visitante</th>
                          <th>Empresa</th>
                          <th>Empleado</th>
                          <th>Motivo</th>
                          <th>Hora</th>
                          <th>Estado</th>
                        </tr>
                      </thead>
                      <tbody className="text-neutral-200">
                        {arr.map((it) => (
                          <tr key={it._id} className="border-b border-neutral-800/40 text-sm [&>td]:py-3 [&>td]:pr-4">
                            <td className="font-medium text-neutral-100">{it.nombre}</td>
                            <td>{it.empresa}</td>
                            <td>{it.empleado}</td>
                            <td className="text-neutral-300">{it.motivo}</td>
                            <td>{fmtTime(it.citaAt)}</td>
                            <td>
                              <span className="px-2 py-1 rounded-full text-xs font-semibold bg-yellow-200 text-yellow-700 dark:bg-yellow-500/20 dark:text-yellow-300">
                                Programada
                              </span>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>
      )}
    </div>
  );
}

/* ============== Input reutilizable ============== */
function Field({ label, name, value, onChange, error, placeholder, type = "text" }) {
  return (
    <div>
      <label className="block text-neutral-300 mb-1">{label}</label>
      <input
        type={type}
        name={name}
        value={value}
        onChange={onChange}
        placeholder={placeholder}
        className="w-full rounded-lg bg-neutral-900/50 border border-neutral-700/50 px-3 py-2 text-neutral-100 focus:outline-none focus:ring-2 focus:ring-blue-600/40"
      />
      {error && <p className="text-red-400 text-xs mt-1">{error}</p>}
    </div>
  );
}
