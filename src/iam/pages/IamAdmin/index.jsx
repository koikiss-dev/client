// client/src/iam/pages/IamAdmin/index.jsx
import React, { useEffect, useMemo, useState, useCallback } from "react";

import IamGuard from "../../api/IamGuard.jsx";

// Páginas
import UsersPage from "./UsersPage.jsx";
import RolesPage from "./RolesPage.jsx";
import PermissionCatalog from "./PermissionCatalog"; 
import AuditPage from "./AuditPage.jsx";


import { iamApi } from "../../api/iamApi.js";


import { permisosKeys, rolesKeys } from "../../catalog/perms.js";

/** Si BD está vacía, crea permisos/roles desde el catálogo local */
async function seedFromLocalCatalog(token) {
  // --- PERMISOS
  let existingPerms = [];
  try {
    const res = await iamApi.listPerms(token);
    existingPerms = res?.items || res?.permissions || [];
  } catch {
    existingPerms = [];
  }
  const have = new Set(existingPerms.map((p) => p.key || p.name).filter(Boolean));

  for (const [key, label] of Object.entries(permisosKeys)) {
    if (have.has(key)) continue;
    const group = key.split(".")[0];
    const order = 0;
    try {
      await iamApi.createPerm({ key, label, group, order }, token);
      console.log("[IAM seed] permiso creado:", key);
    } catch (e) {
      console.warn("[IAM seed] no se pudo crear permiso", key, e?.message || e);
    }
  }

  // --- ROLES
  let existingRoles = [];
  try {
    const r = await iamApi.listRoles(token);
    existingRoles = r?.items || r?.roles || [];
  } catch {
    existingRoles = [];
  }
  const byName = new Map(existingRoles.map((r) => [r?.name || r?._id, r]).filter(([k]) => !!k));

  for (const [name, perms] of Object.entries(rolesKeys)) {
    const desired = Array.isArray(perms) ? perms : [];
    const currentRole = byName.get(name);

    if (!currentRole) {
      try {
        await iamApi.createRole({ name, description: "", permissions: desired }, token);
        console.log("[IAM seed] rol creado:", name);
      } catch (e) {
        console.warn("[IAM seed] no se pudo crear rol", name, e?.message || e);
      }
    } else {
      const current = Array.isArray(currentRole.permissions || currentRole.perms)
        ? currentRole.permissions || currentRole.perms
        : [];
      const same = current.length === desired.length && current.every((k) => desired.includes(k));
      if (!same) {
        try {
          await iamApi.updateRole(currentRole._id || currentRole.id, {
            name,
            description: currentRole.description || "",
            permissions: desired,
          });
          console.log("[IAM seed] rol actualizado:", name);
        } catch (e) {
          console.warn("[IAM seed] no se pudo actualizar rol", name, e?.message || e);
        }
      }
    }
  }
}

export default function IamAdmin() {
  const [tab, setTab] = useState("users");

  const [needsSeed, setNeedsSeed] = useState(false);
  const [seeding, setSeeding] = useState(false);
  const [checkErr, setCheckErr] = useState("");

  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        setCheckErr("");
        const [p, r] = await Promise.all([iamApi.listPerms(), iamApi.listRoles()]);
        const pCount = (p?.items || p?.permissions || []).length;
        const rCount = (r?.items || r?.roles || []).length;
        if (alive) setNeedsSeed(pCount === 0 || rCount === 0);
      } catch (e) {
        if (alive) {
          setNeedsSeed(true);
          setCheckErr(e?.message || "No se pudo verificar permisos/roles.");
        }
      }
    })();
    return () => {
      alive = false;
    };
  }, []);

  const runSeed = useCallback(async () => {
    try {
      setSeeding(true);
      await seedFromLocalCatalog();
      const [p, r] = await Promise.all([iamApi.listPerms(), iamApi.listRoles()]);
      const pCount = (p?.items || p?.permissions || []).length;
      const rCount = (r?.items || r?.roles || []).length;
      setNeedsSeed(pCount === 0 || rCount === 0);
      alert("✅ Permisos y roles cargados.");
    } catch (e) {
      alert(e?.message || "❌ No se pudo cargar la plantilla.");
    } finally {
      setSeeding(false);
    }
  }, []);

  const tabs = useMemo(
    () => [
      { id: "users", label: "Usuarios" },
      { id: "roles", label: "Roles" },
      { id: "perms", label: "Permisos" },
      { id: "audit", label: "Historial" },
    ],
    []
  );

  const onKeyDownTabs = useCallback(
    (e) => {
      if (e.key !== "ArrowLeft" && e.key !== "ArrowRight") return;
      e.preventDefault();
      const idx = tabs.findIndex((t) => t.id === tab);
      if (idx < 0) return;
      const next = e.key === "ArrowRight" ? tabs[(idx + 1) % tabs.length] : tabs[(idx - 1 + tabs.length) % tabs.length];
      setTab(next.id);
      const btn = document.getElementById(`tab-${next.id}`);
      if (btn) btn.focus();
    },
    [tab, tabs]
  );

  return (
    <IamGuard anyOf={["iam.users.manage", "iam.roles.manage", "*"]}>
      <div className="p-6 space-y-4">
        {/* Banner para sembrar catálogo si está vacío */}
        {needsSeed && (
          <div className="rounded border border-amber-300 bg-amber-50 text-amber-900 p-3 flex items-center justify-between">
            <div>
              <div className="font-medium">Catálogo vacío</div>
              <div className="text-sm">
                {checkErr
                  ? `No se pudo consultar la API. ${checkErr}`
                  : "Cargar plantilla de permisos y roles desde el catálogo local."}
              </div>
            </div>
            <button
              className="px-3 py-2 rounded bg-amber-600 text-white disabled:opacity-60"
              onClick={runSeed}
              disabled={seeding}
            >
              {seeding ? "Cargando…" : "Cargar plantilla"}
            </button>
          </div>
        )}

        {/* Barra de pestañas */}
        <div role="tablist" aria-label="Secciones IAM" className="flex items-center gap-2 flex-wrap" onKeyDown={onKeyDownTabs}>
          {tabs.map(({ id, label }) => {
            const active = tab === id;
            return (
              <button
                key={id}
                role="tab"
                aria-selected={active}
                aria-controls={`panel-${id}`}
                id={`tab-${id}`}
                title={label}
                onClick={() => setTab(id)}
                className={[
                  "px-4 py-2 rounded-md font-medium transition-colors duration-200 outline-none",
                  "focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-indigo-500",
                  "dark:focus-visible:ring-indigo-400 focus-visible:ring-offset-transparent",
                  active
                    ? "bg-black text-white dark:bg-white dark:text-black shadow"
                    : "bg-gray-200 text-gray-800 hover:bg-gray-300 dark:bg-neutral-800 dark:text-gray-200 dark:hover:bg-neutral-700",
                ].join(" ")}
              >
                {label}
              </button>
            );
          })}
        </div>

        {/* Contenido de cada pestaña */}
        <section role="tabpanel" id="panel-users" aria-labelledby="tab-users" hidden={tab !== "users"} className="outline-none">
          {tab === "users" && <UsersPage />}
        </section>

        <section role="tabpanel" id="panel-roles" aria-labelledby="tab-roles" hidden={tab !== "roles"} className="outline-none">
          {tab === "roles" && <RolesPage />}
        </section>

        <section role="tabpanel" id="panel-perms" aria-labelledby="tab-perms" hidden={tab !== "perms"} className="outline-none">
          {tab === "perms" && <PermissionCatalog />}
        </section>

        <section role="tabpanel" id="panel-audit" aria-labelledby="tab-audit" hidden={tab !== "audit"} className="outline-none">
          {tab === "audit" && <AuditPage />}
        </section>
      </div>
    </IamGuard>
  );
}
