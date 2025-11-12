import React from "react";
import MapView from "./MapView";

export default function Playback({ items=[] }) {
  const [idx, setIdx] = React.useState(0);
  const safe = items.filter(m => m?.loc?.coordinates?.length===2);

  React.useEffect(() => {
    if (!safe.length) return;
    const t = setInterval(()=> setIdx(i => (i+1) % safe.length), 1500);
    return ()=> clearInterval(t);
  }, [safe.length]);

  const current = safe[idx] ? [safe[idx]] : [];
  return (
    <div className="rounded-2xl border border-white/10 bg-white/5 backdrop-blur p-4 shadow-lg">
      <div className="flex items-center justify-between mb-2">
        <h3 className="font-semibold text-lg">Reproducción de ronda</h3>
        <div className="text-sm">Punto {idx+1}/{safe.length}</div>
      </div>
      {/* MapView ya soporta un array de ítems; mostramos solo el actual para simular movimiento */}
      <MapView items={current.length? current : safe}/>
      <input type="range" min={0} max={Math.max(0, safe.length-1)} value={idx}
             onChange={e=>setIdx(Number(e.target.value))}
             className="w-full mt-3"/>
    </div>
  );
}
