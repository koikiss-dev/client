import React, { useState } from "react";

export default function PhotosPage() {
  const [files, setFiles] = useState([null, null, null, null, null]);

  function onPick(i, f) {
    const next = files.slice();
    next[i] = f?.[0] || null;
    setFiles(next);
  }
  function clear(i) {
    const next = files.slice();
    next[i] = null;
    setFiles(next);
  }
  async function send() {
    // TODO: si tu backend recibe fotos, envíalas aquí (multipart/base64)
    alert("Fotos enviadas (stub). Reemplaza con llamada a tu API.");
  }

  return (
    <div className="p-4 space-y-4">
      <h1 className="text-xl font-semibold">Enviar fotos</h1>
      <div className="grid gap-3 md:grid-cols-2">
        {files.map((f, i) => (
          <div key={i} className="flex items-center gap-2 bg-white/5 border border-white/10 rounded-xl p-3">
            <div className="w-28 text-sm">Toma foto {i+1}</div>
            <input type="file" accept="image/*" onChange={e=>onPick(i, e.target.files)} />
            <button className="px-3 py-1 rounded bg-red-600 text-white" onClick={()=>clear(i)} disabled={!f}>Eliminar</button>
          </div>
        ))}
      </div>
      <button className="px-5 py-2 rounded-xl bg-blue-600 text-white" onClick={send}>Enviar</button>
    </div>
  );
}
