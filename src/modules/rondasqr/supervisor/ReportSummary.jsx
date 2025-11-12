// src/modules/rondasqr/supervisor/ReportSummary.jsx
import React from "react";

/** stats: [{ site, round, day, officer, puntosRegistrados, pasos, primeraMarca, ultimaMarca, duracionText, banner }] */
export default function ReportSummary({ stats = [] }) {
  return (
    <div className="rounded-2xl border border-white/10 bg-white/5 backdrop-blur p-4 shadow-lg space-y-3">
      <h3 className="font-semibold text-lg">Resumen de Vista Rápida</h3>

      {!stats.length ? (
        <div className="text-sm text-white/70">Sin datos de resumen.</div>
      ) : (
        <>
          {/* Banda amarilla tipo lámina */}
          <div className="rounded-md bg-yellow-400 text-black font-medium px-4 py-2 shadow border border-yellow-600/40">
            {stats[0]?.banner}
          </div>

          {/* Tabla de estadísticas */}
          <div className="overflow-auto">
            <table className="min-w-[920px] text-sm">
              <thead className="text-white/80">
                <tr className="border-b border-white/10 bg-white/5">
                  <Th>FECHA</Th>
                  <Th>SITIO</Th>
                  <Th>RONDA</Th>
                  <Th>OFICIAL</Th>
                  <Th>PUNTOS REGISTRADOS</Th>
                  <Th>PASOS</Th>
                  <Th>PRIMERA MARCA</Th>
                  <Th>ÚLTIMA MARCA</Th>
                  <Th>DURACIÓN</Th>
                </tr>
              </thead>
              <tbody>
                {stats.map((s, i) => (
                  <tr key={i} className="border-b border-white/10">
                    <Td>{s.day}</Td>
                    <Td>{s.site}</Td>
                    <Td>{s.round}</Td>
                    <Td>{s.officer}</Td>
                    <Td className="text-right">{s.puntosRegistrados}</Td>
                    <Td className="text-right">{s.pasos}</Td>
                    <Td>{fmtDateTime(s.primeraMarca)}</Td>
                    <Td>{fmtDateTime(s.ultimaMarca)}</Td>
                    <Td>{s.duracionText}</Td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}
    </div>
  );
}

function Th({ children }) {
  return <th className="text-left px-3 py-2 whitespace-nowrap">{children}</th>;
}
function Td({ children, className = "" }) {
  return <td className={`px-3 py-2 align-top whitespace-nowrap ${className}`}>{children}</td>;
}
function fmtDateTime(d) {
  try {
    const dt = typeof d === "string" ? new Date(d) : d;
    if (!dt || isNaN(dt.getTime())) return "-";
    // Local friendly; fallback a ISO si el browser no soporta locales
    return dt.toLocaleString?.() || dt.toISOString().slice(0, 19).replace("T", " ");
  } catch {
    return "-";
  }
}
