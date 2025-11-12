import React from "react";

export default function TransmitPage() {
  async function transmit() {
    // Idea: reenviar marcas pendientes offline (IndexedDB) a /checkin/scan
    alert("Transmitiendo rondas (stub). Integra con tu cola offline si la tienes.");
  }
  return (
    <div className="p-4 space-y-3">
      <h1 className="text-xl font-semibold">Transmitir Rondas</h1>
      <p className="text-white/70 text-sm">Reenvía los reportes almacenados localmente.</p>
      <button onClick={transmit} className="px-5 py-2 rounded-xl bg-blue-600 text-white">Transmitir</button>
    </div>
  );
}
