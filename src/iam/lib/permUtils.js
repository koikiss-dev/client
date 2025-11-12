// client/src/iam/lib/permUtils.js
import { permisosKeys } from "../catolog/perms.js";

/**
 * Convierte una respuesta arbitraria de /permissions a
 * [{ group, items: [{_id?, key, label, group, order}] }]
 */
export function normalizePermsResponse(res) {
  const out = [];

  // 0) Nada
  if (!res) return out;

  // 1) Si viene { items: [...] }
  if (Array.isArray(res.items)) {
    const byGroup = new Map();
    for (const raw of res.items) {
      const key   = raw.key || raw.name || raw._id || "";
      const label = raw.label || raw.description || key;
      const group = raw.group || (key.includes(".") ? key.split(".")[0] : "General");
      const order = typeof raw.order === "number" ? raw.order : 0;
      if (!byGroup.has(group)) byGroup.set(group, []);
      byGroup.get(group).push({ _id: raw._id, key, label, group, order });
    }
    for (const [group, items] of byGroup) out.push({ group, items });
  }

  // 2) Si viene { groups: [...] } y puede ser:
  //    a) [{ group, items: [...] }]
  //    b) [ [ {group:..., key:...}, ... ], ... ] (lista de listas)
  else if (Array.isArray(res.groups)) {
    if (res.groups.length && res.groups[0] && Array.isArray(res.groups[0])) {
      // b) array de arrays
      for (const arr of res.groups) {
        const gname = arr?.[0]?.group || "General";
        const items = (arr || []).map(raw => ({
          _id: raw._id,
          key: raw.key || raw.name || raw._id || "",
          label: raw.label || raw.description || (raw.key || raw.name || ""),
          group: raw.group || gname || "General",
          order: typeof raw.order === "number" ? raw.order : 0,
        }));
        out.push({ group: gname, items });
      }
    } else {
      // a) array de objetos {group, items}
      for (const g of res.groups) {
        const gname = g.group || "General";
        const items = (g.items || []).map(raw => ({
          _id: raw._id,
          key: raw.key || raw.name || raw._id || "",
          label: raw.label || raw.description || (raw.key || raw.name || ""),
          group: raw.group || gname || "General",
          order: typeof raw.order === "number" ? raw.order : 0,
        }));
        out.push({ group: gname, items });
      }
    }
  }

  // 3) Si viene un objeto { [group]: items[] }
  else if (typeof res === "object") {
    const keys = Object.keys(res);
    const looksLikeObjOfGroups = keys.every(k => Array.isArray(res[k]));
    if (looksLikeObjOfGroups) {
      for (const gname of keys) {
        const items = (res[gname] || []).map(raw => ({
          _id: raw._id,
          key: raw.key || raw.name || raw._id || "",
          label: raw.label || raw.description || (raw.key || raw.name || ""),
          group: raw.group || gname || "General",
          order: typeof raw.order === "number" ? raw.order : 0,
        }));
        out.push({ group: gname, items });
      }
    }
  }

  // Orden estable
  out.sort((a, b) => a.group.localeCompare(b.group, "es"));
  out.forEach(g => {
    g.items.sort((a, b) => {
      const ao = typeof a.order === "number" ? a.order : 0;
      const bo = typeof b.order === "number" ? b.order : 0;
      if (ao !== bo) return ao - bo;
      return String(a.key).localeCompare(String(b.key), "es");
    });
  });

  return out;
}

/** Cuando la respuesta está vacía, genera grupos desde el catálogo local */
export function fallbackGroupsFromLocal() {
  const byGroup = new Map();
  for (const [key, label] of Object.entries(permisosKeys)) {
    const group = key.split(".")[0];
    if (!byGroup.has(group)) byGroup.set(group, []);
    byGroup.get(group).push({ _id: key, key, label, group, order: 0 });
  }
  const out = [...byGroup.entries()].map(([group, items]) => ({ group, items }));
  out.sort((a, b) => a.group.localeCompare(b.group, "es"));
  out.forEach(g => g.items.sort((a, b) => String(a.key).localeCompare(String(b.key), "es")));
  return out;
}
