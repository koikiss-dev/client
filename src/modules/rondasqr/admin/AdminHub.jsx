// src/modules/rondasqr/admin/AdminHub.jsx
import React, { useEffect, useState } from "react";
import { rondasqrApi as api } from "../api/rondasqrApi.js";
import AssignmentsPage from "./AssignmentsPage.jsx";

/* ---------- UI helpers (clases) ---------- */
const card =
  "rounded-2xl p-4 sm:p-5 bg-white shadow border border-slate-200 " +
  "dark:bg-white/5 dark:border-white/10 dark:shadow-none dark:backdrop-blur";
const inputBase =
  "w-full h-11 px-3 rounded-xl border bg-white text-slate-900 " +
  "placeholder-slate-400 border-slate-300 focus:outline-none focus:ring-2 focus:ring-indigo-300 " +
  "dark:bg-black/30 dark:text-white dark:placeholder-white/50 dark:border-white/10 dark:focus:ring-cyan-400";
const selectBase = inputBase;
const btn =
  "inline-flex items-center justify-center h-11 px-5 rounded-xl font-semibold text-white " +
  "bg-gradient-to-r from-emerald-500 to-cyan-500 hover:brightness-105 active:brightness-95 " +
  "disabled:opacity-60 disabled:cursor-not-allowed";
const btnDanger =
  "inline-flex items-center justify-center h-11 px-4 rounded-xl text-white bg-rose-600 hover:bg-rose-500";
const btnSmall =
  "inline-flex items-center justify-center h-8 px-3 rounded-lg font-semibold text-white " +
  "bg-blue-600 hover:bg-blue-500";

export default function AdminHub({ initialTab = "sites" }) {
  const [tab, setTab] = useState(initialTab);

  useEffect(() => {
    setTab(initialTab);
  }, [initialTab]);

  const tabs = [
    { k: "sites", label: "Sitios" },
    { k: "rounds", label: "Rondas" },
    { k: "point", label: "Puntos" },
    { k: "plans", label: "Planes" },
    { k: "assign", label: "Asignaciones" },
  ];

  return (
    <div className="space-y-4 p-4 sm:p-6">
      {/* Tabs */}
      <div className="flex flex-wrap gap-2">
        {tabs.map((t) => (
          <button
            key={t.k}
            onClick={() => setTab(t.k)}
            className={
              "px-3 py-2 rounded-xl text-sm font-semibold border " +
              (tab === t.k
                ? "bg-blue-600 text-white border-blue-600"
                : "bg-white border-slate-200 text-slate-700 hover:bg-slate-50 dark:bg-white/5 dark:border-white/10 dark:text-white")
            }
          >
            {t.label.toUpperCase()}
          </button>
        ))}
      </div>

      {tab === "sites" && <SitesTab />}
      {tab === "rounds" && <RoundsTab />}
      {tab === "point" && <PointsTab />}
      {tab === "plans" && <PlansTab />}
      {tab === "assign" && <AssignmentsPage />}
    </div>
  );
}

/* ---------- Wrapper de sección ---------- */
function Section({ title, children }) {
  return (
    <div className={card + " space-y-3"}>
      <h3 className="text-xl font-semibold">{title}</h3>
      {children}
    </div>
  );
}

/* ---------- Tabla scrollable ---------- */
function Table({ cols, children }) {
  return (
    <div className="overflow-auto">
      <table className="min-w-[720px] text-sm">
        <thead className="text-slate-600 dark:text-white/80">
          <tr className="border-b border-slate-200 dark:border-white/10">
            {cols.map((c) => (
              <th key={c} className="text-left py-2 px-3">
                {c}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>{children}</tbody>
      </table>
    </div>
  );
}

/* -------------------- Sites -------------------- */
function SitesTab() {
  const [rows, setRows] = useState([]);
  const [name, setName] = useState("");

  async function load() {
    const res = await api.listSites();
    setRows(res?.items || []);
  }
  useEffect(() => {
    load();
  }, []);

  async function add() {
    if (!name.trim()) return;
    await api.createSite({ name });
    setName("");
    load();
  }
  async function del(id) {
    await api.deleteSite(id);
    load();
  }

  return (
    <Section title="Sitios">
      {/* input + botón, versión compacta */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <div className="flex-1">
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Nuevo sitio"
            className={inputBase}
          />
        </div>
        <button onClick={add} className={btn + " sm:w-auto w-full"}>
          Agregar
        </button>
      </div>

      <Table cols={["Nombre", "Acciones"]}>
        {rows.map((r) => (
          <tr key={r._id} className="border-b border-slate-200 dark:border-white/10">
            <td className="px-3 py-2">{r.name}</td>
            <td className="px-3 py-2">
              <button onClick={() => del(r._id)} className={btnDanger}>
                Eliminar
              </button>
            </td>
          </tr>
        ))}
      </Table>
    </Section>
  );
}

/* -------------------- Rounds -------------------- */
function RoundsTab() {
  const [sites, setSites] = useState([]);
  const [rows, setRows] = useState([]);
  const [siteId, setSiteId] = useState("");
  const [name, setName] = useState("");

  async function loadSites() {
    const s = await api.listSites();
    setSites(s?.items || []);
  }
  async function loadRounds() {
    if (!siteId) return setRows([]);
    const r = await api.listRounds(siteId);
    setRows(r?.items || []);
  }
  useEffect(() => {
    loadSites();
  }, []);
  useEffect(() => {
    loadRounds();
  }, [siteId]);

  async function add() {
    if (!name.trim() || !siteId) return;
    await api.createRound({ siteId, name });
    setName("");
    loadRounds();
  }
  async function del(id) {
    await api.deleteRound(id);
    loadRounds();
  }

  return (
    <Section title="Rondas">
      <div className="mb-3">
        <select
          value={siteId}
          onChange={(e) => setSiteId(e.target.value)}
          className={selectBase}
        >
          <option value="">-- Sitio --</option>
          {sites.map((s) => (
            <option key={s._id} value={s._id}>
              {s.name}
            </option>
          ))}
        </select>
      </div>

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <div className="flex-1 min-w-0">
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Nueva ronda"
            className={inputBase}
          />
        </div>
        <button onClick={add} className={btn + " sm:w-auto w-full"}>
          Agregar
        </button>
      </div>

      <Table cols={["Ronda", "Acciones"]}>
        {rows.map((r) => (
          <tr key={r._id} className="border-b border-slate-200 dark:border-white/10">
            <td className="px-3 py-2">{r.name}</td>
            <td className="px-3 py-2">
              <button onClick={() => del(r._id)} className={btnDanger}>
                Eliminar
              </button>
            </td>
          </tr>
        ))}
      </Table>
    </Section>
  );
}

/* -------------------- Points -------------------- */
function PointsTab() {
  const [sites, setSites] = useState([]);
  const [rounds, setRounds] = useState([]);
  const [rows, setRows] = useState([]);
  const [siteId, setSiteId] = useState("");
  const [roundId, setRoundId] = useState("");
  const [name, setName] = useState("");
  const [qr, setQr] = useState("");
  const [order, setOrder] = useState(0);

  useEffect(() => {
    (async () => {
      const res = await api.listSites();
      setSites(res?.items || []);
    })();
  }, []);

  useEffect(() => {
    (async () => {
      if (!siteId) {
        setRounds([]);
        setRows([]);
        return;
      }
      const r = await api.listRounds(siteId);
      setRounds(r?.items || []);
      const p = await api.listPoints({
        siteId,
        roundId: roundId || undefined,
      });
      setRows(p?.items || []);
    })();
  }, [siteId, roundId]);

  async function add() {
    if (!siteId || !roundId || !name.trim() || !qr.trim()) return;
    await api.createPoint({
      siteId,
      roundId,
      name,
      qr,
      order: Number(order) || 0,
    });
    setName("");
    setQr("");
    setOrder(0);
    const p = await api.listPoints({ siteId, roundId });
    setRows(p?.items || []);
  }
  async function del(id) {
    await api.deletePoint(id);
    const p = await api.listPoints({ siteId, roundId });
    setRows(p?.items || []);
  }

  return (
    <Section title="Puntos">
      <div className="grid gap-3 items-end grid-cols-1 sm:grid-cols-2 lg:grid-cols-5">
        <div className="min-w-0">
          <select
            value={siteId}
            onChange={(e) => setSiteId(e.target.value)}
            className={selectBase}
          >
            <option value="">-- Sitio --</option>
            {sites.map((s) => (
              <option key={s._id} value={s._id}>
                {s.name}
              </option>
            ))}
          </select>
        </div>

        <div className="min-w-0">
          <select
            value={roundId}
            onChange={(e) => setRoundId(e.target.value)}
            className={selectBase}
          >
            <option value="">-- Ronda --</option>
            {rounds.map((r) => (
              <option key={r._id} value={r._id}>
                {r.name}
              </option>
            ))}
          </select>
        </div>

        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Nombre punto"
          className={inputBase}
        />
        <input
          value={qr}
          onChange={(e) => setQr(e.target.value)}
          placeholder="QR"
          className={inputBase}
        />

        <div className="flex gap-2">
          <input
            type="number"
            value={order}
            onChange={(e) => setOrder(e.target.value)}
            placeholder="Orden"
            className={inputBase + " w-28"}
          />
          <button onClick={add} className={btn + " shrink-0"}>
            Agregar
          </button>
        </div>
      </div>

      <Table cols={["Orden", "Punto", "QR", "Acciones"]}>
        {rows.map((r) => (
          <tr key={r._id} className="border-b border-slate-200 dark:border-white/10">
            <td className="px-3 py-2">{r.order}</td>
            <td className="px-3 py-2">{r.name}</td>
            <td className="px-3 py-2">{r.qr}</td>
            <td className="px-3 py-2">
              <button onClick={() => del(r._id)} className={btnDanger}>
                Eliminar
              </button>
            </td>
          </tr>
        ))}
      </Table>
    </Section>
  );
}

/* -------------------- Plans (compactado) -------------------- */
function PlansTab() {
  const [sites, setSites] = useState([]);
  const [rounds, setRounds] = useState([]);
  const [points, setPoints] = useState([]);

  const [siteId, setSiteId] = useState("");
  const [roundId, setRoundId] = useState("");

  const shiftOptions = [
    { value: "dia", label: "Diurno" },
    { value: "noche", label: "Nocturno" },
  ];
  const [shift, setShift] = useState("dia");

  const [planIds, setPlanIds] = useState([]);
  const [savedCount, setSavedCount] = useState(0);

  useEffect(() => {
    (async () => {
      const s = await api.listSites();
      setSites(s?.items || []);
    })();
  }, []);

  useEffect(() => {
    (async () => {
      if (!siteId) {
        setRounds([]);
        setRoundId("");
        setPoints([]);
        setPlanIds([]);
        setSavedCount(0);
        return;
      }
      const r = await api.listRounds(siteId);
      setRounds(r?.items || []);
    })();
  }, [siteId]);

  useEffect(() => {
    (async () => {
      if (!siteId) {
        setPoints([]);
        return;
      }
      const p = await api.listPoints({ siteId, roundId: roundId || undefined });
      setPoints(p?.items || []);
    })();
  }, [siteId, roundId]);

  const pickPlanItem = (res) =>
    res?.item ?? (Array.isArray(res?.items) ? res.items[0] : undefined) ?? null;

  useEffect(() => {
    (async () => {
      if (!siteId || !roundId) {
        setPlanIds([]);
        setSavedCount(0);
        return;
      }
      const res = await api.getPlan({ siteId, roundId, shift });
      const item = pickPlanItem(res);
      const ids = item?.pointIds?.length
        ? item.pointIds.map(String)
        : Array.isArray(item?.points)
        ? item.points.map((x) => String(x.pointId))
        : [];
      setPlanIds(ids);
      setSavedCount(ids.length);
    })();
  }, [siteId, roundId, shift]);

  function addPointToPlan(pointId) {
    setPlanIds((prev) => (prev.includes(pointId) ? prev : [...prev, pointId]));
  }
  function removePointFromPlan(pointId) {
    setPlanIds((prev) => prev.filter((id) => id !== pointId));
  }
  function moveUp(idx) {
    setPlanIds((prev) => {
      if (idx <= 0) return prev;
      const arr = [...prev];
      [arr[idx - 1], arr[idx]] = [arr[idx], arr[idx - 1]];
      return arr;
    });
  }
  function moveDown(idx) {
    setPlanIds((prev) => {
      if (idx >= prev.length - 1) return prev;
      const arr = [...prev];
      [arr[idx + 1], arr[idx]] = [arr[idx], arr[idx + 1]];
      return arr;
    });
  }

  async function savePlan() {
    if (!siteId || !roundId) {
      alert("Seleccione sitio y ronda.");
      return;
    }
    if (!planIds.length) {
      alert("El plan no tiene puntos.");
      return;
    }
    try {
      await api.createOrUpdatePlan({
        siteId,
        roundId,
        shift,
        pointIds: planIds,
      });
      setSavedCount(planIds.length);
      alert("Plan guardado.");
    } catch (e) {
      console.error("Error guardando plan", e);
      alert("No se pudo guardar el plan.");
    }
  }

  async function deletePlan() {
    if (!siteId || !roundId) return;
    try {
      await api.deletePlanByQuery({ siteId, roundId, shift });
      setPlanIds([]);
      setSavedCount(0);
      alert("Plan eliminado.");
    } catch (e) {
      console.error("Error eliminando plan", e);
      alert("No se pudo eliminar el plan.");
    }
  }

  return (
    <Section title="Planes">
      {/* barra superior compacta */}
      <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
        {/* filtros */}
        <div className="grid gap-3 grid-cols-1 md:grid-cols-3 flex-1">
          <div>
            <label className="block text-sm mb-1">Sitio</label>
            <select
              value={siteId}
              onChange={(e) => setSiteId(e.target.value)}
              className={selectBase}
            >
              <option value="">-- Sitio --</option>
              {sites.map((s) => (
                <option key={s._id} value={s._id}>
                  {s.name}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm mb-1">Ronda</label>
            <select
              value={roundId}
              onChange={(e) => setRoundId(e.target.value)}
              className={selectBase}
            >
              <option value="">-- Ronda --</option>
              {rounds.map((r) => (
                <option key={r._id} value={r._id}>
                  {r.name}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm mb-1">Turno</label>
            <select
              value={shift}
              onChange={(e) => setShift(e.target.value)}
              className={selectBase}
            >
              {shiftOptions.map((s) => (
                <option key={s.value} value={s.value}>
                  {s.label}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* botones */}
        <div className="flex gap-3">
          <button onClick={savePlan} className={btn}>
            Guardar plan
          </button>
          <button onClick={deletePlan} className={btnDanger}>
            Eliminar plan
          </button>
        </div>
      </div>

      {/* contenido dos columnas */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* columna izq: puntos */}
        <div className="bg-slate-950/5 dark:bg-white/5 rounded-xl border border-slate-200/50 dark:border-white/10 overflow-hidden">
          <div className="px-3 py-2 border-b border-slate-200/50 dark:border-white/5 flex items-center justify-between">
            <h4 className="font-semibold">Puntos disponibles</h4>
            <span className="text-xs opacity-60">{points.length} puntos</span>
          </div>
          <div className="max-h-[360px] overflow-auto">
            <table className="w-full text-sm">
              <tbody>
                {points.map((p) => (
                  <tr key={p._id} className="border-b border-slate-200/40 dark:border-white/5">
                    <td className="px-3 py-2 w-10 text-xs opacity-50">
                      {typeof p.order === "number" ? p.order : "-"}
                    </td>
                    <td className="px-3 py-2">{p.name}</td>
                    <td className="px-3 py-2 text-right">
                      <button
                        onClick={() => addPointToPlan(p._id)}
                        className={btnSmall}
                        disabled={planIds.includes(p._id)}
                      >
                        Añadir
                      </button>
                    </td>
                  </tr>
                ))}
                {!points.length && (
                  <tr>
                    <td className="px-3 py-3 text-sm opacity-60" colSpan={3}>
                      Seleccione un sitio y una ronda para ver los puntos.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* columna der: plan actual */}
        <div className="bg-slate-950/5 dark:bg-white/5 rounded-xl border border-slate-200/50 dark:border-white/10 overflow-hidden">
          <div className="px-3 py-2 border-b border-slate-200/50 dark:border-white/5 flex items-center justify-between">
            <h4 className="font-semibold">Plan actual (orden)</h4>
            <span className="text-xs opacity-60">{planIds.length} en el orden</span>
          </div>
          <div className="max-h-[360px] overflow-auto">
            <table className="w-full text-sm">
              <tbody>
                {planIds.map((id, idx) => {
                  const p = points.find((x) => x._id === id);
                  return (
                    <tr key={id} className="border-b border-slate-200/40 dark:border-white/5">
                      <td className="px-3 py-2 w-10 text-xs opacity-50">{idx + 1}</td>
                      <td className="px-3 py-2">{p?.name || id}</td>
                      <td className="px-1 py-2 w-24 text-right space-x-1">
                        <button
                          onClick={() => moveUp(idx)}
                          className="inline-flex items-center justify-center w-7 h-7 rounded bg-slate-200/70 dark:bg-white/10"
                          title="Subir"
                        >
                          ↑
                        </button>
                        <button
                          onClick={() => moveDown(idx)}
                          className="inline-flex items-center justify-center w-7 h-7 rounded bg-slate-200/70 dark:bg-white/10"
                          title="Bajar"
                        >
                          ↓
                        </button>
                      </td>
                      <td className="px-3 py-2 text-right">
                        <button
                          onClick={() => removePointFromPlan(id)}
                          className="h-7 px-3 rounded-lg text-white bg-rose-600 hover:bg-rose-500"
                        >
                          Quitar
                        </button>
                      </td>
                    </tr>
                  );
                })}
                {!planIds.length && (
                  <tr>
                    <td className="px-3 py-3 text-sm opacity-60" colSpan={4}>
                      No hay puntos en este plan. Añada desde la columna izquierda.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* pie de estado */}
      <div className="mt-2 rounded-lg bg-slate-100/50 dark:bg-white/5 px-3 py-2 text-sm flex justify-between items-center">
        <span>
          Plan guardado: <strong>{savedCount}</strong> puntos.
        </span>
        <span className="text-xs opacity-60">
          Use “Guardar plan” para aplicar cambios / “Eliminar plan” para dejarlo vacío.
        </span>
      </div>
    </Section>
  );
}
