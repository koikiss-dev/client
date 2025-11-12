import React, { useEffect, useRef, useState } from "react";

export default function CameraCapture({ onCapture, onClose }) {
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const [error, setError] = useState("");

  useEffect(() => {
    let stream;
    (async () => {
      try {
        stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: "environment" },
          audio: false,
        });
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          await videoRef.current.play();
        }
      } catch (err) {
        console.error("[CameraCapture] no se pudo abrir la cámara", err);
        setError("No se pudo acceder a la cámara");
      }
    })();

    return () => {
      if (stream) {
        stream.getTracks().forEach((t) => t.stop());
      }
    };
  }, []);

  function takePhoto() {
    try {
      const video = videoRef.current;
      const canvas = canvasRef.current;
      if (!video || !canvas) return;

      const w = video.videoWidth || 640;
      const h = video.videoHeight || 480;
      canvas.width = w;
      canvas.height = h;

      const ctx = canvas.getContext("2d");
      ctx.drawImage(video, 0, 0, w, h);
      const dataUrl = canvas.toDataURL("image/jpeg", 0.9);

      if (typeof onCapture === "function") {
        onCapture(dataUrl);
      }
    } catch (err) {
      console.error("[CameraCapture] error al capturar", err);
      setError("No se pudo capturar la foto");
    }
  }

  return (
    <div className="fixed inset-0 z-[999] flex items-center justify-center bg-black/70 backdrop-blur-sm">
      <div className="bg-slate-900/90 border border-white/10 rounded-2xl w-full max-w-md mx-4 overflow-hidden shadow-2xl">
        <div className="flex items-center justify-between px-4 py-3 border-b border-white/10">
          <h3 className="text-white font-semibold text-sm">Capturar foto</h3>
          <button
            onClick={onClose}
            className="text-white/70 hover:text-white text-sm"
          >
            ✕
          </button>
        </div>

        <div className="p-4 space-y-3">
          {error ? (
            <div className="text-red-200 text-sm">{error}</div>
          ) : (
            <div className="relative rounded-lg overflow-hidden bg-black aspect-video">
              <video
                ref={videoRef}
                className="w-full h-full object-cover"
                playsInline
                muted
              />
            </div>
          )}

          <div className="flex justify-end gap-2">
            <button
              onClick={onClose}
              className="px-4 py-2 rounded-lg bg-slate-700/60 text-white text-sm"
            >
              Cancelar
            </button>
            <button
              onClick={takePhoto}
              className="px-4 py-2 rounded-lg bg-cyan-500 hover:bg-cyan-400 text-white text-sm font-semibold"
              disabled={!!error}
            >
              Tomar foto
            </button>
          </div>
        </div>

        {/* canvas oculto */}
        <canvas ref={canvasRef} className="hidden" />
      </div>
    </div>
  );
}
