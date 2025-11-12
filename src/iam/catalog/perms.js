// client/src/iam/catalog/perms.js

// 1) Catálogo: clave técnica => etiqueta legible (para UI)
export const permisosKeys = {
  // IAM
  "iam.usuarios.gestionar": "Usuarios y Roles • Gestionar usuarios",
  "iam.roles.gestionar": "Usuarios y Roles • Gestionar roles",

  // Rondas de Vigilancia
  "rondas.leer": "Rondas • Ver lista/detalle",
  "rondas.crear": "Rondas • Crear/Asignar",
  "rondas.editar": "Rondas • Editar",
  "rondas.eliminar": "Rondas • Eliminar",
  "rondas.exportar": "Rondas • Exportar (PDF/Excel/CSV)",
  "rondas.reportes": "Rondas • Ver reportes",

  // Incidentes
  "incidentes.leer": "Incidentes • Ver lista/detalle",
  "incidentes.crear": "Incidentes • Crear",
  "incidentes.editar": "Incidentes • Editar",
  "incidentes.eliminar": "Incidentes • Eliminar",
  "incidentes.cerrar": "Incidentes • Cerrar/Aprobar",
  "incidentes.exportar": "Incidentes • Exportar (PDF/Excel/CSV)",
  "incidentes.reportes": "Incidentes • Ver reportes",
  "incidentes.adjuntar": "Incidentes • Adjuntar evidencias",

  // Control de Acceso
  "accesos.leer": "Control de Acceso • Ver",
  "accesos.escribir": "Control de Acceso • Registrar/Editar",
  "accesos.exportar": "Control de Acceso • Exportar",

  // Control de Visitas
  "visitas.leer": "Control de Visitas • Ver",
  "visitas.escribir": "Control de Visitas • Registrar/Editar",
  "visitas.cerrar": "Control de Visitas • Aprobar/Cerrar",
  "visitas.exportar": "Control de Visitas • Exportar",

  // Bitácora Digital
  "bitacora.leer": "Bitácora • Ver",
  "bitacora.escribir": "Bitácora • Registrar",
  "bitacora.exportar": "Bitácora • Exportar",

  // Supervisión
  "supervision.leer": "Supervisión • Ver lista/detalle",
  "supervision.crear": "Supervisión • Crear",
  "supervision.editar": "Supervisión • Editar",
  "supervision.cerrar": "Supervisión • Cerrar/Aprobar",
  "supervision.reportes": "Supervisión • Ver reportes",

  // Evaluación
  "evaluacion.leer": "Evaluación • Ver lista/detalle",
  "evaluacion.crear": "Evaluación • Crear / Asignar",
  "evaluacion.editar": "Evaluación • Editar",
  "evaluacion.eliminar": "Evaluación • Eliminar",
  "evaluacion.cerrar": "Evaluación • Aprobar / Cerrar",
  "evaluacion.exportar": "Evaluación • Exportar (PDF/Excel/CSV)",
  "evaluacion.reportes": "Evaluación • Ver reportes",
  "evaluacion.kpi": "Evaluación • Ver análisis / KPI",
  "evaluacion.alertas": "Evaluación • Gestionar alertas",
  "evaluacion.adjuntar": "Evaluación • Adjuntar evidencias",

  // Reportes generales
  "reportes.leer": "Reportes • Ver",
};

// 2) Asignación de permisos por rol (solo KEYS)
export const rolesKeys = {
  administrador: [
    "*", // acceso total (opcional)
    "iam.usuarios.gestionar",
    "iam.roles.gestionar",
  ],

  supervisor: [
    "rondas.leer", "rondas.crear", "rondas.editar", "rondas.exportar", "rondas.reportes",
    "incidentes.leer", "incidentes.crear", "incidentes.editar", "incidentes.cerrar", "incidentes.exportar", "incidentes.reportes", "incidentes.adjuntar",
    "accesos.leer", "accesos.escribir", "accesos.exportar",
    "visitas.leer", "visitas.escribir", "visitas.cerrar", "visitas.exportar",
    "bitacora.leer", "bitacora.escribir", "bitacora.exportar",
    "supervision.leer", "supervision.crear", "supervision.editar", "supervision.cerrar", "supervision.reportes",
    "evaluacion.leer", "evaluacion.crear", "evaluacion.editar", "evaluacion.cerrar", "evaluacion.exportar", "evaluacion.reportes", "evaluacion.kpi", "evaluacion.alertas", "evaluacion.adjuntar",
    "reportes.leer",
  ],

  guardia: [
    // “solo propios” se maneja en backend por ownership
    "rondas.leer", "rondas.crear", "rondas.editar",
    "incidentes.leer", "incidentes.crear", "incidentes.editar", "incidentes.adjuntar",
    "visitas.escribir",
    "bitacora.leer", "bitacora.escribir",
    "evaluacion.leer", "evaluacion.editar", "evaluacion.adjuntar",
  ],

  administrador_it: [
    "iam.roles.gestionar",
    "rondas.leer", "rondas.exportar", "rondas.reportes",
    "incidentes.leer", "incidentes.exportar", "incidentes.reportes",
    "accesos.leer", "accesos.exportar",
    "visitas.leer", "visitas.exportar",
    "bitacora.leer", "bitacora.escribir", "bitacora.exportar",
    "supervision.leer", "supervision.reportes",
    "evaluacion.leer", "evaluacion.crear", "evaluacion.editar", "evaluacion.eliminar", "evaluacion.exportar", "evaluacion.reportes", "evaluacion.kpi", "evaluacion.alertas", "evaluacion.adjuntar",
    "reportes.leer",
  ],

  visita_externa: [
    "visitas.leer",
  ],
};

// 3) Utilidad: agrupar por módulo (prefijo antes del primer ".")
export function agruparPorModulo(mapaPermisos = permisosKeys) {
  const grupos = {};
  Object.entries(mapaPermisos).forEach(([clave, etiqueta]) => {
    const modulo = clave.split(".")[0]; // ej: "rondas"
    if (!grupos[modulo]) grupos[modulo] = [];
    grupos[modulo].push({ clave, etiqueta });
  });
  return Object.entries(grupos)
    .map(([modulo, items]) => ({
      modulo,
      items: items.sort((a, b) => a.etiqueta.localeCompare(b.etiqueta)),
    }))
    .sort((a, b) => a.modulo.localeCompare(b.modulo));
}

// ✅ Export default para compatibilidad
export default { permisosKeys, rolesKeys, agruparPorModulo };
