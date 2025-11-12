import React, { useState } from "react";

export default function DatabaseUploadPage() {
  const [file, setFile] = useState(null);
  const [sending, setSending] = useState(false);

  async function upload() {
    if (!file || sending) return;
    setSending(true);

    const apiBase = import.meta.env.VITE_API_BASE_URL || "http://localhost:4000";

    // ejemplo muy simple: mandamos sólo el nombre del archivo
    // (cuando quieras puedes mandar el contenido)
    const res = await fetch(`${apiBase}/api/rondasqr-offline/v1/dump`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({
        at: new Date().toISOString(),
        fileName: file.name,
        marks: [],
        incidents: [],
        alerts: [],
      }),
    });

    const data = await res.json().catch(() => null);

    if (res.ok && data?.ok) {
      alert("📤 Base enviada (stub).");
    } else {
      alert(
        "No se pudo enviar la base de datos.\n" +
          `HTTP ${res.status}\n` +
          (data ? JSON.stringify(data) : "")
      );
    }

    setSending(false);
  }

  return (
    <div className="p-4 space-y-3">
      <h1 className="text-xl font-semibold">Enviar base de datos</h1>
      <input
        type="file"
        accept=".csv,.kml,.json"
        onChange={(e) => setFile(e.target.files?.[0] || null)}
      />
      <button
        disabled={!file || sending}
        onClick={upload}
        className="px-5 py-2 rounded-xl bg-blue-600 text-white disabled:opacity-50"
      >
        {sending ? "Enviando..." : "Enviar"}
      </button>
    </div>
  );
}
