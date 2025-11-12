// client/src/iam/pages/IamAdmin/components/HeaderRow.jsx
import React from "react";

/** Encabezado sticky en Y; primera celda sticky en X+Y */
export default function HeaderRow({ roles, gridCols }) {
  return (
    <div
      className="
        sticky top-0 z-40
        grid items-center
        bg-neutral-100/95 dark:bg-neutral-900/95 backdrop-blur-sm
        border-b border-neutral-200 dark:border-neutral-800
        px-4 py-3
        text-xs font-semibold uppercase tracking-wide
        text-neutral-600 dark:text-neutral-300
      "
      style={{ gridTemplateColumns: gridCols }}
    >
      {/* Celda Permisos fija a la izquierda y arriba */}
      <div className="sticky left-0 top-0 z-50 bg-neutral-100/95 dark:bg-neutral-900/95 pr-4 shadow-[2px_0_0_0_rgba(0,0,0,0.25)]">
        <span className="text-neutral-800 dark:text-neutral-100">Permisos</span>
      </div>

      {roles.map((r) => (
        <div key={r._id} className="text-center">{r.name || r.code}</div>
      ))}

      <div className="text-center">Acciones</div>
    </div>
  );
}
