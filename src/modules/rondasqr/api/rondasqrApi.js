// client/src/modules/rondasqr/api/rondasqrApi.js
const ROOT = (import.meta.env.VITE_API_BASE_URL || "http://localhost:4000").replace(/\/$/, "");
const BASE = `${ROOT}/api/rondasqr/v1`;

/** Permite inyectar un proveedor de token (Auth0, etc.) */
let tokenProvider = null;
export function attachRondasAuth(provider /* async () => string|null */) {
  tokenProvider = provider;
}

function toQS(o = {}) {
  return Object.entries(o)
    .filter(([, v]) => v !== "" && v != null)
    .map(([k, v]) => `${encodeURIComponent(k)}=${encodeURIComponent(v)}`)
    .join("&");
}

/* ───────────── helpers ───────────── */
function toId(v) {
  if (v == null) return null;
  if (typeof v === "string") return v.trim() || null;
  if (typeof v === "object") return v._id || v.id || null;
  return null;
}

function normalizePlanBody(body = {}) {
  const siteId = toId(body.siteId ?? body.site ?? body.site_id);
  const roundId = toId(body.roundId ?? body.round ?? body.round_id);

  const rawArray =
    Array.isArray(body.points)
      ? body.points
      : Array.isArray(body.items)
      ? body.items
      : Array.isArray(body.pointIds)
      ? body.pointIds
      : [];

  const points = rawArray
    .map((p, idx) => {
      if (typeof p === "string") return { pointId: p, order: idx + 1 };
      if (typeof p === "object") {
        const pid = toId(p.pointId ?? p.point_id ?? p._id ?? p.id);
        const ord = Number.isFinite(p.order) ? p.order : idx + 1;
        return pid ? { pointId: pid, order: ord } : null;
      }
      return null;
    })
    .filter(Boolean);

  if (points.length === 0 && Array.isArray(body.pointIds)) {
    return {
      siteId,
      roundId,
      points: body.pointIds
        .filter(Boolean)
        .map((id, i) => ({ pointId: String(id), order: i + 1 })),
    };
  }

  return { siteId, roundId, points };
}

async function buildHeaders(json = true) {
  const h = {};
  if (json) h["Content-Type"] = "application/json";

  if (typeof tokenProvider === "function") {
    try {
      const token = await tokenProvider();
      if (token) h["Authorization"] = `Bearer ${token}`;
    } catch {}
  }

  if (import.meta.env.DEV) {
    const devEmail =
      (typeof localStorage !== "undefined" && localStorage.getItem("iamDevEmail")) ||
      import.meta.env.VITE_DEV_IAM_EMAIL ||
      null;
    if (devEmail) h["x-user-email"] = devEmail;

    const devRoles =
      (typeof localStorage !== "undefined" && localStorage.getItem("iamDevRoles")) || "";
    if (devRoles) h["x-roles"] = devRoles;
  }

  return h;
}

async function fetchJson(url, opts = {}) {
  const wantsJson = typeof opts?.body === "string";
  const r = await fetch(url, {
    credentials: "include",
    ...opts,
    headers: { ...(await buildHeaders(wantsJson)), ...(opts.headers || {}) },
  });
  if (!r.ok) {
    let err = {};
    try {
      err = await r.json();
    } catch {}
    const e = new Error(err?.message || `HTTP ${r.status}`);
    e.status = r.status;
    e.payload = err;
    throw e;
  }
  try {
    return await r.json();
  } catch {
    return null;
  }
}

/* ───────────── API principal ───────────── */
export const rondasqrApi = {
  // -------- Reportes --------
  async getSummary(q) {
    return fetchJson(`${BASE}/reports/summary?${toQS(q)}`);
  },
  async getDetailed(q) {
    return fetchJson(`${BASE}/reports/detailed?${toQS(q)}`);
  },

  csvUrl(q) {
    return `${BASE}/reports/export/csv?${toQS(q)}`;
  },
  kmlUrl(q) {
    return `${BASE}/reports/export/kml?${toQS(q)}`;
  },
  xlsxUrl(q) {
    return `${BASE}/reports/export/excel?${toQS(q)}`;
  },
  pdfUrl(q) {
    return `${BASE}/reports/export/pdf?${toQS(q)}`;
  },

  async ping(url) {
    try {
      const r = await fetch(url, {
        method: "GET",
        credentials: "include",
        headers: await buildHeaders(false),
      });
      return r.ok;
    } catch {
      return false;
    }
  },

  // -------- Check-in / Guardia --------
  async postScan(payload) {
    return fetchJson(`${BASE}/checkin/scan`, {
      method: "POST",
      body: JSON.stringify(payload || {}),
    });
  },

  // ⚙️ Corrección: endpoint real del backend
  async postIncident(payload) {
    const url = `${ROOT}/api/incidentes`; // endpoint del backend Node
    return fetchJson(url, {
      method: "POST",
      body: JSON.stringify(payload || {}),
    });
  },

  async panic(gps) {
    const body =
      gps && typeof gps === "object"
        ? "gps" in gps
          ? gps
          : { gps }
        : { gps: null };

    const urls = [
      `${BASE}/checkin/panic`,
      `${BASE}/panic`,
      `${ROOT}/api/rondasqr/panic`,
      `${ROOT}/api/panic`,
    ];

    let lastErr;
    for (const url of urls) {
      try {
        return await fetchJson(url, { method: "POST", body: JSON.stringify(body) });
      } catch (err) {
        lastErr = err;
        if (err.status !== 404 && err.status !== 405) break;
      }
    }
    throw lastErr || new Error("No se pudo enviar el pánico: ninguna ruta coincidió");
  },

  async postInactivity(payload) {
    return fetchJson(`${BASE}/checkin/inactivity`, {
      method: "POST",
      body: JSON.stringify(payload || {}),
    });
  },
  async postFall(payload) {
    return fetchJson(`${BASE}/checkin/fall`, {
      method: "POST",
      body: JSON.stringify(payload || {}),
    });
  },

  // -------- OFFLINE --------
  async offlineCheckin(item) {
    return fetchJson(`${BASE}/offline/checkin`, {
      method: "POST",
      body: JSON.stringify(item || {}),
    });
  },
  async offlineDump(payload) {
    return fetchJson(`${BASE}/offline/dump`, {
      method: "POST",
      body: JSON.stringify(payload || {}),
    });
  },

  // -------- Admin CRUD --------
  async listSites() {
    return fetchJson(`${BASE}/admin/sites`);
  },
  async createSite(body) {
    return fetchJson(`${BASE}/admin/sites`, {
      method: "POST",
      body: JSON.stringify(body || {}),
    });
  },
  async updateSite(id, body) {
    return fetchJson(`${BASE}/admin/sites/${encodeURIComponent(id)}`, {
      method: "PUT",
      body: JSON.stringify(body || {}),
    });
  },
  async deleteSite(id) {
    return fetchJson(`${BASE}/admin/sites/${encodeURIComponent(id)}`, { method: "DELETE" });
  },

  // Rondas
  async listRounds(siteId) {
    const q = siteId ? `?${toQS({ siteId })}` : "";
    return fetchJson(`${BASE}/admin/rounds${q}`);
  },
  async createRound(body) {
    return fetchJson(`${BASE}/admin/rounds`, {
      method: "POST",
      body: JSON.stringify(body || {}),
    });
  },
  async updateRound(id, body) {
    return fetchJson(`${BASE}/admin/rounds/${encodeURIComponent(id)}`, {
      method: "PUT",
      body: JSON.stringify(body || {}),
    });
  },
  async deleteRound(id) {
    return fetchJson(`${BASE}/admin/rounds/${encodeURIComponent(id)}`, { method: "DELETE" });
  },

  // Puntos
  async listPoints({ siteId, roundId } = {}) {
    const q = toQS({ siteId, roundId });
    return fetchJson(`${BASE}/admin/points${q ? `?${q}` : ""}`);
  },
  async createPoint(body) {
    return fetchJson(`${BASE}/admin/points`, {
      method: "POST",
      body: JSON.stringify(body || {}),
    });
  },
  async updatePoint(id, body) {
    return fetchJson(`${BASE}/admin/points/${encodeURIComponent(id)}`, {
      method: "PUT",
      body: JSON.stringify(body || {}),
    });
  },
  async deletePoint(id) {
    return fetchJson(`${BASE}/admin/points/${encodeURIComponent(id)}`, { method: "DELETE" });
  },
  async reorderPoints(roundId, pointIds) {
    return fetchJson(`${BASE}/admin/points/reorder`, {
      method: "PUT",
      body: JSON.stringify({ roundId, pointIds }),
    });
  },

  // -------- Plans --------
  async getPlan(q = {}) {
    const qs = toQS(q);
    return fetchJson(`${BASE}/admin/plans${qs ? `?${qs}` : ""}`);
  },

  async createOrUpdatePlan(body) {
    const base = normalizePlanBody(body);
    if (!base.siteId || !base.roundId) {
      const e = new Error("siteId y roundId son requeridos");
      e.status = 400;
      e.payload = { errors: { siteId: !base.siteId, roundId: !base.roundId } };
      throw e;
    }
    if (!Array.isArray(base.points) || base.points.length === 0) {
      const e = new Error("El plan debe contener al menos 1 punto");
      e.status = 400;
      e.payload = { errors: { points: "vacío" } };
      throw e;
    }

    const extras = {};
    for (const k of ["shift", "turno", "name", "label", "description", "notes"]) {
      if (body[k] != null && body[k] !== "") extras[k] = body[k];
    }

    const pointIds = base.points.map((p) => String(p.pointId));
    const payload = { ...base, ...extras, pointIds };

    const tryAndReload = async (url, method) => {
      const res = await fetchJson(url, { method, body: JSON.stringify(payload) });
      return res == null
        ? this.getPlan({
            siteId: base.siteId,
            roundId: base.roundId,
            shift: payload.shift,
          })
        : res;
    };

    try {
      return await tryAndReload(`${BASE}/admin/plans`, "POST");
    } catch (err) {
      if (err.status === 404 || err.status === 405) {
        try {
          return await tryAndReload(`${BASE}/admin/plans`, "PUT");
        } catch (err2) {
          if (err2.status === 404 || err2.status === 405) {
            return await tryAndReload(`${BASE}/admin/plan`, "POST");
          }
          throw err2;
        }
      }
      throw err;
    }
  },

  async deletePlanByQuery(q = {}) {
    const qs = toQS(q);
    try {
      return await fetchJson(`${BASE}/admin/plans${qs ? `?${qs}` : ""}`, { method: "DELETE" });
    } catch (err) {
      if (err.status === 404 || err.status === 405) {
        return await fetchJson(`${BASE}/admin/plans/delete`, {
          method: "POST",
          body: JSON.stringify(q || {}),
        });
      }
      throw err;
    }
  },

  // --- aliases
  async listPlans(q = {}) {
    return this.getPlan(q);
  },
  async createPlan(body) {
    return this.createOrUpdatePlan(body);
  },
  async updatePlan(_, body) {
    return this.createOrUpdatePlan(body);
  },
  async deletePlan(arg) {
    if (arg && typeof arg === "object") return this.deletePlanByQuery(arg);
    const e = new Error("deletePlan(id) no soportado; usa deletePlanByQuery({siteId, roundId})");
    e.status = 400;
    throw e;
  },

  // -------- Asignaciones --------
  async listAssignments(date) {
    const qs = toQS(date ? { date } : {});
    return fetchJson(`${BASE}/admin/assignments${qs ? `?${qs}` : ""}`);
  },
  async createAssignment(payload) {
    return fetchJson(`${BASE}/admin/assignments`, {
      method: "POST",
      body: JSON.stringify(payload || {}),
    });
  },
  async deleteAssignment(id) {
    return fetchJson(`${BASE}/admin/assignments/${encodeURIComponent(id)}`, {
      method: "DELETE",
    });
  },

  // ✅ alias para ScanPage
  async checkinScan(payload) {
    return this.postScan(payload);
  },
  async scan(payload) {
    return this.postScan(payload);
  },
};

export default rondasqrApi;
