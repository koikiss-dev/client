// Módulos permitidos (etiquetas canónicas)
export const MODULES = [
  { value: "bitacora",   label: "Bitácora" },
  { value: "acceso",     label: "Control de Acceso" },
  { value: "evaluacion", label: "Evaluación" },
  { value: "iam",        label: "IAM" },
  { value: "incidentes", label: "Incidentes" },
  { value: "rondas",     label: "Rondas" },
  { value: "supervision",label: "Supervisión" },
  { value: "visitas",    label: "Visitas" },
];

const CANON_MAP = new Map([
  ["bitacora", "Bitácora"], ["bitácora", "Bitácora"],
  ["acceso", "Control de Acceso"], ["accesos", "Control de Acceso"], ["control de acceso", "Control de Acceso"], ["control de accesos", "Control de Acceso"],
  ["evaluacion", "Evaluación"], ["evaluación", "Evaluación"],
  ["iam", "IAM"],
  ["incidentes", "Incidentes"],
  ["rondas", "Rondas"],
  ["supervision", "Supervisión"], ["supervisión", "Supervisión"],
  ["visitas", "Visitas"],
]);

export function canonLabel(name = "") {
  const k = String(name).trim().toLowerCase();
  return CANON_MAP.get(k) || null; // null => excluir
}

/** Normaliza y fusiona grupos por su etiqueta canónica, excluyendo no permitidos. */
export function normalizeAndMergeGroups(rawGroups = []) {
  const bucket = new Map(); // label -> {group:label, items:[]}
  for (const g of rawGroups) {
    const label = canonLabel(g.group);
    if (!label) continue;
    for (const it of g.items || []) {
      const entry = bucket.get(label) || { group: label, items: [] };
      entry.items.push({ ...it, group: label });
      bucket.set(label, entry);
    }
  }
  const out = Array.from(bucket.values());
  out.forEach(gr => gr.items.sort((a, b) => String(a.label).localeCompare(String(b.label))));
  out.sort((a, b) => String(a.group).localeCompare(String(b.group)));
  return out;
}

export const emptyFlagsForRoles = (roleList) => {
  const obj = {};
  for (const r of roleList) obj[r._id] = false;
  return obj;
};

export const coerceFlagsByRoleIds = (flags, roleList) => {
  const base = emptyFlagsForRoles(roleList);
  const out = { ...base };
  for (const id of Object.keys(base)) out[id] = Boolean(flags?.[id]);
  return out;
};
