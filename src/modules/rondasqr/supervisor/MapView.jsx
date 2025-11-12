import React, { useMemo } from "react";
import { MapContainer, TileLayer, Polyline, Marker, Popup } from "react-leaflet";
import "leaflet/dist/leaflet.css";
import L from "leaflet";

const icon = new L.Icon({
  iconUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
  shadowUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
  iconSize: [25, 41],
  iconAnchor: [12, 41],
});

export default function MapView({ items = [] }) {
  const coords = useMemo(
    () =>
      items
        .map((m) => m?.loc?.coordinates || (typeof m.lon === "number" && typeof m.lat === "number" ? [m.lon, m.lat] : null))
        .filter((v) => Array.isArray(v) && v.length === 2)
        .map(([lon, lat]) => [lat, lon]),
    [items]
  );

  if (!coords.length) {
    return <div className="text-sm text-white/70">No hay ubicaciones para graficar.</div>;
  }

  const center = coords[Math.floor(coords.length / 2)];

  return (
    <div className="h-[360px] rounded-xl overflow-hidden border border-white/10">
      <MapContainer center={center} zoom={16} style={{ height: "100%", width: "100%" }}>
        <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
        <Polyline positions={coords} />
        {coords.map((c, i) => (
          <Marker key={i} position={c} icon={icon}>
            <Popup>Marca #{i + 1}</Popup>
          </Marker>
        ))}
      </MapContainer>
    </div>
  );
}
