// client/src/lib/chatApi.js
import api from "/src/lib/api.js";

/**
 * Historial de chat
 * GET /api/chat/messages
 * Params opcionales:
 *  - room: string (default "global")
 *  - limit: number (p.ej. 50)
 *  - beforeId / afterId: para paginación si lo soporta tu backend
 */
export async function getChatMessages(params = {}) {
  const { room = "global", limit, beforeId, afterId } = params;
  const { data } = await api.get("/api/chat/messages", {
    params: { room, limit, beforeId, afterId },
  });
  return data;
}

/**
 * Enviar mensaje
 * POST /api/chat/messages
 * Body:
 *  - text: string (requerido)
 *  - room: string (default "global")
 *  - userName, userEmail, userSub: opcionales (fallback si el token no trae claims)
 *  - extra: objeto opcional para metadata adicional
 */
export async function sendChatMessage({
  text,
  room = "global",
  userName,
  userEmail,
  userSub,
  extra,
}) {
  const payload = { text, room };
  if (userName)  payload.userName  = userName;
  if (userEmail) payload.userEmail = userEmail;
  if (userSub)   payload.userSub   = userSub;
  if (extra && typeof extra === "object") payload.extra = extra;

  const { data } = await api.post("/api/chat/messages", payload);
  return data;
}

// Aliases opcionales
export const getMessages  = getChatMessages;
export const postMessage  = sendChatMessage;

const ChatAPI = { getChatMessages, sendChatMessage, getMessages, postMessage };
export default ChatAPI;
