// client/src/components/GlobalPanicListener.jsx
import React, { useEffect, useRef, useState } from "react";
import { useAuth0 } from "@auth0/auth0-react";

// 👇 ajusta esta ruta si tu hook está en otro lado
import { useAssignmentSocket } from "../modules/rondasqr/hooks/useAssignmentSocket.js";
// 👇 este es el bus local que ya usas en ScanPage
import { subscribeLocalPanic } from "../modules/rondasqr/utils/panicBus.js";

export default function GlobalPanicListener() {
  const { user } = useAuth0();
  const audioRef = useRef(null);
  const [hasAlert, setHasAlert] = useState(false);

  // sonido corto integrado en base64
  const BEEP_SRC =
    "data:audio/wav;base64,UklGRlCZAABXQVZFZm10IBAAAAABAAEAIlYAAESsAAACABAAZGF0YTmZAACAgICAgICAgICAgP//////AAD///8AAAAAAP///////wD///8AAAAAAP///////wD///8AAAAAAP///////wD///8AAAAAAP///////wD///8AAAAAAP///////wD///8AAAAAAP///////wD///8AAAAAAP///////wD///8AAAAAAP////8=";

  // 1) escuchar lo que venga por socket (servidor)
  useAssignmentSocket(user, (evt) => {
    const t = evt?.type || evt?.event || evt?.kind;
    if (
      t === "panic" ||
      t === "rondasqr:panic" ||
      t === "alert" ||
      t === "rondasqr:alert"
    ) {
      triggerAlert();
    }
  });

  // 2) escuchar lo que dispare cualquier página local (emitLocalPanic)
  useEffect(() => {
    const unsub = subscribeLocalPanic(() => {
      triggerAlert();
    });
    return () => unsub && unsub();
  }, []);

  function triggerAlert() {
    setHasAlert(true);
    if (audioRef.current) {
      audioRef.current.currentTime = 0;
      audioRef.current.play().catch(() => {
        // si no deja reproducir porque no hubo interacción, lo ignoramos
      });
    }
  }

  return (
    <>
      {/* audio oculto */}
      <audio ref={audioRef} src={BEEP_SRC} preload="auto" />

      {/* icono rojo flotante */}
      {hasAlert && (
        <button
          onClick={() => setHasAlert(false)}
          className="fixed top-4 right-4 z-[9999] w-14 h-14 rounded-full bg-red-600 border-4 border-red-300
                     flex flex-col items-center justify-center text-white text-[10px] font-bold
                     animate-pulse shadow-lg"
          title="Alerta de pánico recibida"
        >
          ALERTA
        </button>
      )}
    </>
  );
}
