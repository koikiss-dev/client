import React, { useMemo } from "react";

/**
 * items: de /reports/detailed
 * [{
 *   hardwareId, qr, site, round, point, at, officer, lat, lon, message, steps, day
 * }]
 */
export default function DetailedMarks({ items = [] }) {
  // Agrupar por sitio/ronda/oficial/día para insertar la franja amarilla entre bloques
  const groups = useMemo(() => {
    const key = (r) => [r.site || "-", r.round || "-", r.officer || "-", r.day || "-"].join("::");
    const map = new Map();
    for (const r of items) {
      const k = key(r);
      if (!map.has(k)) map.set(k, []);
      map.get(k).push(r);
    }
    for (const arr of map.values()) {
      arr.sort((a, b) => new Date(a.at) - new Date(b.at));
    }
    return Array.from(map.entries()).map(([k, rows]) => ({ k, rows }));
  }, [items]);

  return (
    <div className="rounded-2xl border border-white/10 bg-white/5 backdrop-blur p-4 shadow-lg">
      <h3 className="font-semibold text-lg mb-3">Despliegue detallado – Marcación por marcación</h3>

      {!items.length ? (
        <div className="text-sm text-white/70">No hay marcas en el rango.</div>
      ) : (
        <div className="overflow-auto">
          <table className="min-w-[1100px] text-sm border-separate" style={{ borderSpacing: 0 }}>
            <thead>
              <tr className="bg-white/10 text-white/90">
                <Th>Hardware ID</Th>
                <Th>QR No.</Th>
                <Th>Nombre Sitio</Th>
                <Th>Ronda</Th>
                <Th>Nombre punto</Th>
                <Th>Fecha / Hora</Th>
                <Th>Vigilante</Th>
                <Th>Latitud</Th>
                <Th>Longitud</Th>
                <Th>Mensaje</Th>
                <Th className="text-right">Pasos</Th>
              </tr>
            </thead>
            <tbody>
              {groups.map(({ rows }, gi) => {
                const first = rows[0];
                const last  = rows[rows.length - 1];
                const puntos = rows.length;
                const pasos  = rows.reduce((a, b) => a + (b.steps || 0), 0);

                const banner = [
                  "Reporte:",
                  first?.site || "-",
                  first?.round ? `/ ${first.round}` : "",
                  " : ",
                  durationText(rows),
                  " : (",
                  fmtDateTime(first?.at),
                  " - ",
                  fmtDateTime(last?.at),
                  ") : Puntos: ",
                  puntos,
                  " : Pasos: ",
                  pasos,
                  " : Omisiones: 0",
                ].join("");

                return (
                  <React.Fragment key={gi}>
                    {rows.map((r, i) => (
                      <tr key={i} className="border-b border-white/10">
                        <Td>{r.hardwareId || ""}</Td>
                        <Td>{r.qr || ""}</Td>
                        <Td>{r.site || ""}</Td>
                        <Td>{r.round || ""}</Td>
                        <Td>{r.point || ""}</Td>
                        <Td>{fmtDateTime(r.at)}</Td>
                        <Td>{r.officer || ""}</Td>
                        <Td>{isNum(r.lat) ? r.lat : ""}</Td>
                        <Td>{isNum(r.lon) ? r.lon : ""}</Td>
                        <Td className="max-w-[320px] truncate" title={r.message || ""}>
                          {r.message || ""}
                        </Td>
                        <Td className="text-right">{r.steps ?? 0}</Td>
                      </tr>
                    ))}

                    {/* Franja amarilla estilo lámina */}
                    <tr>
                      <td colSpan={11} className="px-0">
                        <div className="bg-yellow-400 text-black font-semibold font-mono text-xs px-3 py-2">
                          {banner}
                        </div>
                      </td>
                    </tr>
                  </React.Fragment>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

function Th({ children, className = "" }) {
  return <th className={`text-left px-3 py-2 whitespace-nowrap ${className}`}>{children}</th>;
}
function Td({ children, className = "" }) {
  return <td className={`px-3 py-2 align-top ${className}`}>{children}</td>;
}

function fmtDateTime(d) {
  try {
    const dt = typeof d === "string" ? new Date(d) : d;
    return isNaN(dt?.getTime?.()) ? "-" : dt.toISOString().slice(0, 19).replace("T", " ");
  } catch {
    return "-";
  }
}
function isNum(n) {
  return typeof n === "number" && isFinite(n);
}
function durationText(rows) {
  if (!rows.length) return "-";
  const first = new Date(rows[0].at);
  const last  = new Date(rows[rows.length - 1].at);
  const secs  = Math.max(0, Math.round((last - first) / 1000));
  const dd = Math.floor(secs / 86400);
  const hh = Math.floor((secs % 86400) / 3600);
  const mm = Math.floor((secs % 3600) / 60);
  const ss = secs % 60;
  return `Duración ${dd} días - ${String(hh).padStart(2, "0")} Horas - ${String(mm).padStart(
    2,
    "0"
  )} Minutos - ${String(ss).padStart(2, "0")} Segundos`;
}
