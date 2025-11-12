// client/src/iam/pages/IamAdmin/RolesPage.jsx
import React, { useEffect, useMemo, useState } from "react";
import { iamApi } from "../../api/iamApi";
import RoleCloneDialog from "./RoleCloneDialog";
import {
  PlusCircle,
  Edit3,
  Trash2,
  Save,
  RefreshCw,
  ShieldCheck,
  ChevronDown,
} from "lucide-react";

/* ──────────────────────────────────────────────────────────────
   Config inicial (tus roles visibles por etiqueta)
   ────────────────────────────────────────────────────────────── */
const DISPLAY_ROLES = [
  { code: "admin", name: "Administrador" },
  { code: "supervisor", name: "Supervisor" },
  { code: "guardia", name: "Guardia" },
  { code: "ti", name: "Administrador IT" },
  { code: "visita_externa", name: "Visita Externa" },
];

const CODE_TO_LABEL = Object.fromEntries(DISPLAY_ROLES.map((r) => [r.code, r.name]));
function roleLabel(r) {
  const code = String(r.code || "").toLowerCase();
  return CODE_TO_LABEL[code] || r.name || r.code || "(sin nombre)";
}

export default function RolesPage() {
  const [roles, setRoles] = useState([]);
  const [roleId, setRoleId] = useState(null);
  const [working, setWorking] = useState(false);
  const [msg, setMsg] = useState("");
  const [cloneOpen, setCloneOpen] = useState(false);

  // Catálogo de permisos ANOTADO para el rol seleccionado (viene del backend)
  const [permItems, setPermItems] = useState([]); // items: [{_id,key,label,group,order,selected}, ...]
  const [permLoading, setPermLoading] = useState(false);

  async function loadAll() {
    const rRoles = await iamApi.listRoles();
    const items = rRoles?.items || rRoles?.roles || [];
    setRoles(items);
    const adminId =
      items.find((x) => String(x.code || "").toLowerCase() === "admin")?._id ||
      items.find((x) => String(x.name || "").toLowerCase() === "administrador")?._id ||
      items[0]?._id ||
      null;
    setRoleId((v) => v || adminId);
  }

  async function loadPermsForRole(id) {
    if (!id) {
      setPermItems([]);
      return;
    }
    setPermLoading(true);
    try {
      const r = await iamApi.listPermsForRole(id); // GET /permissions?role=<id> -> { items }
      const items = Array.isArray(r?.items) ? r.items : [];
      setPermItems(items);
    } catch (e) {
      setPermItems([]);
      setMsg(e?.message || "Error al cargar permisos");
      setTimeout(() => setMsg(""), 2200);
    } finally {
      setPermLoading(false);
    }
  }

  useEffect(() => {
    loadAll().catch((e) => setMsg(e?.message || "Error al cargar"));
  }, []);

  useEffect(() => {
    loadPermsForRole(roleId);
  }, [roleId]);

  const selected = roles.find((r) => r._id === roleId) || null;

  /* ──────────────────────────────────────────────────────────────
     Resumen derivado: agrupa SOLO los permisos selected=true
     ────────────────────────────────────────────────────────────── */
  const rolePermSummary = useMemo(() => {
    if (!permItems || permItems.length === 0) return { count: 0, byGroup: [] };

    const byGroupMap = new Map();
    let total = 0;

    for (const p of permItems) {
      if (!p?.selected) continue; // solo los asignados al rol
      const g = String(p.group || "General");
      if (!byGroupMap.has(g)) byGroupMap.set(g, []);
      byGroupMap.get(g).push({ key: p.key, label: p.label, group: g });
      total++;
    }

    const groups = [...byGroupMap.entries()]
      .map(([group, items]) => ({
        group,
        items: items.sort((a, b) => String(a.label).localeCompare(String(b.label))),
      }))
      .sort((a, b) => String(a.group).localeCompare(String(b.group)));

    return { count: total, byGroup: groups };
  }, [permItems]);

  /* ──────────────────────────────────────────────────────────────
     Acciones
     ────────────────────────────────────────────────────────────── */
  async function save() {
    // Actualmente no editas permisos desde esta pantalla (solo ves el resumen).
    // Dejamos el "Guardar" por si agregas inputs inline de nombre/desc más adelante.
    if (!selected) return;
    setWorking(true);
    setMsg("");
    try {
      await iamApi.updateRole(selected._id, {
        name: selected.name,
        description: selected.description,
      });
      setMsg("Cambios guardados.");
      await loadAll();
    } catch (e) {
      setMsg(e?.message || "Error al guardar");
    } finally {
      setWorking(false);
      setTimeout(() => setMsg(""), 2200);
    }
  }

  async function createRole() {
    try {
      const name = window.prompt("Nombre del nuevo rol:");
      if (!name) return;
      const code = name
        .toLowerCase()
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .replace(/\s+/g, "_")
        .replace(/[^a-z0-9_]/g, "");
      await iamApi.createRole({
        code: code || undefined,
        name,
        description: name,
        permissions: [], // se inicia vacío
      });
      await loadAll();
      setMsg("Rol creado.");
      setTimeout(() => setMsg(""), 2000);
    } catch (e) {
      setMsg(e?.message || "No se pudo crear el rol");
      setTimeout(() => setMsg(""), 2200);
    }
  }

  async function editRole() {
    if (!selected) return;
    try {
      const newName = window.prompt("Nuevo nombre del rol:", selected.name || "");
      if (!newName) return;
      const newDesc =
        window.prompt("Nueva descripción:", selected.description || newName) ?? selected.description;
      await iamApi.updateRole(selected._id, {
        name: newName,
        description: newDesc,
      });
      await loadAll();
      setMsg("Rol actualizado.");
      setTimeout(() => setMsg(""), 2000);
    } catch (e) {
      setMsg(e?.message || "No se pudo editar el rol");
      setTimeout(() => setMsg(""), 2200);
    }
  }

  async function deleteRole() {
    if (!selected) return;
    try {
      if (!window.confirm(`¿Eliminar el rol "${selected.name || selected.code}"?`)) return;
      await iamApi.deleteRole(selected._id);
      await loadAll();
      setMsg("Rol eliminado.");
      setTimeout(() => setMsg(""), 2000);
    } catch (e) {
      setMsg(e?.message || "No se pudo eliminar el rol");
      setTimeout(() => setMsg(""), 2200);
    }
  }

  const refreshPermCatalog = () => loadPermsForRole(roleId);

  /* ──────────────────────────────────────────────────────────────
     UI
     ────────────────────────────────────────────────────────────── */
  return (
    <section className="space-y-6">
      {/* Header bonito */}
      <div
        className="
        relative overflow-hidden rounded-3xl border border-indigo-200/50 dark:border-indigo-900/40
        bg-gradient-to-tr from-indigo-50 via-sky-50 to-teal-50 dark:from-slate-900 dark:via-slate-900 dark:to-slate-900
        shadow-sm
      "
      >
        {/* glow decorativo */}
        <div className="pointer-events-none absolute -top-24 -right-24 h-48 w-48 rounded-full bg-indigo-400/20 blur-3xl" />
        <div className="pointer-events-none absolute -bottom-24 -left-24 h-48 w-48 rounded-full bg-sky-400/20 blur-3xl" />
        <div className="relative p-5">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-end">
            <div className="flex-1">
              <div className="flex items-center gap-2 text-indigo-700 dark:text-indigo-300">
                <ShieldCheck className="h-5 w-5" />
                <span className="text-xs uppercase tracking-wider font-semibold">
                  Gestión de roles
                </span>
              </div>
              <div className="mt-2">
                <label className="text-xs uppercase tracking-wide text-slate-500 dark:text-slate-400">
                  Rol
                </label>
                <div className="relative">
                  <ChevronDown className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                  <select
                    value={roleId || ""}
                    onChange={(e) => setRoleId(e.target.value)}
                    className="
                      w-full appearance-none rounded-2xl border border-slate-200 bg-white/90 pl-3 pr-9 py-2
                      shadow-inner outline-none transition focus:ring-2 focus:ring-indigo-400
                      dark:bg-slate-800/80 dark:border-slate-700 dark:text-slate-100
                    "
                  >
                    <option value="" disabled>
                      Selecciona un rol…
                    </option>
                    {roles.map((r) => (
                      <option key={r._id} value={r._id}>
                        {roleLabel(r)}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            </div>

            {/* Botonera con estilo pill */}
            <div className="flex flex-wrap gap-2">
              <button
                onClick={createRole}
                title="Crear nuevo rol"
                className="inline-flex items-center gap-2 rounded-full bg-emerald-600 px-3 py-2 text-white shadow-sm transition hover:brightness-110 active:scale-[.99]"
              >
                <PlusCircle className="h-4 w-4" />
                <span className="text-sm font-medium">Crear</span>
              </button>

              <button
                onClick={editRole}
                title="Editar rol"
                disabled={!selected || working}
                className="inline-flex items-center gap-2 rounded-full bg-indigo-600 px-3 py-2 text-white shadow-sm transition hover:brightness-110 disabled:opacity-50 active:scale-[.99]"
              >
                <Edit3 className="h-4 w-4" />
                <span className="text-sm font-medium">Editar</span>
              </button>

              <button
                onClick={deleteRole}
                title="Eliminar rol"
                disabled={!selected || working}
                className="inline-flex items-center gap-2 rounded-full bg-rose-600 px-3 py-2 text-white shadow-sm transition hover:brightness-110 disabled:opacity-50 active:scale-[.99]"
              >
                <Trash2 className="h-4 w-4" />
                <span className="text-sm font-medium">Eliminar</span>
              </button>

              <button
                onClick={save}
                title="Guardar cambios"
                disabled={!selected || working}
                className="inline-flex items-center gap-2 rounded-full bg-slate-900 px-3 py-2 text-white shadow-sm transition hover:brightness-110 disabled:opacity-50 active:scale-[.99] dark:bg-slate-700"
              >
                <Save className="h-4 w-4" />
                <span className="text-sm font-medium">Guardar</span>
              </button>
            </div>
          </div>

          {msg && (
            <div className="mt-4 inline-flex items-center gap-2 rounded-xl border border-emerald-300/60 bg-emerald-52 px-3 py-2 text-emerald-700 dark:bg-emerald-900/20 dark:border-emerald-800 dark:text-emerald-300">
              <span className="inline-block h-2 w-2 rounded-full bg-emerald-500" />
              <span className="text-sm">{msg}</span>
            </div>
          )}
        </div>
      </div>

      {/* Panel: permisos del rol */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h4 className="text-lg font-semibold text-slate-900 dark:text-slate-100">
            Permisos del rol seleccionado
          </h4>
          <button
            onClick={refreshPermCatalog}
            disabled={!roleId || permLoading}
            className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700 shadow-sm transition hover:shadow disabled:opacity-60 dark:bg-slate-800 dark:text-slate-100 dark:border-slate-700"
            title="Volver a leer permisos desde el servidor"
          >
            <RefreshCw className={`h-4 w-4 ${permLoading ? "animate-spin" : ""}`} />
            Refrescar
          </button>
        </div>

        <div
          className="
          overflow-hidden rounded-3xl border border-slate-200/70 bg-white shadow-sm
          dark:bg-slate-900/60 dark:border-slate-800
        "
        >
          {!roleId ? (
            <div className="p-6 text-sm text-slate-600 dark:text-slate-300">
              Selecciona un rol para ver sus permisos.
            </div>
          ) : permLoading ? (
            <div className="p-6 text-sm text-slate-600 dark:text-slate-300">Cargando…</div>
          ) : rolePermSummary.count === 0 ? (
            <div className="p-6 text-sm text-slate-600 dark:text-slate-300">
              Este rol no tiene permisos asignados.
            </div>
          ) : (
            <>
              {/* Encabezado suave */}
              <div className="flex items-center justify-between px-5 py-3 bg-gradient-to-r from-slate-50 to-indigo-50 dark:from-slate-900/50 dark:to-slate-900/80 border-b border-slate-200 dark:border-slate-800">
                <div className="text-xs font-semibold uppercase tracking-wider text-slate-600 dark:text-slate-300">
                  Total permisos
                </div>
                <div className="rounded-full bg-indigo-600/90 px-3 py-1 text-xs font-bold text-white shadow">
                  {rolePermSummary.count}
                </div>
              </div>

              {/* Lista de grupos y permisos */}
              <div className="divide-y divide-slate-200 dark:divide-slate-800">
                {rolePermSummary.byGroup.map((g) => (
                  <div key={g.group} className="p-4 sm:p-5">
                    <div className="mb-2 flex items-center gap-2">
                      <span className="inline-flex h-6 w-6 items-center justify-center rounded-xl bg-indigo-100 text-indigo-700 dark:bg-indigo-900/40 dark:text-indigo-300">
                        <ChevronDown className="h-4 w-4" />
                      </span>
                      <span className="font-semibold text-slate-900 dark:text-slate-100">
                        {g.group}
                      </span>
                      <span className="rounded-full bg-indigo-600/10 px-2 py-0.5 text-xs font-semibold text-indigo-700 dark:text-indigo-300">
                        {g.items.length}
                      </span>
                    </div>

                    {/* Chips de permisos */}
                    <ul className="mt-2 grid gap-2 md:grid-cols-2 xl:grid-cols-3">
                      {g.items.map((it) => (
                        <li
                          key={it.key}
                          className="
                            group flex items-center gap-2 rounded-2xl border border-slate-200 bg-gradient-to-r from-white to-slate-50/60 px-3 py-2
                            shadow-sm transition hover:shadow-md
                            dark:from-slate-900/60 dark:to-slate-900/20 dark:border-slate-800
                          "
                        >
                          <span className="inline-block h-1.5 w-1.5 flex-none rounded-full bg-indigo-500 group-hover:scale-125 transition" />
                          <span className="font-mono text-[11px] leading-5 text-slate-500 dark:text-slate-400 truncate">
                            {it.key}
                          </span>
                          <span className="text-sm text-slate-800 dark:text-slate-200">— {it.label}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                ))}
              </div>
            </>
          )}
        </div>
      </div>

      <RoleCloneDialog
        open={cloneOpen}
        onClose={() => setCloneOpen(false)}
        roles={roles}
        onCloned={() => {
          loadAll();
          loadPermsForRole(roleId);
        }}
      />
    </section>
  );
}
