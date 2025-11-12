// client/src/iam/tools/seedIam.js
import { permisosKeys, rolesKeys } from "../catalog/perms";
import { iamApi } from "../api/iamApi";

/**
 * Crea (si faltan) las entradas de /permissions a partir del catálogo local.
 * Luego asegura que los roles existan y tengan asignadas sus permissions.
 * Puedes llamarlo desde UI o desde consola: window.seedIam()
 */
export async function seedPermissionsAndRoles(token) {
  // 1) PERMISOS
  let existingPerms = [];
  try {
    const res = await iamApi.listPerms(token);
    existingPerms = res?.items || res?.permissions || [];
  } catch {
    existingPerms = [];
  }
  const existingSet = new Set(existingPerms.map(p => p.key || p.name).filter(Boolean));

  // Crear los que falten
  for (const [key, label] of Object.entries(permisosKeys)) {
    if (!existingSet.has(key)) {
      // Derivar grupo (lo que está antes del ".") y un order básico
      const group = key.split(".")[0];
      const order = 0;
      try {
        await iamApi.createPerm({ key, label, group, order }, token);
        existingSet.add(key);
        // eslint-disable-next-line no-console
        console.log("[seed] permiso creado:", key);
      } catch (e) {
        console.warn("[seed] no se pudo crear permiso", key, e?.message || e);
      }
    }
  }

  // Releer (opcional)
  try {
    const res = await iamApi.listPerms(token);
    existingPerms = res?.items || res?.permissions || [];
  } catch {}

  // 2) ROLES
  let existingRoles = [];
  try {
    const r = await iamApi.listRoles(token);
    existingRoles = r?.items || r?.roles || [];
  } catch {
    existingRoles = [];
  }

  // Indexar por nombre
  const roleIdx = new Map();
  for (const r of existingRoles) {
    const name = r?.name || r?._id || "";
    if (!name) continue;
    roleIdx.set(name, r);
  }

  // Asegurar cada rol de la plantilla
  for (const [roleName, permList] of Object.entries(rolesKeys)) {
    const role = roleIdx.get(roleName);
    const desired = Array.isArray(permList) ? permList : [];

    if (!role) {
      // crear
      try {
        await iamApi.createRole({ name: roleName, description: "", permissions: desired }, token);
        console.log("[seed] rol creado:", roleName);
      } catch (e) {
        console.warn("[seed] no se pudo crear rol", roleName, e?.message || e);
      }
    } else {
      // actualizar si difiere
      const current = Array.isArray(role.permissions || role.perms) ? (role.permissions || role.perms) : [];
      const same =
        current.length === desired.length &&
        current.every(k => desired.includes(k));
      if (!same) {
        try {
          await iamApi.updateRole(role._id || role.id, { name: roleName, description: role.description || "", permissions: desired }, token);
          console.log("[seed] rol actualizado:", roleName);
        } catch (e) {
          console.warn("[seed] no se pudo actualizar rol", roleName, e?.message || e);
        }
      }
    }
  }

  return { ok: true };
}

// Helper para usar desde consola del navegador si quieres:
if (typeof window !== "undefined") {
  // eslint-disable-next-line no-console
  console.log('➡️  Puedes ejecutar "window.seedIam()" para llenar permisos/roles desde la consola.');
  window.seedIam = async () => {
    try {
      await seedPermissionsAndRoles();
      console.log("✅ Seeding completado");
    } catch (e) {
      console.error("❌ Seeding falló:", e);
    }
  };
}
