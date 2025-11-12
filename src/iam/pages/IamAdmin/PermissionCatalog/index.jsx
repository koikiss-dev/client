// client/src/iam/pages/IamAdmin/PermissionCatalog/index.jsx
import React, { useMemo, useRef, useState, useEffect } from "react";

import { usePermissionCatalogData } from "./hooks/usePermissionCatalogData";
import HeaderRow from "../components/HeaderRow";
import GroupSection from "../components/GroupSection";
import Modal from "../components/Modal";
import { Plus, Eye, Minus, Square } from "lucide-react"; // íconos

export default function PermissionCatalog() {
  const {
    loading, errorMsg, banner,
    roles, groups, roleMatrix, origMatrix,
    query, setQuery, compactView, setCompactView,
    onToggle, onSaveAll, onCreatePerm, onDeletePerm,
  } = usePermissionCatalogData();

  const scrollRef = useRef(null);
  const [openCreate, setOpenCreate] = useState(false);
  const [form, setForm] = useState({ key: "", label: "", moduleValue: "bitacora" });
  const [openDelete, setOpenDelete] = useState(null);

  // Control de módulos desplegados
  const [expandedGroupsCompact, setExpandedGroupsCompact] = useState(() => new Set());
  const [expandedGroupsFull, setExpandedGroupsFull] = useState(() => new Set());

  const toggleGroupCompact = (groupKey) => {
    setExpandedGroupsCompact((prev) => {
      const next = new Set(prev);
      next.has(groupKey) ? next.delete(groupKey) : next.add(groupKey);
      return next;
    });
  };
  const toggleGroupFull = (groupKey) => {
    setExpandedGroupsFull((prev) => {
      const next = new Set(prev);
      next.has(groupKey) ? next.delete(groupKey) : next.add(groupKey);
      return next;
    });
  };

  const colCount = roles.length;
  const gridCols = `minmax(280px,1fr) repeat(${colCount},140px) 110px`;
  const minWidthPx = 280 + colCount * 140 + 110;

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return groups;
    return groups
      .map((g) => ({
        ...g,
        items: g.items.filter(
          (it) =>
            String(it.key).toLowerCase().includes(q) ||
            String(it.label).toLowerCase().includes(q) ||
            String(g.group).toLowerCase().includes(q)
        ),
      }))
      .filter((g) => g.items.length > 0 || compactView);
  }, [groups, query, compactView]);

  // ⬇️ Si estamos en "Mostrar" y aún no hay grupos abiertos, abrir todos por defecto
  useEffect(() => {
    if (!compactView) {
      const all = new Set(
        filtered.map((g, i) => (g.group ? g.group : `g-${i}`))
      );
      if (expandedGroupsFull.size === 0 || [...expandedGroupsFull].some(k => !all.has(k))) {
        setExpandedGroupsFull(all);
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [compactView, filtered]);

  if (loading) return <div className="p-6 text-neutral-300">Cargando permisos…</div>;

  const btnDark =
    "inline-flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium " +
    "bg-neutral-800 text-neutral-200 border border-neutral-700 " +
    "hover:bg-neutral-700/90 transition";
  const btnPrimary =
    "inline-flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold " +
    "bg-emerald-600 text-white border border-emerald-500 " +
    "hover:bg-emerald-500 transition shadow";

  return (
    <div className="space-y-4 layer-content">
      {errorMsg && (
        <div className="rounded-md border border-rose-300 bg-rose-50 text-rose-800 p-3">
          {errorMsg}
        </div>
      )}
      {banner && (
        <div
          className={
            "rounded-md p-3 border " +
            (banner.type === "ok"
              ? "bg-emerald-50 text-emerald-800 border-emerald-300"
              : banner.type === "warn"
              ? "bg-blue-50 text-blue-800 border-blue-300"
              : "bg-rose-50 text-rose-800 border-rose-300")
          }
        >
          {banner.msg}
        </div>
      )}

      {/* Barra superior */}
      <div className="fx-card">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Buscar por clave, etiqueta o módulo…"
            className="input-fx"
            aria-label="Buscar permisos"
          />
          <div className="flex gap-2">
            <button onClick={() => setOpenCreate(true)} className={btnDark}>
              <Plus className="w-4 h-4 opacity-90" />
              <span>Crear permiso</span>
            </button>
            <button
              onClick={() => {
                setCompactView(false);
                // Abrir todos al cambiar a Mostrar
                const all = new Set(
                  filtered.map((g, i) => (g.group ? g.group : `g-${i}`))
                );
                setExpandedGroupsFull(all);
              }}
              className={btnDark}
            >
              <Eye className="w-4 h-4 opacity-90" />
              <span>Mostrar</span>
            </button>
            {/* ⬇ Ver menos: vuelve al listado compacto con TODO colapsado */}
            <button
              onClick={() => {
                setCompactView(true);
                setExpandedGroupsCompact(new Set()); // todos cerrados
                if (scrollRef.current) scrollRef.current.scrollTop = 0;
              }}
              className={btnDark}
            >
              <Minus className="w-4 h-4 opacity-90" />
              <span>Ver menos</span>
            </button>
            <button onClick={onSaveAll} className={btnPrimary}>
              <Square className="w-4 h-4 opacity-95" />
              <span>Guardar</span>
            </button>
          </div>
        </div>
      </div>

      {/* Contenido */}
      {filtered.length === 0 ? (
        <div className="p-6 text-neutral-400">
          No se encontraron permisos para “{query}”.
        </div>
      ) : compactView ? (
        /* ===== VISTA COMPACTA (sticky header, todo colapsado por defecto) ===== */
        <div className="fx-card p-0 overflow-hidden">
          <div className="overflow-auto max-h-[72vh]" ref={scrollRef}>
            <div style={{ minWidth: `${minWidthPx}px` }}>
              {/* Encabezado general FIJO */}
              <div className="sticky top-0 z-20">
                <div className="bg-neutral-900/80 dark:bg-neutral-900/80 border-b border-neutral-800 backdrop-blur supports-[backdrop-filter]:backdrop-blur-md">
                  <HeaderRow roles={roles} gridCols={gridCols} />
                </div>
              </div>

              <div className="divide-y divide-neutral-200 dark:divide-neutral-800">
                {filtered.map((g, idx) => {
                  const groupKey = g.group || `g-${idx}`;
                  const isOpen = expandedGroupsCompact.has(groupKey);

                  return (
                    <div
                      key={`${groupKey}-${idx}`}
                      className="bg-neutral-100/5 dark:bg-neutral-900/30"
                    >
                      {/* Botón de despliegue: oculta el nombre cuando está abierto */}
                      <button
                        type="button"
                        onClick={() => toggleGroupCompact(groupKey)}
                        className="w-full px-4 py-3 flex items-center justify-between hover:bg-white/5 transition"
                      >
                        <div className="flex items-center gap-3">
                          {!isOpen && (
                            <>
                              <span className="font-semibold capitalize text-neutral-100">
                                {g.group}
                              </span>
                              <span className="text-xs font-bold rounded-md px-2 py-0.5 bg-blue-600/15 text-blue-300">
                                {g.items.length}
                              </span>
                            </>
                          )}
                        </div>
                        <span
                          className={`i-lucide:chevron-down transition-transform ${
                            isOpen ? "rotate-180" : ""
                          }`}
                          aria-hidden
                        />
                      </button>

                      {isOpen && (
                        <div className="divide-y divide-neutral-200 dark:divide-neutral-800">
                          <GroupSection
                            key={`${g.group}-compact`}
                            group={g}
                            roles={roles}
                            gridCols={gridCols}
                            roleMatrix={roleMatrix}
                            origMatrix={origMatrix}
                            onToggle={onToggle}
                            onDelete={(it) =>
                              setOpenDelete({
                                id: it._id,
                                key: it.key,
                                label: it.label,
                              })
                            }
                          />
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      ) : (
        /* ===== VISTA NORMAL "MOSTRAR" (sticky header) ===== */
        <div className="fx-card p-0">
          <div ref={scrollRef} className="overflow-auto max-h-[72vh]">
            <div style={{ minWidth: `${minWidthPx}px` }}>
              {/* Encabezado general FIJO */}
              <div className="sticky top-0 z-20">
                <div className="bg-neutral-900/80 dark:bg-neutral-900/80 border-b border-neutral-800 backdrop-blur supports-[backdrop-filter]:backdrop-blur-md">
                  <HeaderRow roles={roles} gridCols={gridCols} />
                </div>
              </div>

              <div className="divide-y divide-neutral-200 dark:divide-neutral-800">
                {filtered.map((g, idx) => {
                  const groupKey = g.group || `g-${idx}`;
                  const isOpen = expandedGroupsFull.has(groupKey);

                  return (
                    <div key={`${groupKey}-${idx}`} className="bg-transparent">
                      <button
                        type="button"
                        onClick={() => toggleGroupFull(groupKey)}
                        className="w-full px-4 py-3 flex items-center justify-between hover:bg-white/5 transition"
                        style={{ gridColumn: "1 / -1" }}
                      >
                        <div className="flex items-center gap-3">
                          {!isOpen && (
                            <>
                              <span className="font-semibold capitalize text-neutral-100">
                                {g.group}
                              </span>
                              <span className="text-xs font-bold rounded-md px-2 py-0.5 bg-blue-600/15 text-blue-300">
                                {g.items.length}
                              </span>
                            </>
                          )}
                        </div>
                        <span
                          className={`i-lucide:chevron-down transition-transform ${
                            isOpen ? "rotate-180" : ""
                          }`}
                          aria-hidden
                        />
                      </button>

                      {isOpen && (
                        <GroupSection
                          key={`${g.group}-full`}
                          group={g}
                          roles={roles}
                          gridCols={gridCols}
                          roleMatrix={roleMatrix}
                          origMatrix={origMatrix}
                          onToggle={onToggle}
                          onDelete={(it) =>
                            setOpenDelete({
                              id: it._id,
                              key: it.key,
                              label: it.label,
                            })
                          }
                        />
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Crear Permiso */}
      <Modal
        open={openCreate}
        title="Crear permiso"
        onClose={() => setOpenCreate(false)}
        footer={
          <div className="flex justify-end gap-2">
            <button onClick={() => setOpenCreate(false)} className={btnDark}>
              Cancelar
            </button>
            <button
              onClick={async () => {
                const ok = await onCreatePerm(form);
                if (ok) setOpenCreate(false);
              }}
              className={btnPrimary}
            >
              Crear
            </button>
          </div>
        }
      >
        <div className="space-y-3">
          <div>
            <label className="block text-sm mb-1 opacity-80">Clave</label>
            <input
              className="input-fx"
              value={form.key}
              onChange={(e) =>
                setForm((prev) => ({ ...prev, key: e.target.value }))
              }
              placeholder="modulo.accion"
            />
          </div>
          <div>
            <label className="block text-sm mb-1 opacity-80">Etiqueta</label>
            <input
              className="input-fx"
              value={form.label}
              onChange={(e) =>
                setForm((prev) => ({ ...prev, label: e.target.value }))
              }
              placeholder="Módulo · Acción"
            />
          </div>
          <div>
            <label className="block text-sm mb-1 opacity-80">Módulo</label>
            <select
              className="input-fx"
              value={form.moduleValue}
              onChange={(e) =>
                setForm((prev) => ({ ...prev, moduleValue: e.target.value }))
              }
            >
              <option value="bitacora">Bitácora</option>
              <option value="acceso">Control de Acceso</option>
              <option value="evaluacion">Evaluación</option>
              <option value="iam">IAM</option>
              <option value="incidentes">Incidentes</option>
              <option value="rondas">Rondas</option>
              <option value="supervision">Supervisión</option>
              <option value="visitas">Visitas</option>
            </select>
          </div>
        </div>
      </Modal>

      {/* Eliminar */}
      <Modal
        open={!!openDelete}
        title="Eliminar permiso"
        onClose={() => setOpenDelete(null)}
        footer={
          <div className="flex justify-end gap-2">
            <button onClick={() => setOpenDelete(null)} className={btnDark}>
              Cancelar
            </button>
            <button
              onClick={async () => {
                await onDeletePerm(openDelete);
                setOpenDelete(null);
              }}
              className="px-4 py-2 rounded-xl text-sm font-semibold text-white bg-rose-600 hover:bg-rose-500 transition border border-rose-500 shadow"
            >
              Eliminar
            </button>
          </div>
        }
      >
        {openDelete && (
          <p className="text-sm">
            ¿Seguro que deseas eliminar{" "}
            <span className="font-semibold">{openDelete.label}</span>?
            <br />
            <span className="font-mono opacity-80">{openDelete.key}</span>
          </p>
        )}
      </Modal>
    </div>
  );
}