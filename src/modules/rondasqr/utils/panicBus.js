// src/modules/rondasqr/utils/panicBus.js

/**
 * Dispara un evento local de pánico.
 * Se propaga a todas las pestañas/componentes abiertos.
 * @param {object} payload - Datos adicionales (usuario, origen, mensaje, etc.)
 */
export function emitLocalPanic(payload = {}) {
  if (typeof window === "undefined") return;

  const event = new CustomEvent("rondasqr:panic", {
    detail: {
      at: Date.now(),
      source: "unknown",
      ...payload,
    },
  });

  try {
    window.dispatchEvent(event);
    // BroadcastChannel permite notificar a otras pestañas
    if (typeof BroadcastChannel !== "undefined") {
      const ch = new BroadcastChannel("rondasqr-panic");
      ch.postMessage(event.detail);
      ch.close();
    }
  } catch (err) {
    console.error("[panicBus] Error al emitir pánico:", err);
  }
}

/**
 * Suscripción a eventos de pánico locales o inter-pestaña.
 * Retorna una función para cancelar la suscripción.
 */
export function subscribeLocalPanic(handler) {
  if (typeof window === "undefined") return () => {};

  const fn = (ev) => handler(ev.detail || {});

  // 🔊 Eventos dentro de la misma pestaña
  window.addEventListener("rondasqr:panic", fn);

  // 📢 Eventos entre pestañas (opcional, mejora UX)
  let ch = null;
  if (typeof BroadcastChannel !== "undefined") {
    ch = new BroadcastChannel("rondasqr-panic");
    ch.onmessage = (msg) => handler(msg.data || {});
  }

  return () => {
    window.removeEventListener("rondasqr:panic", fn);
    if (ch) ch.close();
  };
}
