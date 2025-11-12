// client/src/components/ChatDock.jsx
import React from "react";
import api, { attachAuth0 } from "../lib/api.js";
import { useAuth0 } from "@auth0/auth0-react";

/* === Iconos (SVG) === */
const ChatIcon = (props) => (
  <svg viewBox="0 0 24 24" width="24" height="24" fill="none" stroke="currentColor"
       strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}>
    <path d="M21 15a4 4 0 0 1-4 4H8l-5 3V7a4 4 0 0 1 4-4h10a4 4 0 0 1 4 4z" />
  </svg>
);

const CloseIcon = (props) => (
  <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor"
       strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}>
    <path d="M18 6 6 18M6 6l12 12" />
  </svg>
);

/* Iniciales para avatar */
const initials = (name) =>
  (name || "")
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((s) => s[0]?.toUpperCase())
    .join("") || "U";

export default function ChatDock() {
  const bubbleSize = 60;
  const margin = 10;

  const { user, isAuthenticated, getAccessTokenSilently } = useAuth0();
  const myId = user?.sub || null;

  // Adjuntar/limpiar token automáticamente en axios
  React.useEffect(() => {
    if (!isAuthenticated) {
      attachAuth0(null); // limpia el provider si no hay sesión
      return;
    }
    attachAuth0(async () => {
      try {
        const token = await getAccessTokenSilently({
          authorizationParams: { audience: import.meta.env.VITE_AUTH0_AUDIENCE },
        });
        return token || null;
      } catch {
        return null;
      }
    });
  }, [getAccessTokenSilently, isAuthenticated]);

  // Posición persistida de la burbuja
  const [pos, setPos] = React.useState(() => {
    const saved = localStorage.getItem("chatdock-pos");
    if (saved) return JSON.parse(saved);
    return {
      x: window.innerWidth - bubbleSize - 16,
      y: window.innerHeight - bubbleSize - 24,
    };
  });

  const [open, setOpen] = React.useState(false);
  const [dragging, setDragging] = React.useState(false);
  const [unread, setUnread] = React.useState(0);

  const [messages, setMessages] = React.useState([]);
  const [text, setText] = React.useState("");

  const btnRef = React.useRef(null);
  const startRef = React.useRef({ x: 0, y: 0, px: 0, py: 0, moved: false });
  const listRef = React.useRef(null);

  const clampToViewport = React.useCallback((x, y) => {
    const maxX = window.innerWidth - bubbleSize - margin;
    const maxY = window.innerHeight - bubbleSize - margin;
    return { x: Math.max(margin, Math.min(maxX, x)), y: Math.max(margin, Math.min(maxY, y)) };
  }, []);

  React.useEffect(() => {
    const onResize = () => setPos((p) => clampToViewport(p.x, p.y));
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, [clampToViewport]);

  // Permite abrir el dock desde el footer (evento global)
  React.useEffect(() => {
    const openHandler = () => setOpen(true);
    window.addEventListener("chat:open", openHandler);
    return () => window.removeEventListener("chat:open", openHandler);
  }, []);

  // Drag
  const onPointerDown = (e) => {
    e.preventDefault();
    btnRef.current?.setPointerCapture?.(e.pointerId);
    startRef.current = { x: pos.x, y: pos.y, px: e.clientX, py: e.clientY, moved: false };
  };
  const onPointerMove = (e) => {
    if (!btnRef.current?.hasPointerCapture?.(e.pointerId)) return;
    const dx = e.clientX - startRef.current.px;
    const dy = e.clientY - startRef.current.py;
    if (!startRef.current.moved && Math.hypot(dx, dy) > 4) {
      startRef.current.moved = true;
      setDragging(true);
    }
    if (startRef.current.moved) {
      const { x, y } = clampToViewport(startRef.current.x + dx, startRef.current.y + dy);
      setPos({ x, y });
    }
  };
  const onPointerUp = (e) => {
    try { btnRef.current?.releasePointerCapture?.(e.pointerId); } catch {}
    localStorage.setItem("chatdock-pos", JSON.stringify(pos));
    if (!startRef.current.moved) {
      setOpen((v) => !v);
      if (!open) setUnread(0);
      setTimeout(() => {
        listRef.current?.scrollTo({ top: listRef.current.scrollHeight, behavior: "auto" });
      }, 0);
    }
    setDragging(false);
  };

  // Cargar historial (solo si autenticado)
  React.useEffect(() => {
    if (!isAuthenticated) return;
    let alive = true;
    (async () => {
      try {
        const { data } = await api.get("/api/chat/messages");
        if (alive && Array.isArray(data)) setMessages(data);
      } catch (err) {
        console.error("[chat] GET /api/chat/messages", err?.response?.data || err.message);
      }
    })();
    return () => { alive = false; };
  }, [isAuthenticated]);

  // Enviar con optimista y “replace” por el mensaje real
  const send = async () => {
    const txt = text.trim();
    if (!txt) return;

    const tempId = (crypto?.randomUUID && crypto.randomUUID()) || String(Date.now());

    const optimistic = {
      _id: tempId,
      text: txt,
      user: myId ? { sub: myId, name: user?.name, email: user?.email } : undefined,
      createdAt: new Date().toISOString(),
      optimistic: true,
    };

    setMessages((m) => [...m, optimistic]);
    setText("");

    try {
      // Mandamos también datos del usuario (por si el token no trae name/email)
      const { data } = await api.post("/api/chat/messages", {
        text: txt,
        room: "global",
        userName: user?.name || user?.nickname || user?.email,
        userEmail: user?.email || null,
        userSub: user?.sub || null,
      });
      setMessages((m) => m.map((msg) => (msg._id === tempId ? data : msg)));
    } catch (err) {
      console.error("[chat] POST /api/chat/messages", err?.response?.data || err.message);
      setMessages((m) => m.map((msg) => (msg._id === tempId ? { ...msg, error: true } : msg)));
    }
  };

  // Autoscroll / badge
  React.useEffect(() => {
    if (open) {
      listRef.current?.scrollTo({ top: listRef.current.scrollHeight, behavior: "smooth" });
    } else if (messages.length) {
      setUnread((u) => u + 1);
    }
  }, [messages.length, open]);

  const fmtDate = (v) => {
    const d = new Date(v);
    if (Number.isNaN(d.getTime())) return "";
    return d.toLocaleString();
  };

  // Colocación del panel
  const panelW = 360;
  const panelH = 460;
  const openToLeft = pos.x > window.innerWidth - (panelW + bubbleSize + 20);
  const openUp = pos.y > window.innerHeight - (panelH + bubbleSize + 20);
  const panelLeft = openToLeft
    ? Math.max(8, pos.x - panelW - 12)
    : Math.min(pos.x + bubbleSize + 12, window.innerWidth - panelW - 8);
  const panelTop = openUp
    ? Math.max(8, pos.y - panelH + bubbleSize)
    : Math.min(pos.y, window.innerHeight - panelH - 8);

  return (
    <>
      {open && (
        <div className="chat-panel" style={{ left: panelLeft, top: panelTop, width: panelW, height: panelH }}>
          <div className="chat-header">
            <div className="chat-header__title">Chat interno</div>
            <button onClick={() => setOpen(false)} className="chat-header__close" aria-label="Cerrar chat" title="Cerrar">
              <CloseIcon />
            </button>
          </div>

          <div ref={listRef} className="chat-body">
            {messages.length === 0 ? (
              <div className="chat-empty">No hay mensajes todavía.</div>
            ) : (
              messages.map((m) => {
                const mine =
                  (m.user?.sub && myId && m.user.sub === myId) ||
                  m.from === "yo" ||
                  m.optimistic === true;

                const displayName = mine
                  ? "Tú"
                  : (m.user?.name || m.user?.email || "Desconocido");

                return (
                  <div key={m._id || m.id} className={`chat-row ${mine ? "me" : ""}`}>
                    {!mine && (
                      <div className="chat-avatar" title={displayName}>
                        {initials(displayName)}
                      </div>
                    )}
                    <div className="chat-bubble">
                      <div className="chat-meta">{displayName}</div>
                      <div className={`chat-pill ${mine ? "me" : ""}`}>{m.text}</div>
                      <div className="chat-time">{fmtDate(m.createdAt || m.at)}</div>
                    </div>
                  </div>
                );
              })
            )}
          </div>

          <div className="chat-input">
            <input
              value={text}
              onChange={(e) => setText(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && send()}
              placeholder="Escribe un mensaje…"
            />
            <button onClick={send} className="chat-send" disabled={!text.trim()}>
              Enviar
            </button>
          </div>
        </div>
      )}

      <button
        ref={btnRef}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        className={`chat-fab ${dragging ? "dragging" : ""}`}
        style={{ left: pos.x, top: pos.y, width: bubbleSize, height: bubbleSize }}
        aria-label="Abrir chat interno" title="Chat"
      >
        <div className="chat-fab__glow" aria-hidden />
        <ChatIcon />
        {unread > 0 && !open && <span className="chat-badge">{unread > 9 ? "9+" : unread}</span>}
      </button>
    </>
  );
}
