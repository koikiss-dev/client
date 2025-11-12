import React, { useEffect, useRef, useState } from "react";

export default function NewVisitorModal({ onClose, onSubmit }) {
  const [name, setName] = useState("");
  const [document, setDocument] = useState("");
  const [company, setCompany] = useState("");
  const [employee, setEmployee] = useState(""); // texto libre
  const [reason, setReason] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const firstInputRef = useRef(null);

  // ===== Helpers de horario de atención =====
  // Rangos válidos: [08:00, 12:00) y [13:00, 17:00) (12:00 y 17:00 excluidas)
  function isWithinBusinessHours(date) {
    if (!(date instanceof Date) || isNaN(date)) return false;
    const minutes = date.getHours() * 60 + date.getMinutes();
    const AM_START = 8 * 60;   // 08:00
    const AM_END   = 12 * 60;  // 12:00 (excluido)
    const PM_START = 13 * 60;  // 13:00
    const PM_END   = 17 * 60;  // 17:00 (excluido)
    return (minutes >= AM_START && minutes < AM_END) ||
           (minutes >= PM_START && minutes < PM_END);
  }
  function businessHoursMessage() {
    return "Horario permitido: 8:00–12:00 y 13:00–17:00 (12:00 y 17:00 no permitidas).";
  }
  // ==========================================

  // Auto-focus al abrir
  useEffect(() => {
    firstInputRef.current?.focus();
  }, []);

  // Cerrar con ESC
  useEffect(() => {
    function onKeyDown(e) {
      if (e.key === "Escape") onClose?.();
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [onClose]);

  async function handleSubmit(e) {
    e.preventDefault();
    if (submitting) return;
    setSubmitting(true);

    try {
      // Validaciones rápidas en UI
      if (!name.trim() || !document.trim() || !employee.trim() || !reason.trim()) {
        alert("Completa los campos obligatorios.");
        setSubmitting(false);
        return;
      }

      // ✅ Validación de horario con la hora local actual
      const now = new Date();
      if (!isWithinBusinessHours(now)) {
        alert(`No se puede registrar la visita fuera del horario permitido.\n${businessHoursMessage()}`);
        setSubmitting(false);
        return;
      }

      // Enviamos limpio; el padre ya vuelve a validar/trim
      await onSubmit?.({
        name: name.trim(),
        document: document.trim(),
        company: company.trim(),
        employee: employee.trim() || undefined, // <- texto libre
        reason: reason.trim(),
        phone: phone.trim(),
        email: email.trim(),
        // Si en el futuro agregas una hora específica, aquí enviarías:
        // scheduledAt: selectedDateTime.toISOString(),
      });
      // Importante: no cerramos aquí; el padre lo hace cuando el POST sale bien.
    } catch (err) {
      console.error("[NewVisitorModal] onSubmit error:", err);
      alert("No se pudo registrar. Revisa la conexión e inténtalo de nuevo.");
    } finally {
      setSubmitting(false);
    }
  }

  // Cerrar al hacer click fuera de la tarjeta
  function handleBackdrop(e) {
    if (e.target === e.currentTarget) onClose?.();
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60"
      onMouseDown={handleBackdrop}
    >
      <div
        className="w-[95%] max-w-[560px] card-rich p-4 md:p-5"
        role="dialog"
        aria-modal="true"
        aria-labelledby="new-visitor-title"
        onMouseDown={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between mb-4">
          <h3 id="new-visitor-title" className="text-lg font-semibold text-neutral-100">
            Registrar Visitante
          </h3>
          <button
            type="button"
            onClick={onClose}
            className="text-neutral-400 hover:text-neutral-200"
            aria-label="Cerrar"
          >
            ✕
          </button>
        </div>

        {/* Aviso de horario en la UI */}
        <div className="mb-3 text-xs text-amber-300 bg-amber-500/10 border border-amber-500/30 rounded-md px-3 py-2">
          {businessHoursMessage()}
        </div>

        <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <div className="md:col-span-2">
            <label className="text-xs text-neutral-400">Nombre completo</label>
            <input
              ref={firstInputRef}
              className="input-fx w-full"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Ej. María López"
              required
            />
          </div>

          <div>
            <label className="text-xs text-neutral-400">Documento</label>
            <input
              className="input-fx w-full"
              value={document}
              onChange={(e) => setDocument(e.target.value)}
              placeholder="0801-YYYY-XXXXX"
              required
              inputMode="numeric"
            />
          </div>

          <div>
            <label className="text-xs text-neutral-400">Empresa</label>
            <input
              className="input-fx w-full"
              value={company}
              onChange={(e) => setCompany(e.target.value)}
              placeholder="SENAF / Munily S.A."
            />
          </div>

          {/* Empleado anfitrión: texto libre */}
          <div className="md:col-span-2">
            <label className="text-xs text-neutral-400">Empleado anfitrión</label>
            <input
              className="input-fx w-full"
              value={employee}
              onChange={(e) => setEmployee(e.target.value)}
              placeholder="Nombre de la persona que visita"
              required
            />
          </div>

          <div className="md:col-span-2">
            <label className="text-xs text-neutral-400">Motivo</label>
            <input
              className="input-fx w-full"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="Reunión / Entrega / Mantenimiento…"
              required
            />
          </div>

          <div>
            <label className="text-xs text-neutral-400">Teléfono</label>
            <input
              className="input-fx w-full"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="+504 9999-9999"
              type="tel"
              inputMode="tel"
            />
          </div>

          <div>
            <label className="text-xs text-neutral-400">Correo</label>
            <input
              type="email"
              className="input-fx w-full"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="correo@empresa.com"
            />
          </div>

          <div className="md:col-span-2 flex items-center justify-end gap-2 mt-2">
            <button
              type="button"
              onClick={onClose}
              className="px-3 py-2 text-sm rounded-lg bg-neutral-700/40 hover:bg-neutral-700/60"
              disabled={submitting}
            >
              Cancelar
            </button>
            <button
              type="submit"
              className="btn-neon px-3 py-2 text-sm rounded-lg font-semibold disabled:opacity-60"
              disabled={submitting}
            >
              {submitting ? "Registrando…" : "Registrar"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
