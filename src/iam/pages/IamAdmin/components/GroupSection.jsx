import React from "react";
import PermissionRow from "./PermissionRow";

export default function GroupSection({
  group,
  roles,
  gridCols,
  roleMatrix,
  origMatrix,
  onToggle,
  onDelete,
}) {
  return (
    <div className="group-section">
      {/* Cabecera del grupo: nombre del módulo fijo a la izquierda */}
      <div
        className="
          grid items-center text-sm font-semibold uppercase tracking-wide
          bg-neutral-900/90 dark:bg-neutral-900/90 backdrop-blur-sm
          border-y border-neutral-800 text-neutral-200
        "
        style={{ gridTemplateColumns: gridCols }}
      >
        <div
          className="
            sticky left-0 z-40 bg-neutral-900/95 dark:bg-neutral-900/95
            px-4 py-2 flex items-center gap-2 shadow-[2px_0_0_rgba(0,0,0,0.35)]
          "
        >
          <span className="text-base font-bold capitalize">{group.group}</span>
          <span className="text-xs font-bold rounded-md px-2 py-0.5 bg-blue-600/25 text-blue-300">
            {group.items.length}
          </span>
        </div>
        <div className="col-span-full h-full" />
      </div>

      {/* Filas de permisos */}
      {group.items.map((item) => {
        const flags = roleMatrix[item.key] || {};
        const origFlags = origMatrix[item.key] || {};
        const dirty = JSON.stringify(flags) !== JSON.stringify(origFlags);
        return (
          <PermissionRow
            key={item._id || item.key}
            item={item}
            roles={roles}
            gridCols={gridCols}
            flags={flags}
            dirty={dirty}
            onToggle={onToggle}
            onDelete={onDelete}
          />
        );
      })}
    </div>
  );
}
