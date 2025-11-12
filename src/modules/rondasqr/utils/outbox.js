// client/src/modules/rondasqr/utils/outbox.js
// Maneja el almacenamiento local de checkins/alertas offline del guardia

const KEY = "rondasqr_outbox";

function load() {
  if (typeof localStorage === "undefined") return [];
  try {
    const raw = localStorage.getItem(KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function save(list) {
  if (typeof localStorage === "undefined") return;
  localStorage.setItem(KEY, JSON.stringify(list || []));
}

export function getOutbox() {
  return load();
}

function makeId() {
  if (typeof crypto !== "undefined" && crypto.randomUUID) {
    return crypto.randomUUID();
  }
  return "ow-" + Math.random().toString(36).slice(2, 10);
}

/**
 * Guarda un check-in para enviar después.
 * Espera al menos { qr, gps? }
 */
export function queueCheckin(data) {
  const list = load();
  list.push({
    id: makeId(),
    at: Date.now(), // 👈 usamos "at" porque el ScanPage lo muestra como fecha
    ...data,
  });
  save(list);
}

export function removeById(id) {
  const list = load().filter((x) => x.id !== id);
  save(list);
}

export function countOutbox() {
  return load().length;
}

/**
 * Envía todos los elementos usando un callback provisto por el caller.
 * El callback debe ser:  async (item) => { ... }  y lanzar error si falla.
 *
 * Devuelve { ok, fail }
 */
export async function transmitOutbox(senderFn) {
  const list = load();
  if (!list.length) return { ok: 0, fail: 0 };

  let ok = 0;
  let fail = 0;

  for (const item of list) {
    try {
      // el caller decide a dónde hace POST:
      // en tu ScanPage haces: transmitOutbox(sendCheckinViaApi)
      await senderFn(item);
      removeById(item.id);
      ok++;
    } catch (e) {
      console.warn("[outbox] Error enviando item", item.id, e?.message || e);
      fail++;
      // no lo borramos para reintentar luego
    }
  }

  return { ok, fail };
}
