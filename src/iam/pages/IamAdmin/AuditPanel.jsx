import React, { useEffect, useMemo, useState } from "react";
import { iamApi } from "../../api/iamApi";

export default function AuditPanel() {
  const [items, setItems] = useState([]);
  const [q, setQ] = useState("");
  const [limit, setLimit] = useState(50);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState("");

  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        setLoading(true);
        setErr("");
        const r = await iamApi.listAudit(limit);
        if (!alive) return;
        setItems(r.items || []);
      } catch (e) {
        if (!alive) return;
        // Silenciamos 404 (ruta no implementada)
        const msg = String(e?.message || "").toLowerCase();
        if (!msg.includes("not found") && !msg.includes("404")) {
          setErr(e?.message || "Error al cargar auditoría");
        }
        setItems([]);
      } finally {
        if (alive) setLoading(false);
      }
    })();
    return () => { alive = false; };
  }, [limit]);

  const filtered = useMemo(() => {
    const term = q.trim().toLowerCase();
    if (!term) return items;
    return items.filter(x => JSON.stringify(x).toLowerCase().includes(term));
  }, [q, items]);

  return (
    <div className="space-y-3">
      <div className="flex flex-col sm:flex-row gap-2">
        <input
          value={q} onChange={e=>setQ(e.target.value)}
          placeholder="Buscar en auditoría…"
          className="flex-1 px-3 py-2 rounded border bg-white/70 dark:bg-gray-800 dark:border-gray-700 dark:text-gray-100"
        />
        <select
          value={limit} onChange={e=>setLimit(Number(e.target.value))}
          className="px-3 py-2 rounded border bg-white/70 dark:bg-gray-800 dark:border-gray-700 dark:text-gray-100"
        >
          {[50,100,200,500].map(n => <option key={n} value={n}>Últimos {n}</option>)}
        </select>
      </div>

      {err && (
        <div className="text-sm text-red-500 dark:text-red-400">
          {err}
        </div>
      )}

      {loading ? (
        <div className="p-4">Cargando auditoría…</div>
      ) : (
        <div className="rounded border dark:border-gray-800 divide-y dark:divide-gray-800 overflow-hidden">
          {filtered.map((it, i) => (
            <div key={i} className="p-3 bg-white dark:bg-gray-900">
              <div className="text-xs text-gray-500 dark:text-gray-400">
                {new Date(it.createdAt || it.ts || Date.now()).toLocaleString()} · {it.actorEmail || it.actorId || "—"}
              </div>
              <div className="text-sm font-semibold text-gray-900 dark:text-gray-100">
                {it.action} — {it.entity} {it.entityId ? `(${it.entityId})` : ""}
              </div>
              <pre className="mt-2 text-xs overflow-auto bg-gray-50 dark:bg-gray-800 p-2 rounded">
                {JSON.stringify({ before: it.before, after: it.after }, null, 2)}
              </pre>
            </div>
          ))}
          {filtered.length === 0 && (
            <div className="p-4 text-gray-500 dark:text-gray-400">Sin eventos.</div>
          )}
        </div>
      )}
    </div>
  );
}
