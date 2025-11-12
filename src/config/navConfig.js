// client/src/config/navConfig.js
import {
  DoorOpen,
  Footprints,
  AlertTriangle,
  Users,
  NotebookPen,
  ClipboardList,
  ShieldCheck,
} from "lucide-react";

/**
 * Secciones visibles en Home/Sidebar y menú rápido del Topbar.
 * Si alguna vista usa solo {key,label,path} también funciona;
 * el icon es opcional y se ignora si no se usa.
 */
export const NAV_SECTIONS = [
  { key: "accesos",     label: "Control de Acceso",  path: "/accesos",     icon: DoorOpen },
  { key: "rondas",      label: "Rondas de Vigilancia", path: "/rondas/admin", icon: Footprints },
  { key: "incidentes",  label: "Gestión de Incidentes", path: "/incidentes",  icon: AlertTriangle },
  { key: "visitas",     label: "Control de Visitas", path: "/visitas",     icon: Users },
  { key: "bitacora",    label: "Bitácora Digital",   path: "/bitacora",    icon: NotebookPen },
  { key: "supervision", label: "Supervisión",        path: "/supervision", icon: ClipboardList },
  { key: "evaluacion",  label: "Evaluación",         path: "/evaluacion",  icon: ClipboardList },

  // 👇 NUEVO: módulo IAM en todos los menús
  { key: "iam",         label: "Usuarios y Permisos", path: "/iam/admin",   icon: ShieldCheck },
];
