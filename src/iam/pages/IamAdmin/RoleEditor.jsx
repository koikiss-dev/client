// client/src/iam/pages/IamAdmin/RoleEditor.jsx
import React, { useMemo, useRef, useState } from "react";
import { iamApi } from "../../api/iamApi";

// Pon esto en true si tu backend entiende el comodín "*"
const BACKEND_SUPPORTS_WILDCARD = true;

export default function RoleEditor({ role, perms, onChanged }) {
  const [form, setForm] = useState(() => ({
    _id: role?._id,
    name: role?.name || "",
    description: role?.description || "",
    permissions: Array.isArray(role?.permissions) ? role.permissions : [],
  }));

  // Guarda el último set de permisos "granulares" para restaurarlo al desactivar "*"
  const lastGranularRef = useRef(
    (role?.permissions || []).filter((k) => k !== "*")
  );

  // Todas las keys disponibles (para expandir * si el backend no lo soporta)
  const allKeys = useMemo(
    () =>
      (perms || [])
        .map((p) => p.key)
        .filter(Boolean)
        .sort((a, b) => a.localeCompare(b)),
    [perms]
  );

  // Agrupar permisos por módulo
  const groups = useMemo(() => {
    const map = new Map();
    (perms || []).forEach((p) => {
      const g = p.group || "General";
      if (!map.has(g)) map.set(g, []);
      map.get(g).push(p);
    });
    return [...map.entries()].map(([group, items]) => ({
      group,
      items: items
        .slice()
        .sort(
          (a, b) =>
            (Number.isFinite(a.order) ? a.order : 0) -
              (Number.isFinite(b.order) ? b.order : 0) ||
            String(a.key || "").localeCompare(String(b.key || ""))
        ),
    }));
  }, [perms]);

  const hasAll = form.permissions.includes("*");
  const has = (key) => (form.permissions || []).includes(key);

  const setPerms = (next) => setForm((f) => ({ ...f, permissions: next }));

  const toggle = (key) => {
    if (hasAll) return; // con "*" activo, no se pueden cambiar individuales
    const set = new Set(form.permissions || []);
    set.has(key) ? set.delete(key) : set.add(key);
    setPerms([...set]);
    lastGranularRef.current = [...set];
  };

  const selectGroup = (group, turnOn) => {
    if (hasAll) return;
    const keys = (groups.find((g) => g.group === group)?.items || []).map(
      (i) => i.key
    );
    const set = new Set(form.permissions || []);
    keys.forEach((k) => (turnOn ? set.add(k) : set.delete(k)));
    const arr = [...set];
    setPerms(arr);
    lastGranularRef.current = arr;
  };

  const toggleAllSwitch = (on) => {
    if (on) {
      // Guarda el snapshot granular y activa "*"
      lastGranularRef.current = (form.permissions || []).filter((k) => k !== "*");
      setPerms(["*"]);
    } else {
      // Restaura el snapshot granular
      setPerms(lastGranularRef.current.length ? lastGranularRef.current : []);
    }
  };

  const save = async () => {
    let permissions = form.permissions;

    // Si tu backend NO soporta "*", expándelo a todas las keys aquí
    if (!BACKEND_SUPPORTS_WILDCARD && permissions.includes("*")) {
      permissions = allKeys;
    }

    const payload = {
      name: form.name,
      description: form.description,
      permissions,
    };

    if (form._id) await iamApi.updateRole(form._id, payload);
    else await iamApi.createRole(payload);

    onChanged?.();
  };

  const remove = async () => {
    if (!form._id) return;
    if (!confirm("¿Eliminar rol?")) return;
    await iamApi.deleteRole(form._id);
    onChanged?.();
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-2">
        <input
          className="border rounded px-3 py-2"
          placeholder="Nombre del rol"
          value={form.name}
          onChange={(e) => setForm({ ...form, name: e.target.value })}
        />
        <input
          className="border rounded px-3 py-2"
          placeholder="Descripción"
          value={form.description}
          onChange={(e) => setForm({ ...form, description: e.target.value })}
        />
      </div>

      <div className="rounded border p-3 flex items-center justify-between">
        <label className="inline-flex items-center gap-2">
          <input
            type="checkbox"
            checked={hasAll}
            onChange={(e) => toggleAllSwitch(e.target.checked)}
          />
          <span>Todos los permisos (*)</span>
        </label>
        {hasAll && (
          <span className="text-xs px-2 py-1 rounded bg-amber-100 text-amber-800">
            Concedido el 100% de permisos — los checks están bloqueados
          </span>
        )}
      </div>

      {/* Matriz por grupos */}
      <div className="space-y-4">
        {groups.map((g) => (
          <div key={g.group} className="border rounded p-3">
            <div className="flex items-center justify-between">
              <div className="font-medium">{g.group}</div>
              <div className="flex gap-2">
                <button
                  type="button"
                  className="text-sm px-2 py-1 rounded bg-gray-200 disabled:opacity-60"
                  onClick={() => selectGroup(g.group, true)}
                  disabled={hasAll}
                >
                  Seleccionar todo
                </button>
                <button
                  type="button"
                  className="text-sm px-2 py-1 rounded bg-gray-200 disabled:opacity-60"
                  onClick={() => selectGroup(g.group, false)}
                  disabled={hasAll}
                >
                  Quitar todo
                </button>
              </div>
            </div>

            <div className="mt-2 grid grid-cols-1 md:grid-cols-2 gap-2">
              {g.items.map((p) => (
                <label
                  key={p._id || p.key}
                  className={`flex items-center gap-2 border rounded px-2 py-2 ${
                    hasAll ? "opacity-60" : ""
                  }`}
                >
                  <input
                    type="checkbox"
                    checked={hasAll ? true : has(p.key)}
                    onChange={() => toggle(p.key)}
                    disabled={hasAll}
                  />
                  <span className="text-sm">{p.label}</span>
                  <span className="text-[10px] text-gray-500 ml-auto font-mono">
                    {p.key}
                  </span>
                </label>
              ))}
            </div>
          </div>
        ))}
      </div>

      <div className="flex justify-end gap-2">
        {form._id && (
          <button
            className="px-3 py-2 rounded bg-red-600 text-white"
            onClick={remove}
          >
            Eliminar
          </button>
        )}
        <button className="px-3 py-2 rounded bg-blue-600 text-white" onClick={save}>
          Guardar
        </button>
      </div>
    </div>
  );
}
