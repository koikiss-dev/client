// client/src/components/NotificationsProvider.jsx
import React from "react";
import api from "../lib/api.js";
import { getSocket } from "../lib/notifications.js";

export const NotificationsContext = React.createContext(null);

export default function NotificationsProvider({ children }) {
  const [counts, setCounts] = React.useState({
    email: 0,
    message: 0,
    appointment: 0,
    total: 0,
  });

  React.useEffect(() => {
    let active = true;

    const fetchCounts = async () => {
      try {
        const { data } = await api.get("/api/notifications/counts");
        if (!active) return;

        // Acepta tanto {unread, alerts, total} como {email, message, appointment, total}
        if (data && typeof data === "object") {
          if ("unread" in data || "alerts" in data) {
            const unread = Number(data.unread || 0);
            const alerts = Number(data.alerts || 0);
            setCounts({
              email: 0,
              message: 0,
              appointment: 0,
              total: Number(data.total ?? unread + alerts),
              unread,
              alerts,
            });
          } else {
            setCounts({
              email: Number(data.email || 0),
              message: Number(data.message || 0),
              appointment: Number(data.appointment || 0),
              total: Number(data.total || 0),
            });
          }
        }
      } catch {
        // silencioso
      }
    };

    // Carga inicial
    fetchCounts();

    // Socket
    const s = getSocket();
    const onCountUpdated = (payload) => {
      // si el backend envía conteos directamente
      if (payload && typeof payload === "object") {
        if ("unread" in payload || "alerts" in payload) {
          const unread = Number(payload.unread || 0);
          const alerts = Number(payload.alerts || 0);
          setCounts({
            email: 0,
            message: 0,
            appointment: 0,
            total: Number(payload.total ?? unread + alerts),
            unread,
            alerts,
          });
          return;
        }
        if ("email" in payload || "message" in payload || "appointment" in payload) {
          setCounts({
            email: Number(payload.email || 0),
            message: Number(payload.message || 0),
            appointment: Number(payload.appointment || 0),
            total: Number(payload.total || 0),
          });
          return;
        }
      }
      // si no hay payload usable, rehacer fetch
      fetchCounts();
    };

    s.on("notifications:count-updated", onCountUpdated);
    s.on("email:new", fetchCounts);
    s.on("message:new", fetchCounts);
    s.on("appointment:new", fetchCounts);

    return () => {
      active = false;
      s.off("notifications:count-updated", onCountUpdated);
      s.off("email:new", fetchCounts);
      s.off("message:new", fetchCounts);
      s.off("appointment:new", fetchCounts);
    };
  }, []);

  const clear = async () => {
    try {
      const { data } = await api.post("/api/notifications/clear");
      // mismo manejo flexible de forma
      if (data && typeof data === "object") {
        if ("unread" in data || "alerts" in data) {
          const unread = Number(data.unread || 0);
          const alerts = Number(data.alerts || 0);
          setCounts({
            email: 0,
            message: 0,
            appointment: 0,
            total: Number(data.total ?? unread + alerts),
            unread,
            alerts,
          });
        } else {
          setCounts({
            email: Number(data.email || 0),
            message: Number(data.message || 0),
            appointment: Number(data.appointment || 0),
            total: Number(data.total || 0),
          });
        }
      }
    } catch {
      // silencioso
    }
  };

  return (
    <NotificationsContext.Provider value={{ counts, clear }}>
      {children}
    </NotificationsContext.Provider>
  );
}
