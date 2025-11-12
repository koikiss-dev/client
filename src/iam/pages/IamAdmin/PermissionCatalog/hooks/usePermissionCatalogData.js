// client/src/iam/pages/IamAdmin/PermissionCatalog/usePermissionCatalogData.js
import { useEffect, useMemo, useState } from "react";
import { iamApi } from "../../../../api/iamApi";
import {
  normalizeAndMergeGroups,
  MODULES,
  emptyFlagsForRoles,
  coerceFlagsByRoleIds
} from "../utils/catalogUtils";

/* ──────────────────────────────────────────────────────────────
   Helpers para evitar la duplicación del nombre del módulo
   ────────────────────────────────────────────────────────────── */

/** Detecta filas "encabezado fantasma" dentro de items */
function isHeaderLikeItem(it = {}, groupName = "") {
  const key = String(it.key || "").trim();
  const label = String(it.label || "").trim();
  const g = String(groupName || "").trim();

  const keyLooksHeader =
    key &&
    !key.includes(".") &&
    (key.toLowerCase() === g.toLowerCase() ||
      key.replace(/[_-]/g, " ").toLowerCase() === g.toLowerCase());

  const labelLooksHeader =
    label &&
    (label.toLowerCase() === g.toLowerCase() ||
      label.replace(/[_-]/g, " ").toLowerCase() === g.toLowerCase());

  const missingKeyButLabelMatches = !key && labelLooksHeader;

  return keyLooksHeader || labelLooksHeader || missingKeyButLabelMatches;
}

/** Fusiona grupos con el mismo nombre para que solo exista UN encabezado por módulo */
function mergeGroupsByName(groups = []) {
  const byName = new Map();
  for (const g of groups) {
    const name = String(g.group || "General").trim();
    const norm = name.toLowerCase();
    const existing = byName.get(norm);
    if (!existing) {
      byName.set(norm, {
        group: name,
        items: Array.isArray(g.items) ? g.items.slice() : [],
      });
    } else {
      existing.items = [
        ...existing.items,
        ...(Array.isArray(g.items) ? g.items : []),
      ];
    }
  }
  return Array.from(byName.values());
}

/**
 * Elimina SIEMPRE los headers-fantasma en items y ordena.
 * (Requisito: no mostrar encabezados dentro de cada grupo)
 */
function sanitizeGroups(groups = []) {
  return groups
    .map((g) => {
      const cleanItems = (g.items || []).filter(
        (it) => !isHeaderLikeItem(it, g.group)
      );
      cleanItems.sort((a, b) =>
        String(a.label || a.key || "").localeCompare(
          String(b.label || b.key || "")
        )
      );
      return { group: g.group, items: cleanItems };
    })
    .sort((a, b) => String(a.group).localeCompare(String(b.group)));
}

export function usePermissionCatalogData() {
  const [loading, setLoading] = useState(true);
  const [errorMsg, setError] = useState("");
  const [banner, setBanner] = useState(null);

  const [roles, setRoles] = useState([]);
  // Grupos RAW normalizados/mergeados para recalcular cuando sea necesario
  const [rawGroups, setRawGroups] = useState([]);
  const [groups, setGroups] = useState([]);

  // roleMatrix: { [permKey]: { [roleId]: boolean } }
  const [roleMatrix, setRoleMatrix] = useState({});
  const [origMatrix, setOrigMatrix] = useState({});

  const [query, setQuery] = useState("");
  // Controla la vista "Ver menos" desde la UI
  const [compactView, setCompactView] = useState(false);

  useEffect(() => {
    (async () => {
      setLoading(true);
      try {
        // Roles
        const rRoles = await iamApi.listRoles();
        const roleItems = (rRoles?.items || [])
          .slice()
          .sort((a, b) =>
            String(a.name || a.code).localeCompare(String(b.name || b.code))
          );
        setRoles(roleItems);

        // Catálogo crudo
        const rPerms = await iamApi.listPerms(); // { items, groups }
        const normalized = normalizeAndMergeGroups(rPerms?.groups || []);

        // 1) Unir grupos duplicados por nombre (RAW)
        const merged = mergeGroupsByName(normalized);
        setRawGroups(merged);

        // 2) Saneado FINAL (sin headers internos)
        const prepared = sanitizeGroups(merged);
        setGroups(prepared);

        // Base matrix (derivada de los items saneados)
        const base = {};
        for (const g of prepared) {
          for (const it of g.items) base[it.key] = emptyFlagsForRoles(roleItems);
        }

        // Rellenar por rol
        const filled = { ...base };
        for (const role of roleItems) {
          const r = await iamApi.getRolePerms(role._id); // { permissionKeys: string[] }
          const setKeys = new Set(r?.permissionKeys || []);
          for (const k of Object.keys(filled))
            if (setKeys.has(k)) filled[k][role._id] = true;
        }

        setRoleMatrix(filled);
        setOrigMatrix(JSON.parse(JSON.stringify(filled)));
        setError("");
      } catch (e) {
        setError(e?.message || "No se pudo cargar el catálogo de permisos.");
        setRawGroups([]);
        setGroups([]);
        setRoleMatrix({});
        setOrigMatrix({});
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  // Si el usuario alterna "Ver menos/Mostrar", mantenemos el saneado SIN headers
  useEffect(() => {
    if (!rawGroups || rawGroups.length === 0) return;
    const prepared = sanitizeGroups(rawGroups);
    setGroups(prepared);
  }, [compactView, rawGroups]);

  /* ──────────────────────────────────────────────────────────────
     Datos para la pantalla compacta (Ver menos)
     - roleHeaders: encabezado fijo con nombres de roles
     - compactSummary: [{ group, count }] para listar módulos con su badge
     ────────────────────────────────────────────────────────────── */
  const roleHeaders = useMemo(
    () =>
      roles.map((r) => ({
        id: r._id,
        name: r.name || r.code || "",
      })),
    [roles]
  );

  const compactSummary = useMemo(() => {
    // Basado SIEMPRE en rawGroups para contar correctamente
    const merged = Array.isArray(rawGroups) ? rawGroups : [];
    const rows = merged
      .map((g) => ({
        group: g.group,
        count: Array.isArray(g.items) ? g.items.filter(it => !isHeaderLikeItem(it, g.group)).length : 0,
      }))
      .sort((a, b) => String(a.group).localeCompare(String(b.group)));
    return rows;
  }, [rawGroups]);

  const onToggle = (permKey, roleId) => {
    setRoleMatrix((prev) => {
      const curr = coerceFlagsByRoleIds(prev[permKey], roles);
      return { ...prev, [permKey]: { ...curr, [roleId]: !curr[roleId] } };
    });
  };

  const onSaveAll = async () => {
    // descubro roles que cambiaron
    const changedIds = new Set();
    for (const k of Object.keys(roleMatrix)) {
      const a = roleMatrix[k] || {};
      const b = origMatrix[k] || {};
      for (const r of roles)
        if (Boolean(a[r._id]) !== Boolean(b[r._id])) changedIds.add(r._id);
    }
    if (changedIds.size === 0) {
      setBanner({ type: "warn", msg: "No hay cambios para guardar." });
      setTimeout(() => setBanner(null), 3000);
      return;
    }
    try {
      for (const roleId of changedIds) {
        const keys = [];
        for (const [permKey, flags] of Object.entries(roleMatrix))
          if (flags?.[roleId]) keys.push(permKey);
        await iamApi.setRolePerms(roleId, keys);
      }
      setOrigMatrix(JSON.parse(JSON.stringify(roleMatrix)));
      setBanner({
        type: "ok",
        msg: `Cambios guardados en ${changedIds.size} rol(es).`,
      });
      setTimeout(() => setBanner(null), 3000);
    } catch (e) {
      setBanner({
        type: "err",
        msg: e?.message || "No se pudieron guardar los cambios.",
      });
      setTimeout(() => setBanner(null), 3500);
    }
  };

  const onCreatePerm = async ({ key, label, moduleValue }) => {
    const k = String(key || "").trim();
    const l = String(label || "").trim();
    const m = MODULES.find((x) => x.value === moduleValue) || MODULES[0];
    const group = m.label;
    if (!k || !l) {
      setBanner({ type: "warn", msg: "Completa clave y etiqueta." });
      setTimeout(() => setBanner(null), 2500);
      return false;
    }
    try {
      const created = await iamApi.createPerm({ key: k, label: l, group });

      // agrega al estado RAW (mergeado)
      setRawGroups((prevRaw) => {
        const raw = prevRaw.map((g) => ({
          group: g.group,
          items: g.items.slice(),
        }));
        let gi = raw.findIndex((g) => g.group === group);
        if (gi === -1) {
          raw.push({ group, items: [] });
          gi = raw.length - 1;
        }
        raw[gi].items.push({
          ...(created || { key: k, label: l, group }),
          key: k,
          label: l,
          group,
        });
        return mergeGroupsByName(raw);
      });

      // Recalcular visible (siempre sin headers internos)
      setGroups((curr) => sanitizeGroups(rawGroups.length ? rawGroups : curr));

      setRoleMatrix((prev) => ({ ...prev, [k]: emptyFlagsForRoles(roles) }));
      setOrigMatrix((prev) => ({ ...prev, [k]: emptyFlagsForRoles(roles) }));
      setBanner({ type: "ok", msg: "Permiso creado." });
      setTimeout(() => setBanner(null), 2500);
      return true;
    } catch (e) {
      setBanner({ type: "err", msg: e?.message || "No se pudo crear el permiso." });
      setTimeout(() => setBanner(null), 3500);
      return false;
    }
  };

  const onDeletePerm = async ({ id, key }) => {
    try {
      if (id) await iamApi.deletePerm(id);

      setRawGroups((prevRaw) => {
        const raw = prevRaw.map((g) => ({
          group: g.group,
          items: g.items.filter((it) => it.key !== key),
        }));
        return mergeGroupsByName(raw);
      });

      // Recalcular visible (siempre sin headers internos)
      setGroups((curr) =>
        sanitizeGroups(rawGroups.length ? rawGroups : curr).filter(
          (g) => g.items.length > 0
        )
      );

      const { [key]: _, ...nextM } = roleMatrix;
      const { [key]: __, ...nextO } = origMatrix;
      setRoleMatrix(nextM);
      setOrigMatrix(nextO);
      setBanner({ type: "ok", msg: "Permiso eliminado." });
      setTimeout(() => setBanner(null), 2500);
    } catch (e) {
      setBanner({ type: "err", msg: e?.message || "No se pudo eliminar el permiso." });
      setTimeout(() => setBanner(null), 3500);
    }
  };

  return {
    // estado
    loading,
    errorMsg,
    banner,
    setBanner,
    roles,
    groups,            // lista detallada (vista normal)
    roleMatrix,
    origMatrix,
    query,
    setQuery,
    compactView,
    setCompactView,

    // NUEVO: datos para "Ver menos"
    roleHeaders,       // [{ id, name }]
    compactSummary,    // [{ group, count }]

    // acciones
    onToggle,
    onSaveAll,
    onCreatePerm,
    onDeletePerm,
  };
}