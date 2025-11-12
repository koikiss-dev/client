import React, { useEffect, useMemo, useState } from "react";
import { iamApi } from "../../api/iamApi";

export default function RoleCloneDialog({ open, onClose, roles, onCloned }) {
  const [fromId, setFromId] = useState("");
  const [name, setName] = useState("");
  const [code, setCode] = useState("");
  const [includePerms, setIncludePerms] = useState(true);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState("");

  useEffect(() => {
    if (open) {
      setFromId("");
      setName("");
      setCode("");
      setIncludePerms(true);
      setBusy(false);
      setMsg("");
    }
  }, [open]);

  const from = useMemo(() => roles.find(r => r._id === fromId) || null, [fromId, roles]);

  async function onSubmit() {
    if (!from || !name.trim()) { setMsg("Selecciona el rol a clonar y un nombre."); return; }
    try {
      setBusy(true); setMsg("");
      const newCode = code.trim() || name.trim().toLowerCase().replace(/\s+/g, "_").replace(/[^a-z0-9_]/g, "");
      const created = await iamApi.createRoleWithPerms({
        code: newCode,
        name: name.trim(),
        description: `Clonado de ${from.name}`,
        permissions: includePerms ? from.permissions || [] : []
      });
      onCloned?.(created);
      onClose?.();
    } catch (e) {
      setMsg(e?.message || "No se pudo clonar el rol");
    } finally {
      setBusy(false);
    }
  }

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-40 flex items-end sm:items-center justify-center bg-black/40 p-3">
      <div className="w-full max-w-lg rounded-2xl bg-white dark:bg-gray-900 shadow-xl overflow-hidden">
        <div className="px-5 py-4 border-b border-gray-200 dark:border-gray-800">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">Clonar rol</h3>
        </div>
        <div className="p-5 space-y-4">
          <div className="space-y-1">
            <label className="text-sm text-gray-600 dark:text-gray-300">Rol origen</label>
            <select
              value={fromId}
              onChange={e=>setFromId(e.target.value)}
              className="w-full px-3 py-2 rounded border bg-white/70 dark:bg-gray-800 dark:border-gray-700 dark:text-gray-100"
            >
              <option value="">Selecciona…</option>
              {roles.map(r => <option key={r._id} value={r._id}>{r.name}</option>)}
            </select>
          </div>

          <div className="space-y-1">
            <label className="text-sm text-gray-600 dark:text-gray-300">Nombre del nuevo rol</label>
            <input
              value={name} onChange={e=>setName(e.target.value)}
              placeholder="Ej. Operador Senior"
              className="w-full px-3 py-2 rounded border bg-white/70 dark:bg-gray-800 dark:border-gray-700 dark:text-gray-100"
            />
          </div>

          <div className="space-y-1">
            <label className="text-sm text-gray-600 dark:text-gray-300">Código (opcional)</label>
            <input
              value={code} onChange={e=>setCode(e.target.value)}
              placeholder="operador_senior"
              className="w-full px-3 py-2 rounded border bg-white/70 dark:bg-gray-800 dark:border-gray-700 dark:text-gray-100 font-mono text-sm"
            />
          </div>

          <label className="flex items-center gap-2">
            <input type="checkbox" className="h-4 w-4" checked={includePerms} onChange={e=>setIncludePerms(e.target.checked)} />
            <span className="text-sm text-gray-700 dark:text-gray-300">Incluir permisos del rol origen</span>
          </label>

          {msg && <div className="text-sm text-red-600 dark:text-red-400">{msg}</div>}
        </div>

        <div className="px-5 py-4 border-t border-gray-200 dark:border-gray-800 flex gap-2 justify-end">
          <button onClick={onClose} className="px-3 py-2 rounded bg-gray-200 dark:bg-gray-800 dark:text-gray-100">Cancelar</button>
          <button onClick={onSubmit} disabled={busy || !fromId || !name.trim()} className="px-3 py-2 rounded bg-indigo-600 text-white disabled:opacity-60">
            {busy ? "Clonando…" : "Clonar"}
          </button>
        </div>
      </div>
    </div>
  );
}
