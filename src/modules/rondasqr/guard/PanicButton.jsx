// guard/PanicButton.jsx
import React from "react";
import { rondasqrApi } from "../api/rondasqrApi.js";

export default function PanicButton() {
  async function sendPanic() {
    let gps = null;
    if ("geolocation" in navigator) {
      gps = await new Promise((resolve) => {
        navigator.geolocation.getCurrentPosition(
          (p) => resolve({ lat: p.coords.latitude, lon: p.coords.longitude }),
          () => resolve(null),
          { enableHighAccuracy: true, timeout: 5000 }
        );
      });
    }

    await rondasqrApi.panic(gps);
    alert("🚨 Alerta de pánico enviada.");
    // si quieres que este también vaya al mismo lugar:
    window.location.assign("/rondasqr/scan");
  }

  return (
    <button
      onClick={sendPanic}
      className="bg-red-600 text-white px-6 py-4 rounded-2xl w-full"
    >
      ALERTA
    </button>
  );
}
