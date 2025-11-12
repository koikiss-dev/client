import React, { useState, useMemo, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import NewVisitorModal from "../components/NewVisitorModal.jsx";

const API_BASE =
  import.meta.env.VITE_API_BASE_URL?.replace(/\/$/, "") ||
  "http://localhost:4000";

async function readJsonSafe(res) {
  const raw = await res.text();
  try {
    return { data: JSON.parse(raw), raw };
  } catch {
    return { data: null, raw };
  }
}

// ⏰ helpers de rango del día local
function getTodayRange() {
  const start = new Date();
  start.setHours(0, 0, 0, 0);
  const end = new Date(start);
  end.setDate(end.getDate() + 1);
  return { start, end };
}

export default function VisitsPage() {
  const navigate = useNavigate();

  const [visitors, setVisitors] = useState([]);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("todos");
  const [showModal, setShowModal] = useState(false);
  const [loading, setLoading] = useState(true);
  const [savingExit, setSavingExit] = useState(null);

  // 🔧 ahora trabajamos con nombre libre del empleado (texto)
  const sendEmpleadoAsId = false;

  useEffect(() => {
    let alive = true;
    (async () => {
      setLoading(true);
      try {
        const res = await fetch(`${API_BASE}/api/visitas`, {
          credentials: "include",
        });
        const { data, raw } = await readJsonSafe(res);
        if (!alive) return;

        if (!res.ok) {
          console.error("[visitas] GET /api/visitas fallo:", res.status, raw);
          setVisitors([]);
          return;
        }

        if (data?.ok && Array.isArray(data.items)) {
          const mapped = data.items.map((v) => {
            const entryDate = v.fechaEntrada ? new Date(v.fechaEntrada) : null;
            const exitDate = v.fechaSalida ? new Date(v.fechaSalida) : null;

            const fmt = (d) =>
              d
                ? `${d.toLocaleDateString("es-ES", {
                    day: "2-digit",
                    month: "2-digit",
                  })}, ${d.toLocaleTimeString("es-ES", {
                    hour: "2-digit",
                    minute: "2-digit",
                  })}`
                : "-";

            return {
              id: v._id,
              name: v.nombre,
              document: v.documento,
              company: v.empresa || "—",
              employee: v.empleado || "—", // <- texto
              entry: fmt(entryDate),
              exit: fmt(exitDate),
              status: v.estado,
              // ✅ guardo fechas crudas para cálculos (no visibles)
              entryAt: entryDate,
              exitAt: exitDate,
            };
          });
          setVisitors(mapped);
        } else {
          console.warn("[visitas] respuesta inesperada:", data ?? raw);
          setVisitors([]);
        }
      } catch (err) {
        console.error("[visitas] error cargando visitas:", err);
        setVisitors([]);
      } finally {
        if (alive) setLoading(false);
      }
    })();
    return () => {
      alive = false;
    };
  }, []);

  const kpiActivos = useMemo(
    () => visitors.filter((v) => v.status === "Dentro").length,
    [visitors]
  );

  // ✅ “Total Hoy” solo cuenta visitas con fechaEntrada dentro del día local de HOY
  const kpiTotalHoy = useMemo(() => {
    const { start, end } = getTodayRange();
    return visitors.filter(
      (v) => v.entryAt && v.entryAt >= start && v.entryAt < end
    ).length;
  }, [visitors]);

  // ✅ “Empresas Visitantes” también por HOY (únicas del día)
  const kpiEmpresas = useMemo(() => {
    const { start, end } = getTodayRange();
    const empresasDeHoy = visitors
      .filter((v) => v.entryAt && v.entryAt >= start && v.entryAt < end)
      .map((v) => v.company);
    return new Set(empresasDeHoy).size;
  }, [visitors]);

  const filteredVisitors = useMemo(() => {
    return visitors.filter((v) => {
      const full = `${v.name} ${v.document} ${v.company}`.toLowerCase();
      const matchesSearch = full.includes(search.toLowerCase().trim());
      const matchesStatus =
        statusFilter === "todos"
          ? true
          : v.status.toLowerCase() === statusFilter.toLowerCase();
      return matchesSearch && matchesStatus;
    });
  }, [visitors, search, statusFilter]);

  // ✅ ahora enviamos 'empleado' (texto)
  async function handleAddVisitor(formData) {
    const payload = {
      nombre: formData.name?.trim(),
      documento: formData.document?.trim(),
      empresa: formData.company?.trim() || undefined,
      empleado: formData.employee?.trim(), // <- texto libre
      motivo: formData.reason?.trim(),
      telefono: formData.phone?.trim() || undefined,
      correo: formData.email?.trim() || undefined,
    };

    try {
      const res = await fetch(`${API_BASE}/api/visitas`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(payload),
      });

      const { data, raw } = await readJsonSafe(res);

      if (!res.ok || !data?.ok) {
        console.error("[visitas] POST /api/visitas fallo:", res.status, data?.error || raw);
        alert(data?.error || `No se pudo registrar (HTTP ${res.status}).`);
        return;
      }

      const v = data.item;
      const entryDate = v?.fechaEntrada ? new Date(v.fechaEntrada) : new Date();
      const fmtEntry = `${entryDate.toLocaleDateString("es-ES", {
        day: "2-digit",
        month: "2-digit",
      })}, ${entryDate.toLocaleTimeString("es-ES", {
        hour: "2-digit",
        minute: "2-digit",
      })}`;

      const newRow = {
        id: v._id,
        name: v.nombre,
        document: v.documento,
        company: v.empresa || "—",
        employee: v.empleado || "—",
        entry: fmtEntry,
        exit: "-",
        status: v.estado || "Dentro",
        // ✅ para KPI de hoy
        entryAt: entryDate,
        exitAt: null,
      };

      setVisitors((prev) => [newRow, ...prev]);
      setShowModal(false);
    } catch (err) {
      console.error("[visitas] error creando visita:", err);
      alert("Error de red creando visita");
    }
  }

  async function handleExit(id) {
    if (!id) return;
    setSavingExit(id);
    try {
      const res = await fetch(`${API_BASE}/api/visitas/${id}/cerrar`, {
        method: "PATCH",
        credentials: "include",
      });
      const { data, raw } = await readJsonSafe(res);

      if (!res.ok || !data?.ok) {
        console.error("[visitas] PATCH cerrar fallo:", res.status, data?.error || raw);
        alert(data?.error || "No se pudo cerrar la visita.");
        setSavingExit(null);
        return;
      }

      const v = data.item;
      const exitDate = v?.fechaSalida ? new Date(v.fechaSalida) : new Date();
      const fmtExit = `${exitDate.toLocaleDateString("es-ES", {
        day: "2-digit",
        month: "2-digit",
      })}, ${exitDate.toLocaleTimeString("es-ES", {
        hour: "2-digit",
        minute: "2-digit",
      })}`;

      setVisitors((prev) =>
        prev.map((row) =>
          row.id === id
            ? { ...row, status: "Finalizada", exit: fmtExit, exitAt: exitDate }
            : row
        )
      );
    } catch (err) {
      console.error("[visitas] error cerrando visita:", err);
      alert("No se pudo marcar salida.");
    } finally {
      setSavingExit(null);
    }
  }

  return (
    <div className="layer-content relative z-[1] flex flex-col gap-6">
      <div className="mesh mesh--ribbon" />
      <div className="mesh mesh--br" />
      <div className="mesh mesh--lb" />

      <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-4">
        <div className="flex flex-col">
          <h1 className="text-xl md:text-2xl font-bold text-neutral-100 dark:text-neutral-100">
            Gestión de Visitantes
          </h1>
          <p className="text-sm text-neutral-400">
            Registra y controla el acceso de visitantes
          </p>
        </div>

        <div className="flex flex-col items-start md:items-end gap-2">
          <button
            onClick={() => setShowModal(true)}
            className="btn-neon flex items-center gap-2 text-sm px-3 py-2 rounded-lg"
          >
            <span className="font-semibold">+ Registrar Visitante</span>
          </button>

          <button
            onClick={() => navigate("/visitas/agenda")}
            className="text-xs text-blue-400 hover:underline"
          >
            Ir a Agenda de Citas →
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="fx-card p-4 flex flex-col gap-1">
          <div className="text-sm text-neutral-400 flex items-center gap-2">
            <span role="img" aria-label="user">👤</span>{" "}
            Visitantes Activos
          </div>
          <div className="text-2xl font-semibold text-green-400">
            {loading ? "…" : kpiActivos}
          </div>
        </div>

        <div className="fx-card p-4 flex flex-col gap-1">
          <div className="text-sm text-neutral-400 flex items-center gap-2">
            <span role="img" aria-label="clock">⏰</span>{" "}
            Total Hoy
          </div>
          <div className="text-2xl font-semibold text-blue-400">
            {loading ? "…" : kpiTotalHoy}
          </div>
        </div>

        <div className="fx-card p-4 flex flex-col gap-1">
          <div className="text-sm text-neutral-400 flex items-center gap-2">
            <span role="img" aria-label="building">🏢</span>{" "}
            Empresas Visitantes
          </div>
          <div className="text-2xl font-semibold text-purple-400">
            {loading ? "…" : kpiEmpresas}
          </div>
        </div>
      </div>

      <section className="relative z-[2] visits-shell card-rich p-4 md:p-5 overflow-x-auto text-sm">
        <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between mb-4">
          <div className="font-semibold text-neutral-200 text-base">
            Lista de Visitantes
          </div>

          <div className="flex flex-col-reverse md:flex-row md:items-center gap-3 w-full md:w-auto">
            <div className="flex-1 md:flex-none">
              <input
                className="input-fx w-full md:w-[300px]"
                placeholder="Buscar por nombre, documento o empresa…"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>

            <div>
              <select
                className="input-fx w-full md:w-[160px]"
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
              >
                <option value="todos">Todos los Estados</option>
                <option value="Dentro">Dentro</option>
                <option value="Finalizada">Finalizada</option>
              </select>
            </div>
          </div>
        </div>

        <table className="w-full text-left border-collapse min-w-[900px]">
          <thead className="text-xs uppercase text-neutral-400 border-b border-neutral-700/40">
            <tr className="[&>th]:py-2 [&>th]:pr-4">
              <th>Visitante</th>
              <th>Documento</th>
              <th>Empresa</th>
              <th>Empleado</th>
              <th>Entrada</th>
              <th>Salida</th>
              <th>Estado</th>
              <th className="text-right">Acciones</th>
            </tr>
          </thead>
          <tbody className="text-neutral-200">
            {loading ? (
              <tr>
                <td colSpan={8} className="py-6 text-center text-neutral-500 text-sm">Cargando…</td>
              </tr>
            ) : filteredVisitors.length === 0 ? (
              <tr>
                <td colSpan={8} className="py-6 text-center text-neutral-500 text-sm">Sin resultados</td>
              </tr>
            ) : (
              filteredVisitors.map((v) => (
                <tr key={v.id} className="border-b border-neutral-800/40 text-sm [&>td]:py-3 [&>td]:pr-4">
                  <td className="font-medium text-neutral-100"><div>{v.name}</div></td>
                  <td className="text-neutral-400">{v.document}</td>
                  <td className="text-neutral-200">{v.company}</td>
                  <td className="text-neutral-200">{v.employee}</td>
                  <td className="text-neutral-200">{v.entry}</td>
                  <td className="text-neutral-400">{v.exit}</td>
                  <td>
                    {v.status === "Dentro" ? (
                      <span className="px-2 py-1 rounded-full text-xs font-semibold bg-green-200 text-green-800 dark:bg-green-600/20 dark:text-green-300">Dentro</span>
                    ) : (
                      <span className="px-2 py-1 rounded-full text-xs font-semibold bg-neutral-300 text-neutral-700 dark:bg-neutral-500/20 dark:text-neutral-300">Finalizada</span>
                    )}
                  </td>
                  <td className="text-right">
                    {v.status === "Dentro" ? (
                      <button
                        disabled={savingExit === v.id}
                        onClick={() => handleExit(v.id)}
                        className="px-2 py-1 rounded-md text-xs font-semibold bg-red-200 text-red-700 hover:bg-red-300 disabled:opacity-50 disabled:cursor-not-allowed dark:bg-red-600/20 dark:text-red-300 dark:hover:bg-red-600/30"
                      >
                        {savingExit === v.id ? "…" : "⏏ Salida"}
                      </button>
                    ) : (
                      <span className="text-neutral-500 text-xs">(cerrada)</span>
                    )}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </section>

      {showModal && (
        <NewVisitorModal
          onClose={() => setShowModal(false)}
          onSubmit={handleAddVisitor}
        />
      )}
    </div>
  );
}
