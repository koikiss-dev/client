// src/modules/incidentes/IncidentesList.jsx
import React, { useEffect, useState, useRef } from "react";
import axios from "axios";
import { Link } from "react-router-dom";
import CameraCapture from "../../components/CameraCapture.jsx";

export default function IncidentesList() {
  const [incidentes, setIncidentes] = useState([]);
  const [stats, setStats] = useState({
    abiertos: 0,
    enProceso: 0,
    resueltos: 0,
    alta: 0,
  });
  const [showForm, setShowForm] = useState(false);

  // estado del form inline
  const [form, setForm] = useState({
    type: "Acceso no autorizado",
    description: "",
    reportedBy: "",
    zone: "",
    priority: "alta",
  });
  const [photos, setPhotos] = useState([]);
  const [showCamera, setShowCamera] = useState(false);
  const fileInputRef = useRef(null);

  const API_BASE = import.meta.env.VITE_API_BASE_URL || "http://localhost:4000";
  const API_HOST = API_BASE;

  function recomputeStats(list) {
    const abiertos = list.filter((i) => i.status === "abierto").length;
    const enProceso = list.filter((i) => i.status === "en_proceso").length;
    const resueltos = list.filter((i) => i.status === "resuelto").length;
    const alta = list.filter((i) => i.priority === "alta").length;
    setStats({ abiertos, enProceso, resueltos, alta });
  }

  useEffect(() => {
    axios
      .get(`${API_BASE}/api/incidentes`, { withCredentials: true })
      .then((res) => {
        const data = Array.isArray(res.data)
          ? res.data
          : Array.isArray(res.data?.items)
          ? res.data.items
          : [];
        setIncidentes(data);
        recomputeStats(data);
      })
      .catch((err) => {
        console.error("Error cargando incidentes", err);
      });
  }, [API_BASE]);

  const actualizarEstado = async (id, nuevoEstado) => {
    try {
      await axios.put(
        `${API_BASE}/api/incidentes/${id}`,
        { status: nuevoEstado },
        { withCredentials: true }
      );

      const next = incidentes.map((inc) =>
        inc._id === id ? { ...inc, status: nuevoEstado } : inc
      );
      setIncidentes(next);
      recomputeStats(next);
    } catch (err) {
      console.error("Error actualizando incidente", err);
      alert("No se pudo actualizar el estado");
    }
  };

  // ───────── form inline ─────────
  const handleFormChange = (e) =>
    setForm((prev) => ({ ...prev, [e.target.name]: e.target.value }));

  const handleFile = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const b64 = await fileToBase64(file);
    setPhotos((prev) => [...prev, b64]);
    e.target.value = "";
  };

  const handleCameraCapture = (dataUrl) => {
    setPhotos((prev) => [...prev, dataUrl]);
    setShowCamera(false);
  };

  const removePhoto = (idx) =>
    setPhotos((prev) => prev.filter((_, i) => i !== idx));

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const payload = {
        ...form,
        photosBase64: photos,
        status: "abierto",
      };

      const res = await axios.post(`${API_BASE}/api/incidentes`, payload, {
        withCredentials: true,
      });

      const creado = res.data?.item || res.data;
      const next = [creado, ...incidentes];
      setIncidentes(next);
      recomputeStats(next);

      setForm({
        type: "Acceso no autorizado",
        description: "",
        reportedBy: "",
        zone: "",
        priority: "alta",
      });
      setPhotos([]);
      setShowForm(false);
    } catch (err) {
      console.error("Error creando incidente", err);
      alert("No se pudo crear el incidente");
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#001a12] via-[#00172a] to-[#000000] text-white p-6 max-w-[1400px] mx-auto space-y-8">
      {/* header */}
      <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold text-white">
            Gestión de Incidentes
          </h1>
          <p className="text-sm text-gray-400">
            Registra y da seguimiento a incidentes de seguridad
          </p>
        </div>

        <button
          onClick={() => setShowForm((v) => !v)}
          className="self-start bg-red-600 hover:bg-red-700 text-white text-sm font-medium rounded px-4 py-2 
                     border border-red-400/40 
                     shadow-[0_0_20px_rgba(255,0,0,0.4)] 
                     hover:shadow-[0_0_40px_rgba(255,0,0,0.8)] 
                     transition-all duration-300"
        >
          {showForm ? "Cerrar formulario" : "+ Reportar Incidente"}
        </button>
      </div>

      {/* FORM inline con el MISMO estilo del IncidenteForm */}
      {showForm && (
        <div className="rounded-xl p-6 md:p-8 bg-white/70 dark:bg-white/5 border border-gray-200 dark:border-white/10 shadow-lg backdrop-blur-sm transition-all">
          <h2 className="text-xl font-semibold mb-6 text-gray-900 dark:text-white">
            Reportar Nuevo Incidente
          </h2>
          <form onSubmit={handleSubmit} className="space-y-6 text-sm">
            {/* Tipo */}
            <div>
              <label className="block mb-2 text-gray-700 dark:text-white/80 font-medium">
                Tipo de Incidente
              </label>
              <select
                name="type"
                value={form.type}
                onChange={handleFormChange}
                className="w-full bg-gray-100 dark:bg-black/20 text-gray-800 dark:text-white border border-gray-300 dark:border-white/10 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-cyan-400/60"
              >
                <option>Acceso no autorizado</option>
                <option>Falla técnica</option>
                <option>Objeto perdido</option>
                <option>Otro</option>
              </select>
            </div>

            {/* Descripción */}
            <div>
              <label className="block mb-2 text-gray-700 dark:text-white/80 font-medium">
                Descripción del Incidente
              </label>
              <textarea
                name="description"
                value={form.description}
                onChange={handleFormChange}
                className="w-full bg-gray-100 dark:bg-black/20 text-gray-800 dark:text-white border border-gray-300 dark:border-white/10 rounded-lg px-3 py-2 min-h-[110px] resize-none focus:outline-none focus:ring-2 focus:ring-cyan-400/60 placeholder:text-gray-400 dark:placeholder:text-white/25"
                placeholder="Describa detalladamente lo ocurrido..."
                required
              />
            </div>

            {/* Reportado / Zona */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block mb-2 text-gray-700 dark:text-white/80 font-medium">
                  Reportado por
                </label>
                <input
                  name="reportedBy"
                  value={form.reportedBy}
                  onChange={handleFormChange}
                  className="w-full bg-gray-100 dark:bg-black/20 text-gray-800 dark:text-white border border-gray-300 dark:border-white/10 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-cyan-400/60 placeholder:text-gray-400 dark:placeholder:text-white/25"
                  placeholder="Nombre del guardia o responsable"
                  required
                />
              </div>

              <div>
                <label className="block mb-2 text-gray-700 dark:text-white/80 font-medium">
                  Zona / Ubicación
                </label>
                <input
                  name="zone"
                  value={form.zone}
                  onChange={handleFormChange}
                  className="w-full bg-gray-100 dark:bg-black/20 text-gray-800 dark:text-white border border-gray-300 dark:border-white/10 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-cyan-400/60 placeholder:text-gray-400 dark:placeholder:text-white/25"
                  placeholder="Ej. Entrada Principal / Comayagua / Sala Juntas A"
                  required
                />
              </div>
            </div>

            {/* Prioridad */}
            <div>
              <label className="block mb-2 text-gray-700 dark:text-white/80 font-medium">
                Prioridad
              </label>
              <select
                name="priority"
                value={form.priority}
                onChange={handleFormChange}
                className="w-full bg-gray-100 dark:bg-black/20 text-gray-800 dark:text-white border border-gray-300 dark:border-white/10 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-cyan-400/60"
              >
                <option value="alta">Alta</option>
                <option value="media">Media</option>
                <option value="baja">Baja</option>
              </select>
            </div>

            {/* Evidencias */}
            <div className="space-y-2">
              <label className="block mb-1 text-gray-700 dark:text-white/80 font-medium">
                Evidencias (fotos)
              </label>
              <div className="flex flex-wrap gap-3">
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="bg-gradient-to-r from-[#0F6CBD] to-[#00A6FB] px-4 py-2 rounded-lg font-semibold text-white shadow-[0_0_14px_rgba(0,166,251,0.25)] hover:brightness-110 transition-all inline-flex items-center gap-2"
                >
                  📁 Seleccionar archivo
                </button>

                <button
                  type="button"
                  onClick={() => setShowCamera(true)}
                  className="bg-gradient-to-r from-indigo-600 to-cyan-500 px-4 py-2 rounded-lg font-semibold text-white shadow-[0_0_14px_rgba(99,102,241,0.25)] hover:brightness-110 transition-all inline-flex items-center gap-2"
                >
                  📷 Tomar foto
                </button>

                <p className="text-xs text-gray-500 dark:text-white/40 self-center">
                  Puede adjuntar varias imágenes como evidencia.
                </p>
              </div>

              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                onChange={handleFile}
                className="hidden"
              />

              {photos.length > 0 && (
                <div className="flex flex-wrap gap-3 mt-2">
                  {photos.map((src, idx) => (
                    <div
                      key={idx}
                      className="relative w-24 h-24 rounded-lg overflow-hidden border border-cyan-400/25 bg-black/40"
                    >
                      <img
                        src={src}
                        alt={`evidencia-${idx + 1}`}
                        className="w-full h-full object-cover"
                      />
                      <button
                        type="button"
                        onClick={() => removePhoto(idx)}
                        className="absolute top-1 right-1 bg-black/70 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center"
                      >
                        ✕
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* botones */}
            <div className="pt-2 flex flex-col sm:flex-row gap-3 sm:justify-end">
              <button
                type="button"
                onClick={() => {
                  setShowForm(false);
                  setPhotos([]);
                }}
                className="text-sm bg-transparent border border-gray-300 dark:border-white/10 text-gray-600 dark:text-white/80 rounded-lg px-4 py-2 hover:border-cyan-400/80 hover:text-black dark:hover:text-white transition-all"
              >
                Cancelar
              </button>
              <button
                type="submit"
                className="text-sm bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-400 hover:to-emerald-500 text-white font-semibold rounded-lg px-4 py-2 shadow-[0_0_14px_rgba(16,185,129,0.35)] transition-all duration-300"
              >
                Guardar incidente
              </button>
            </div>
          </form>
        </div>
      )}

      {/* KPIs */}
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
        <div className="rounded-lg bg-[#0f1b2d] border border-red-400/40 p-4">
          <div className="text-xs uppercase text-red-300 font-medium flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-red-500" />
            Incidentes Abiertos
          </div>
          <div className="text-3xl font-semibold text-red-400">
            {stats.abiertos}
          </div>
        </div>
        <div className="rounded-lg bg-[#0f1b2d] border border-blue-400/40 p-4">
          <div className="text-xs uppercase text-blue-300 font-medium flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-blue-500" />
            En Proceso
          </div>
          <div className="text-3xl font-semibold text-blue-400">
            {stats.enProceso}
          </div>
        </div>
        <div className="rounded-lg bg-[#0f1b2d] border border-green-400/40 p-4">
          <div className="text-xs uppercase text-green-300 font-medium flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-green-500" />
            Resueltos
          </div>
          <div className="text-3xl font-semibold text-green-400">
            {stats.resueltos}
          </div>
        </div>
        <div className="rounded-lg bg-[#0f1b2d] border border-yellow-400/40 p-4">
          <div className="text-xs uppercase text-yellow-300 font-medium flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-yellow-400" />
            Alta prioridad
          </div>
          <div className="text-3xl font-semibold text-yellow-300">
            {stats.alta}
          </div>
        </div>
      </div>

      {/* LISTA */}
      <div className="bg-[#0f1b2d] border border-cyan-400/20 rounded-lg shadow-[0_0_30px_rgba(0,255,255,0.08)] overflow-hidden">
        <div className="flex flex-col md:flex-row justify-between items-center p-4 border-b border-cyan-400/10 gap-3">
          <div>
            <h2 className="font-semibold text-lg text-white">
              Lista de Incidentes
            </h2>
            <p className="text-xs text-gray-400">
              Historial de reportes registrados en el sistema
            </p>
          </div>
          <div className="w-full md:w-1/3">
            <input
              className="w-full bg-[#1e2a3f] text-white text-sm rounded-md px-3 py-2 
                         border border-cyan-400/20 placeholder-gray-500 
                         focus:outline-none focus:ring-2 focus:ring-cyan-400/40 
                         transition-all duration-200"
              placeholder="Buscar por tipo, descripción o zona..."
            />
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left text-gray-200">
            <thead className="bg-[#1e2a3f] text-gray-400 uppercase text-xs border-b border-cyan-400/10">
              <tr>
                <th className="px-4 py-3 font-medium">TIPO</th>
                <th className="px-4 py-3 font-medium">DESCRIPCIÓN</th>
                <th className="px-4 py-3 font-medium">REPORTADO POR</th>
                <th className="px-4 py-3 font-medium">ZONA</th>
                <th className="px-4 py-3 font-medium">FECHA</th>
                <th className="px-4 py-3 font-medium">PRIORIDAD</th>
                <th className="px-4 py-3 font-medium">ESTADO</th>
                <th className="px-4 py-3 font-medium">EVIDENCIAS</th>
                <th className="px-4 py-3 font-medium text-right">ACCIONES</th>
              </tr>
            </thead>
            <tbody>
              {incidentes.length === 0 ? (
                <tr>
                  <td
                    colSpan={9}
                    className="text-center text-gray-500 py-10 text-sm"
                  >
                    No hay incidentes registrados.
                  </td>
                </tr>
              ) : (
                incidentes.map((i) => {
                  const photos =
                    Array.isArray(i.photos) && i.photos.length
                      ? i.photos
                      : Array.isArray(i.photosBase64)
                      ? i.photosBase64
                      : [];

                  return (
                    <tr
                      key={i._id}
                      className="border-b border-cyan-400/5 hover:bg-[#1b2d44] transition-colors"
                    >
                      <td className="px-4 py-3 text-white font-medium">
                        {i.type}
                      </td>
                      <td className="px-4 py-3 text-gray-300 max-w-[320px] truncate">
                        {i.description}
                      </td>
                      <td className="px-4 py-3 text-gray-200">
                        {i.reportedBy}
                      </td>
                      <td className="px-4 py-3 text-gray-200">{i.zone}</td>
                      <td className="px-4 py-3 whitespace-nowrap text-gray-400 text-xs">
                        {i.date || i.createdAt
                          ? new Date(i.date || i.createdAt).toLocaleString()
                          : "—"}
                      </td>
                      <td className="px-4 py-3">
                        <span
                          className={
                            "px-2 py-1 rounded text-[11px] font-semibold uppercase tracking-wide " +
                            (i.priority === "alta"
                              ? "bg-red-600/20 text-red-400 border border-red-500/40"
                              : i.priority === "media"
                              ? "bg-yellow-400/20 text-yellow-300 border border-yellow-400/40"
                              : "bg-green-600/20 text-green-400 border border-green-500/40")
                          }
                        >
                          {i.priority}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <span
                          className={
                            "px-2 py-1 rounded text-[11px] font-semibold uppercase tracking-wide " +
                            (i.status === "resuelto"
                              ? "bg-green-600/20 text-green-400 border border-green-500/40"
                              : i.status === "en_proceso"
                              ? "bg-blue-600/20 text-blue-400 border border-blue-500/40"
                              : "bg-red-600/20 text-red-400 border border-red-500/40")
                          }
                        >
                          {i.status === "en_proceso"
                            ? "En proceso"
                            : i.status === "resuelto"
                            ? "Resuelto"
                            : "Abierto"}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        {photos.length ? (
                          <div className="flex gap-2">
                            {photos.slice(0, 3).map((p, idx) => {
                              const src =
                                typeof p === "string" &&
                                (p.startsWith("http") || p.startsWith("data:"))
                                  ? p
                                  : `${API_HOST}${p}`;
                              return (
                                <a
                                  key={idx}
                                  href={src}
                                  target="_blank"
                                  rel="noreferrer"
                                  className="block w-12 h-12 rounded overflow-hidden border border-cyan-400/20 bg-black/30"
                                >
                                  <img
                                    src={src}
                                    alt="evidencia"
                                    className="w-full h-full object-cover"
                                  />
                                </a>
                              );
                            })}
                            {photos.length > 3 && (
                              <span className="text-xs text-gray-400">
                                +{photos.length - 3}
                              </span>
                            )}
                          </div>
                        ) : (
                          <span className="text-xs text-gray-500">—</span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-right whitespace-nowrap">
                        {i.status === "abierto" && (
                          <button
                            onClick={() =>
                              actualizarEstado(i._id, "en_proceso")
                            }
                            className="text-[11px] bg-blue-600 hover:bg-blue-700 text-white rounded px-3 py-1 transition-all duration-300"
                          >
                            Procesar
                          </button>
                        )}
                        {i.status === "en_proceso" && (
                          <button
                            onClick={() =>
                              actualizarEstado(i._id, "resuelto")
                            }
                            className="text-[11px] bg-green-600 hover:bg-green-700 text-white rounded px-3 py-1 transition-all duration-300"
                          >
                            Resolver
                          </button>
                        )}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        <div className="flex justify-end p-4 border-t border-cyan-400/10">
          <button
            onClick={() => setShowForm((v) => !v)}
            className="bg-red-600 hover:bg-red-700 text-white text-sm font-medium rounded px-4 py-2 transition-all duration-300"
          >
            {showForm ? "Cerrar formulario" : "+ Reportar Incidente"}
          </button>
        </div>
      </div>

      <div className="text-xs text-gray-500">
        <Link
          to="/"
          className="hover:text-white hover:underline underline-offset-4 transition-colors"
        >
          ← Volver al panel principal
        </Link>
      </div>

      {showCamera && (
        <CameraCapture
          onCapture={handleCameraCapture}
          onClose={() => setShowCamera(false)}
        />
      )}
    </div>
  );
}

// util
function fileToBase64(file) {
  return new Promise((resolve, reject) => {
    const r = new FileReader();
    r.onload = () => resolve(r.result);
    r.onerror = reject;
    r.readAsDataURL(file);
  });
}
