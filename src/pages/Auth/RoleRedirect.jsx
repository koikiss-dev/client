// client/src/pages/Auth/RoleRedirect.jsx
import React, { useEffect } from "react";
import { useNavigate } from "react-router-dom";
// ✅ Path real del iamApi
import { iamApi } from "../../iam/api/iamApi.js";

/** Decide la “home” según roles/permisos */
function pickHome({ roles = [], perms = [] }) {
  const R = new Set(roles.map((r) => String(r).toLowerCase()));
  const P = new Set(perms);

  // comodín o admin o quien gestiona IAM → panel de IAM
  if (P.has("*") || R.has("admin") || P.has("iam.users.manage")) return "/iam/admin";

  // Otros roles
  if (R.has("supervisor")) return "/rondas/admin";
  if (R.has("guardia"))    return "/rondas/guard";
  if (R.has("recepcion"))  return "/accesos";          // o "/visitas"
  if (R.has("analista"))   return "/rondas/dashboard";
  if (R.has("ti"))         return "/iam/admin";

  // Sin match → Home
  return "/";
}

export default function RoleRedirect() {
  const nav = useNavigate();

  useEffect(() => {
    let alive = true;

    // Reintento manual contra endpoints /me si en dev no llega nada de iamApi.me()
    async function tryFetchMeDev() {
      const ROOT   = (import.meta.env.VITE_API_BASE_URL || "http://localhost:4000").replace(/\/$/, "");
      const V1     = `${ROOT}/api/iam/v1`;
      const LEGACY = `${ROOT}/api/iam`;
      const candidates = [
        `${V1}/me`,
        `${V1}/auth/me`,
        `${LEGACY}/me`,
        `${LEGACY}/auth/me`,
      ];

      const devEmail =
        localStorage.getItem("iamDevEmail") ||
        import.meta.env.VITE_DEV_IAM_EMAIL ||
        "admin@local";
      const devRoles =
        localStorage.getItem("iamDevRoles") ||
        import.meta.env.VITE_DEV_IAM_ROLES ||
        "admin";
      const devPerms =
        localStorage.getItem("iamDevPerms") ||
        import.meta.env.VITE_DEV_IAM_PERMS ||
        "iam.users.manage,iam.roles.manage";

      for (const url of candidates) {
        try {
          const res = await fetch(url, {
            credentials: "include",
            headers: {
              "x-user-email": devEmail,
              "x-roles": devRoles,
              "x-perms": devPerms,
            },
          });
          if (!res.ok) continue;
          const data = (await res.json().catch(() => ({}))) || {};
          const roles = data?.roles || data?.user?.roles || [];
          const perms = data?.permissions || data?.perms || [];
          if ((roles?.length || 0) + (perms?.length || 0) > 0) {
            return { roles, perms };
          }
        } catch {
          // sigue con el siguiente
        }
      }
      return null;
    }

    (async () => {
      try {
        // 1) camino “oficial”: usa iamApi.me() (ya setea x-user-* si VITE_FORCE_DEV_IAM=1)
        let me = await iamApi.me().catch(() => null);

        // 2) Si seguimos vacíos y estamos en DEV, reintenta con cabeceras dev explícitas
        if (
          import.meta.env.DEV &&
          (!me || ((!me.roles || !me.roles.length) && (!me.permissions || !me.permissions.length)))
        ) {
          me = await tryFetchMeDev();
        }

        const roles = me?.roles || me?.user?.roles || [];
        const perms = me?.permissions || me?.perms || [];
        const dest  = pickHome({ roles, perms });
        if (alive) nav(dest, { replace: true });
      } catch {
        if (alive) nav("/", { replace: true });
      }
    })();

    return () => { alive = false; };
  }, [nav]);

  return <div className="p-6">Redirigiendo…</div>;
}
