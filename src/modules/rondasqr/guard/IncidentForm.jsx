// src/modules/rondasqr/guard/IncidentForm.jsx
import React, { useState } from "react";
import { rondasqrApi } from "../api/rondasqrApi.js";

export default function IncidentForm() {
  const [text, setText] = useState("");
  const [files, setFiles] = useState([]);
  const [sending, setSending] = useState(false);

  async function submit(e) {
    if (e) e.preventDefault();
    if (!text.trim()) {
      alert("Describe el incidente.");
      return;
    }

    setSending(true);

    // 1️⃣ Intentar obtener ubicación GPS (opcional)
    let gps = null;
    try {
      gps = await new Promise((res) =>
        navigator.geolocation.getCurrentPosition(
          (p) => res({ lat: p.coords.latitude, lon: p.coords.longitude }),
          () => res(null)
        )
      );
    } catch (_) {}

    // 2️⃣ Enviar solo al módulo de RONDAS
    try {
      const fd = new FormData();
      fd.append("text", text);
      if (gps) {
        fd.append("lat", gps.lat);
        fd.append("lon", gps.lon);
      }
      [...files].forEach((f) => fd.append("photos", f));

      // ✅ Este endpoint ahora se encarga de guardar en rondas y en incidentes global
      await rondasqrApi.createIncident(fd);

      alert("✅ Incidente de ronda enviado correctamente.");
      setText("");
      setFiles([]);
    } catch (err) {
      console.error("Error al enviar el incidente:", err);
      alert("Error al enviar el incidente. Intenta de nuevo.");
    } finally {
      setSending(false);
    }
  }

  return (
    <div className="p-4 bg-slate-900/30 rounded-xl border border-slate-800">
      <h2 className="font-medium text-white mb-3">Registrar incidente de ronda</h2>

      <form onSubmit={submit} className="space-y-3">
        <textarea
          className="border border-slate-700 bg-slate-900/40 w-full p-2 rounded text-white"
          maxLength={200}
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder="Descripción (max 200)"
        />

        <input
          type="file"
          multiple
          accept="image/*"
          onChange={(e) => setFiles(e.target.files)}
          className="mt-2 text-white"
        />

        <button
          type="submit"
          disabled={sending}
          className="mt-3 bg-blue-600 hover:bg-blue-700 disabled:opacity-60 text-white px-4 py-2 rounded"
        >
          {sending ? "Enviando..." : "Enviar"}
        </button>
      </form>
    </div>
  );
}
  