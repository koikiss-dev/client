import React from "react";

/** items: [{ roundId, at, state }] */
export default function OmissionsTable({ items = [] }) {
  const empty = !items.length;
  return (
    <div className="rounded-2xl border border-white/10 bg-white/5 backdrop-blur p-4 shadow-lg">
      <h3 className="font-semibold text-lg mb-2">Omisiones</h3>
      {empty ? (
        <div className="text-emerald-400 font-medium">Sin omisiones (Completo)</div>
      ) : (
        <div className="overflow-auto">
          <table className="min-w-full text-sm">
            <thead className="text-white/80">
              <tr className="border-b border-white/10">
                <th className="py-2 pr-4">#</th>
                <th className="py-2 pr-4">Ronda</th>
                <th className="py-2 pr-4">Fecha/Hora esperada</th>
                <th className="py-2">Estado</th>
              </tr>
            </thead>
            <tbody>
              {items.map((it, i) => (
                <tr key={i} className="border-b border-white/10 last:border-0">
                  <td className="py-2 pr-4">{i + 1}</td>
                  <td className="py-2 pr-4">{String(it.roundId || "-")}</td>
                  <td className="py-2 pr-4">{new Date(it.at).toLocaleString()}</td>
                  <td className="py-2">
                    <span className="px-2 py-1 rounded-lg bg-amber-500/20 text-amber-300 border border-amber-400/40">
                      {it.state || "Omitido"}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
