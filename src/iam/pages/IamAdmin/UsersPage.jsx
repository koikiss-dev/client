// client/src/iam/pages/IamAdmin/UsersPage.jsx
import React, { useEffect, useMemo, useRef, useState } from "react";
import { iamApi } from "../../api/iamApi.js";
import { Edit3, Trash2 } from "lucide-react";

const DISPLAY_ROLES = [
  "Administrador",
  "Supervisor",
  "Guardia",
  "Administrador IT",
  "Visita Externa",
];

const ROLE_MAP_UI_TO_DB = {
  Administrador: "admin",
  Supervisor: "supervisor",
  Guardia: "guardia",
  "Administrador IT": "ti",
  "Visita Externa": "visitante",
};

const ROLE_MAP_DB_TO_UI = Object.fromEntries(
  Object.entries(ROLE_MAP_UI_TO_DB).map(([ui, db]) => [db, ui])
);

const ESTADOS_CIVILES = ["Soltero/a", "Casado/a", "Divorciado/a", "Viudo/a", "Unión libre"];

/* ===================== Helpers ===================== */
function getPath(obj, path) {
  return path.split(".").reduce((o, k) => (o == null ? undefined : o[k]), obj);
}
function getVal(obj, paths, fallback = "") {
  for (const p of paths) {
    const v = p.includes(".") ? getPath(obj, p) : obj?.[p];
    if (v !== undefined && v !== null && v !== "") return v;
  }
  return fallback;
}
function toDateInputSafe(value) {
  if (!value) return "";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return "";
  return d.toISOString().slice(0, 10);
}
/** Normaliza el objeto de backend a las claves del form */
function mapUserToFormSafe(api = {}) {
  const nombreFromParts = [getVal(api, ["persona.nombres"], ""), getVal(api, ["persona.apellidos"], "")]
    .join(" ")
    .trim() || undefined;

  const fechaRaw = getVal(api, [
    "fechaNacimiento",
    "fecha_nacimiento",
    "birthDate",
    "persona.fechaNacimiento",
    "persona.fecha_nacimiento",
    "persona.fnac",
    "datosNacimiento.fecha",
    "nacimiento.fecha",
  ]);

  let roles = getVal(api, ["roles", "persona.roles"], []);
  if (typeof roles === "string") roles = [roles];
  if (Array.isArray(roles)) {
    roles = roles
      .map((r) => (typeof r === "string" ? r : r?.code || r?.name || r?.nombre || ""))
      .filter(Boolean);
  } else {
    roles = [];
  }

  const active =
    getVal(api, ["active", "persona.active"], undefined) ??
    (getVal(api, ["estado"], "") === "activo"
      ? true
      : getVal(api, ["estado"], "") === "inactivo"
      ? false
      : true);

  const civil = getVal(api, ["estadoCivil", "estado_civil", "civilStatus", "persona.estadoCivil"], "");
  const civilOk = ESTADOS_CIVILES.includes(civil) ? civil : "";

  return {
    // PERSONALES
    nombreCompleto: getVal(api, ["nombreCompleto", "fullName", "name", "persona.nombreCompleto"], nombreFromParts || ""),
    tipoDni: getVal(api, ["tipoDni", "persona.tipoDni"], "Identidad"),
    dni: getVal(api, ["dni", "documento", "num_documento", "numeroDocumento", "persona.dni", "persona.numeroDocumento"], ""),
    estadoCivil: civilOk,
    fechaNacimiento: toDateInputSafe(fechaRaw),
    paisNacimiento: getVal(api, ["paisNacimiento", "pais_nacimiento", "countryOfBirth", "persona.pais", "datosNacimiento.pais", "nacimiento.pais"], ""),
    ciudadNacimiento: getVal(api, ["ciudadNacimiento", "ciudad_nacimiento", "cityOfBirth", "persona.ciudad", "datosNacimiento.ciudad", "nacimiento.ciudad"], ""),
    municipioNacimiento: getVal(api, ["municipioNacimiento", "municipio", "persona.municipio", "datosNacimiento.municipio", "nacimiento.municipio", "ubicacion.municipio"], ""),
    correoPersona: getVal(api, ["correoPersona", "email", "correo", "mail", "persona.correo", "persona.email"], ""),
    profesion: getVal(api, ["profesion", "ocupacion", "persona.ocupacion"], ""),
    lugarTrabajo: getVal(api, ["lugarTrabajo", "dondeLabora", "empresa", "persona.lugar_trabajo", "persona.dondeLabora"], ""),
    telefono: getVal(api, ["telefono", "phone", "celular", "tel", "telefono1", "telefono2", "persona.telefono", "persona.celular", "contacto.telefono"], ""),
    domicilio: getVal(api, ["domicilio", "direccion", "address", "direccionResidencia", "persona.direccion", "persona.domicilio", "ubicacion.direccion"], ""),
    // IAM
    roles,
    active,
    id_persona: getVal(api, ["id_persona", "persona.id_persona"], null),
    _id: getVal(api, ["_id", "id", "persona._id"], undefined),
  };
}

function RoleBadges({ roles = [] }) {
  const uiNames = roles.map((r) => ROLE_MAP_DB_TO_UI[r] || r);
  return (
    <div className="flex flex-wrap gap-1">
      {uiNames.length === 0 ? (
        <span className="text-neutral-500">—</span>
      ) : (
        uiNames.map((r, i) => (
          <span
            key={`${r}-${i}`}
            className="text-xs px-2 py-1 rounded bg-neutral-100 text-neutral-800 dark:bg-neutral-700 dark:text-neutral-100"
          >
            {r}
          </span>
        ))
      )}
    </div>
  );
}

function RoleSelect({ value = [], onChange }) {
  const [open, setOpen] = useState(false);
  const selected = new Set(value.map((v) => ROLE_MAP_DB_TO_UI[v] || v));
  const toggle = (uiName) => {
    const copy = new Set(selected);
    if (copy.has(uiName)) copy.delete(uiName);
    else copy.add(uiName);
    const dbList = Array.from(copy).map((ui) => ROLE_MAP_UI_TO_DB[ui] || ui);
    onChange(dbList);
  };
  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="w-full px-3 py-2 rounded border border-neutral-300 dark:border-neutral-600 bg-white dark:bg-neutral-800 text-left"
      >
        {selected.size === 0 ? "Seleccionar rol(es)" : Array.from(selected).join(", ")}
      </button>
      {open && (
        <div className="absolute z-10 mt-1 w-full max-h-60 overflow-auto rounded border border-neutral-300 dark:border-neutral-600 bg-white dark:bg-neutral-800 shadow">
          {DISPLAY_ROLES.map((ui) => (
            <label key={ui} className="flex items-center gap-2 px-3 py-2 hover:bg-neutral-50 dark:hover:bg-neutral-700">
              <input type="checkbox" className="scale-110" checked={selected.has(ui)} onChange={() => toggle(ui)} />
              <span>{ui}</span>
            </label>
          ))}
        </div>
      )}
    </div>
  );
}

function passwordRules(p = "") {
  return { length: p.length >= 8, upper: /[A-Z]/.test(p), lower: /[a-z]/.test(p), digit: /\d/.test(p) };
}
/* =================================================== */

/* ========= NUEVO (helper robusto de mapeo) ========= */
function firstNonEmpty(...vals) {
  for (const v of vals) {
    if (v !== undefined && v !== null && String(v).trim() !== "") return v;
  }
  return "";
}

function mapUserToForm(u = {}) {
  const p = u.persona || u.profile || {};
  return {
    nombreCompleto: firstNonEmpty(u.nombreCompleto, u.name, p.nombreCompleto, [p.nombres, p.apellidos].filter(Boolean).join(" ")),
    tipoDni: firstNonEmpty(u.tipoDni, p.tipoDni, "Identidad"),
    dni: firstNonEmpty(u.dni, p.dni),
    estadoCivil: firstNonEmpty(u.estadoCivil, p.estadoCivil),
    fechaNacimiento: (firstNonEmpty(u.fechaNacimiento, p.fechaNacimiento) || "").toString().slice(0, 10),
    paisNacimiento: firstNonEmpty(u.paisNacimiento, p.paisNacimiento),
    ciudadNacimiento: firstNonEmpty(u.ciudadNacimiento, p.ciudadNacimiento),
    municipioNacimiento: firstNonEmpty(u.municipioNacimiento, p.municipioNacimiento),
    correoPersona: firstNonEmpty(u.correoPersona, u.email, p.correoPersona),
    profesion: firstNonEmpty(u.profesion, p.profesion),
    lugarTrabajo: firstNonEmpty(u.lugarTrabajo, p.lugarTrabajo),
    telefono: firstNonEmpty(u.telefono, p.telefono, u.phone),
    domicilio: firstNonEmpty(u.domicilio, p.domicilio),
    roles: Array.isArray(u.roles) ? u.roles : Array.isArray(u.role) ? u.role : [],
    active: u.active !== false,
  };
}
/* =================================================== */

export default function UsersPage() {
  const [items, setItems] = useState([]);
  const [q, setQ] = useState("");
  const [onlyActive, setOnlyActive] = useState(true);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState("");

  // Visibilidad de filas
  const STEP = 10;
  const [visibleCount, setVisibleCount] = useState(STEP);

  // formulario
  const empty = {
    nombreCompleto: "",
    tipoDni: "Identidad",
    dni: "",
    estadoCivil: "",
    fechaNacimiento: "",
    paisNacimiento: "",
    ciudadNacimiento: "",
    municipioNacimiento: "",
    correoPersona: "",
    profesion: "",
    lugarTrabajo: "",
    telefono: "",
    domicilio: "",
    roles: [],
    active: true,
  };
  const [form, setForm] = useState(empty);
  const [editing, setEditing] = useState(null); // _id

  const [creds, setCreds] = useState({ password: "", confirm: "", sendVerification: false });
  const [showPwd, setShowPwd] = useState(false);

  const pwdR = passwordRules(creds.password);
  const match = creds.password && creds.confirm && creds.password === creds.confirm;
  const showPwdRules = creds.password && creds.password.length > 0;

  const firstFieldRef = useRef(null);
  const [submitting, setSubmitting] = useState(false);

  async function load() {
    try {
      setLoading(true);
      setErr("");
      const res = await iamApi.listUsers("");
      setItems(res.items || []);
    } catch (e) {
      setErr(e?.message || "Error al cargar usuarios");
    } finally {
      setLoading(false);
    }
  }
  useEffect(() => {
    load();
  }, []);

  const filteredAll = useMemo(() => {
    const t = q.trim().toLowerCase();
    let res = items;
    if (t) {
      res = res.filter(
        (u) =>
          (u.nombreCompleto || u.name || "").toLowerCase().includes(t) ||
          (u.correoPersona || "").toLowerCase().includes(t) ||
          (u.dni || "").toLowerCase().includes(t) ||
          String(u.id_persona || "").toLowerCase().includes(t)
      );
    }
    if (onlyActive) res = res.filter((u) => u.active !== false);
    return res;
  }, [items, q, onlyActive]);

  function setField(name, value) {
    setForm((prev) => ({ ...prev, [name]: value }));
  }

  function validate() {
    const e = {};
    if (!form.nombreCompleto) e.nombreCompleto = "Nombre completo requerido";
    if (!form.dni) e.dni = "Documento requerido";
    if (form.correoPersona && !/^\S+@\S+\.\S+$/.test(form.correoPersona)) e.correoPersona = "Correo inválido";
    if (form.telefono && !/^[\d\+\-\s]{7,20}$/.test(form.telefono)) e.telefono = "Teléfono inválido";

    const wantsPassword = !!(creds.password || creds.confirm || creds.sendVerification);
    if (wantsPassword) {
      const r = passwordRules(creds.password);
      if (!r.length || !r.upper || !r.lower || !r.digit)
        e.password = "Debe tener 8+ caracteres, mayúscula, minúscula y número.";
      if (!creds.password || !match) e.confirm = "La confirmación no coincide.";
      if (creds.sendVerification && !/^\S+@\S+\.\S+$/.test(form.correoPersona || ""))
        e.correoPersona = "Correo requerido/válido para enviar verificación.";
    }
    return e;
  }
  const [errors, setErrors] = useState({});

  async function triggerVerification(userId, email) {
    if (!/^\S+@\S+\.\S+$/.test(email || "")) throw new Error("Correo inválido para verificación");
    if (typeof iamApi.sendVerificationEmail === "function") {
      return await iamApi.sendVerificationEmail(userId, email);
    } else if (typeof iamApi.sendVerification === "function") {
      return await iamApi.sendVerification({ userId, email });
    } else {
      throw new Error("La API de verificación no está implementada en iamApi");
    }
  }

  async function handleSubmit(e) {
    e.preventDefault();
    const v = validate();
    setErrors(v);
    if (Object.keys(v).length) {
      const firstKey = Object.keys(v)[0];
      document.querySelector(`[name="${firstKey}"]`)?.focus?.();
      return;
    }

    try {
      setSubmitting(true);
      const payload = { ...form };
      if (creds.password) payload.password = creds.password;
      payload.sendVerification = !!creds.sendVerification;

      let res;
      let savedId = editing;

      if (editing) {
        res = await iamApi.updateUser(editing, payload);
        savedId = res?._id || res?.id || res?.userId || res?.data?._id || savedId;
        alert("Usuario actualizado correctamente");
      } else {
        res = await iamApi.createUser(payload);
        savedId = res?._id || res?.id || res?.userId || res?.data?._id || res?.data?.item?._id;
        alert("Usuario creado correctamente ✅");
      }

      if (creds.sendVerification) {
        try {
          if (!savedId) throw new Error("No se obtuvo el id del usuario guardado");
          await triggerVerification(savedId, form.correoPersona);
          alert("Se envió el correo de verificación a " + form.correoPersona);
        } catch (ev) {
          console.warn("[UsersPage] verificación no enviada:", ev);
          alert("⚠️ No se pudo enviar la verificación: " + (ev?.message || "revisa el backend"));
        }
      }

      setForm(empty);
      setEditing(null);
      setCreds({ password: "", confirm: "", sendVerification: false });
      await load();
    } catch (e) {
      alert("⚠️ Error al guardar: " + (e?.message || "Revisa la consola"));
      console.error("[UsersPage] submit error:", e);
    } finally {
      setSubmitting(false);
    }
  }

  async function toggleActive(u) {
    try {
      if (u.active === false) await iamApi.enableUser(u._id);
      else await iamApi.disableUser(u._id);
      await load();
    } catch (e) {
      alert(e?.message || "No se pudo cambiar el estado");
    }
  }

  /* ========= startEdit unificado y robusto ========= */
  async function startEdit(u) {
    console.log("[UsersPage] entrar a edición:", u);
    setEditing(u._id);
    setCreds({ password: "", confirm: "", sendVerification: false });

    window.scrollTo({ top: 0, behavior: "smooth" });
    setTimeout(() => firstFieldRef.current?.focus?.(), 120);

    try {
      setLoading(true);
      let full = u;

      if (typeof iamApi.getUser === "function") {
        const r = await iamApi.getUser(u._id);
        full = r?.item || r?.user || r || u;
      } else if (typeof iamApi.getUserById === "function") {
        const res = await iamApi.getUserById(u._id);
        full =
          res?.data?.item?.usuario ??
          res?.data?.item?.user ??
          res?.data?.item ??
          res?.data?.usuario ??
          res?.data?.user ??
          res?.data ??
          res?.usuario ??
          res?.user ??
          res ??
          u;
      }

      // Intenta el mapeo seguro; si falla, usa el alternativo
      try {
        setForm(mapUserToFormSafe(full));
      } catch {
        setForm(mapUserToForm(full));
      }
    } catch (e) {
      console.warn("[UsersPage] no se pudo obtener detalle; usando item de lista:", e);
      try {
        setForm(mapUserToFormSafe(u));
      } catch {
        setForm(mapUserToForm(u));
      }
    } finally {
      setLoading(false);
      setTimeout(() => firstFieldRef.current?.focus?.(), 120);
    }
  }
  /* ================================================ */

  function cancelEdit() {
    setEditing(null);
    setForm(empty);
    setCreds({ password: "", confirm: "", sendVerification: false });
    setErrors({});
  }

  async function handleDelete(u) {
    const nombre = u?.nombreCompleto || u?.name || "este usuario";
    const ok = window.confirm(`¿Seguro que deseas eliminar a ${nombre}? Esta acción no se puede deshacer.`);
    if (!ok) return;
    const prev = items;
    setItems((curr) => curr.filter((x) => x._id !== u._id));
    try {
      await iamApi.deleteUser(u._id);
      if (editing === u._id) cancelEdit();
      alert("Usuario eliminado correctamente.");
    } catch (e) {
      setItems(prev);
      alert(e?.message || "No se pudo eliminar el usuario");
    }
  }

  return (
    <div className="space-y-6">
      {Object.keys(errors).length > 0 && (
        <div className="rounded-md border border-amber-400 bg-amber-50 text-amber-800 dark:border-amber-600 dark:bg-amber-900/20 dark:text-amber-200 px-3 py-2">
          Revisa los campos marcados en rojo.
        </div>
      )}

      {editing && (
        <div className="flex items-center justify-between rounded-md border border-sky-400 bg-sky-50 text-sky-900 dark:border-sky-700 dark:bg-sky-900/20 dark:text-sky-200 px-3 py-2">
          <div className="text-sm">
            <span className="font-semibold">Editando usuario</span>
            {form?.nombreCompleto ? `: ${form.nombreCompleto}` : ""} {form?.id_persona ? `(ID: ${form.id_persona})` : ""}
          </div>
          <button type="button" onClick={cancelEdit} className="px-3 py-1 rounded border border-sky-300 dark:border-sky-600">
            Salir del modo edición
          </button>
        </div>
      )}

      {/* Formulario */}
      <form onSubmit={handleSubmit} className="rounded-lg border border-neutral-200 dark:border-neutral-700 p-4 bg-white dark:bg-neutral-900 space-y-3">
        <h3 className="font-semibold text-lg">{editing ? "Editar usuario" : "Crear usuario"}</h3>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <Field label="Nombre completo" name="nombreCompleto" value={form.nombreCompleto ?? ""} onChange={setField} error={errors.nombreCompleto} required inputRef={firstFieldRef} />

          <div className="md:col-span-2">
            <span className="text-sm">Documento</span>
            <div className="flex gap-2 mt-1">
              <select
                className="px-3 py-2 rounded border border-neutral-300 dark:border-neutral-600 bg-white dark:bg-neutral-800"
                value={form.tipoDni ?? "Identidad"}
                onChange={(e) => setField("tipoDni", e.target.value)}
              >
                <option>Identidad</option>
                <option>Pasaporte</option>
              </select>
              <input
                name="dni"
                className="flex-1 px-3 py-2 rounded border border-neutral-300 dark:border-neutral-600 bg-white dark:bg-neutral-800"
                value={form.dni ?? ""}
                onChange={(e) => setField("dni", e.target.value)}
                placeholder="0801-0000-00000"
                required
              />
            </div>
            {errors.dni && <p className="text-red-500 text-sm mt-1">{errors.dni}</p>}
          </div>

          <Select label="Estado civil" name="estadoCivil" value={form.estadoCivil ?? ""} onChange={setField} options={ESTADOS_CIVILES} />
          <Field type="date" label="Fecha de nacimiento" name="fechaNacimiento" value={form.fechaNacimiento ?? ""} onChange={setField} />

          <Field label="País nacimiento" name="paisNacimiento" value={form.paisNacimiento ?? ""} onChange={setField} />
          <Field label="Ciudad nacimiento" name="ciudadNacimiento" value={form.ciudadNacimiento ?? ""} onChange={setField} />
          <Field label="Municipio" name="municipioNacimiento" value={form.municipioNacimiento ?? ""} onChange={setField} />

          {/* 🔀 El correo electrónico ahora vive en "Credenciales de acceso" */}
          <Field label="Profesión u oficio" name="profesion" value={form.profesion ?? ""} onChange={setField} />
          <Field label="Lugar de trabajo" name="lugarTrabajo" value={form.lugarTrabajo ?? ""} onChange={setField} />
          <Field label="Teléfono" name="telefono" value={form.telefono ?? ""} onChange={setField} />
          <Field className="md:col-span-2" label="Domicilio actual" name="domicilio" value={form.domicilio ?? ""} onChange={setField} />

          <label className="space-y-1 md:col-span-2">
            <span className="text-sm">Rol del usuario</span>
            <RoleSelect value={form.roles} onChange={(rolesDb) => setField("roles", rolesDb)} />
          </label>
        </div>

        <section className="mt-3 space-y-2">
          <h4 className="font-semibold">Credenciales de acceso</h4>

          {/* Correo electrónico */}
          <label className="space-y-1">
            <span className="text-sm">Correo electrónico</span>
            <input
              name="correoPersona"
              type="email"
              className="w-full px-3 py-2 rounded border border-neutral-300 dark:border-neutral-600 bg-white dark:bg-neutral-800"
              value={form.correoPersona ?? ""}
              onChange={(e) => setField("correoPersona", e.target.value)}
              placeholder="usuario@dominio.com"
            />
            {errors.correoPersona && <span className="text-xs text-red-500">{errors.correoPersona}</span>}
          </label>

          <label className="space-y-1">
            <span className="text-sm">Contraseña</span>
            <div className="relative">
              <input
                type={showPwd ? "text" : "password"}
                className="w-full px-3 py-2 pr-24 rounded border border-neutral-300 dark:border-neutral-600 bg-white dark:bg-neutral-800"
                value={creds.password}
                onChange={(e) => setCreds((c) => ({ ...c, password: e.target.value }))}
                placeholder="••••••••"
              />
              <button
                type="button"
                onClick={() => setShowPwd((s) => !s)}
                className="absolute right-2 top-1/2 -translate-y-1/2 text-sm px-2 py-1 rounded bg-neutral-200 dark:bg-neutral-700"
              >
                {showPwd ? "Ocultar" : "Mostrar"}
              </button>
            </div>
            {errors.password && <span className="text-xs text-red-500">{errors.password}</span>}
            {showPwdRules && (
              <ul className="text-xs opacity-80 mt-1 grid grid-cols-2 gap-x-4">
                <li>{pwdR.length ? "✅" : "❌"} Mínimo 8 caracteres</li>
                <li>{pwdR.upper ? "✅" : "❌"} Una mayúscula</li>
                <li>{pwdR.lower ? "✅" : "❌"} Una minúscula</li>
                <li>{pwdR.digit ? "✅" : "❌"} Un número</li>
              </ul>
            )}
          </label>

          <label className="space-y-1">
            <span className="text-sm">Confirmar contraseña</span>
            <input
              type={showPwd ? "text" : "password"}
              className="w-full px-3 py-2 rounded border border-neutral-300 dark:border-neutral-600 bg-white dark:bg-neutral-800"
              value={creds.confirm}
              onChange={(e) => setCreds((c) => ({ ...c, confirm: e.target.value }))}
              placeholder="••••••••"
            />
            {errors.confirm && <span className="text-xs text-red-500">{errors.confirm}</span>}
            {!errors.confirm && creds.confirm && !match && <span className="text-xs text-red-500">No coincide con la contraseña.</span>}
          </label>

          <label className="flex items-center gap-2">
            <input
              type="checkbox"
              checked={!!creds.sendVerification}
              onChange={async (e) => {
                const checked = e.target.checked;
                setCreds((c) => ({ ...c, sendVerification: checked }));
                if (checked && editing && /^\S+@\S+\.\S+$/.test(form.correoPersona || "")) {
                  try {
                    setSubmitting(true);
                    await triggerVerification(editing, form.correoPersona);
                    alert("Se envió el correo de verificación a " + form.correoPersona);
                  } catch (ev) {
                    console.warn("[UsersPage] verificación inmediata falló:", ev);
                    alert("⚠️ No se pudo enviar verificación ahora: " + (ev?.message || "se enviará al guardar"));
                  } finally {
                    setSubmitting(false);
                  }
                }
              }}
            />
            <span>Enviar correo de verificación</span>
          </label>
        </section>

        <div className="flex items-center justify-between flex-wrap gap-3">
          <label className="flex items-center gap-2">
            <input type="checkbox" checked={!!form.active} onChange={(e) => setField("active", e.target.checked)} />
            <span>Activo</span>
          </label>

          <div className="flex gap-2">
            {editing && (
              <button
                type="button"
                onClick={cancelEdit}
                className="px-3 py-2 rounded border border-neutral-300 dark:border-neutral-600"
              >
                Cancelar
              </button>
            )}
            <button
              type="submit"
              disabled={submitting}
              className={`px-4 py-2 rounded ${
                submitting ? "opacity-60 cursor-not-allowed" : "bg-black text-white dark:bg-white dark:text-black"
              }`}
            >
              {submitting ? (editing ? "Guardando..." : "Creando...") : editing ? "Guardar cambios" : "Crear"}
            </button>
          </div>
        </div>
      </form>

      {/* Lista de usuarios */}
      <div className="rounded-lg border border-neutral-200 dark:border-neutral-700 overflow-hidden">
        {/* Cabecera + botones ➖/➕ junto a “Acciones” */}
        <div className="grid grid-cols-12 gap-2 bg-neutral-100 dark:bg-neutral-800 px-3 py-2 font-semibold text-sm">
          <div className="col-span-4">Usuario</div>
          <div className="col-span-4">Roles</div>
          <div className="col-span-2">Estado</div>
          <div className="col-span-2 flex items-center justify-end gap-2">
            <span>Acciones</span>

            <button
              type="button"
              onClick={() => setVisibleCount((c) => Math.max(STEP, c - STEP))}
              disabled={visibleCount <= STEP}
              title="Ver menos"
              className="h-7 w-7 rounded border border-neutral-300 dark:border-neutral-600 disabled:opacity-40"
            >
              –
            </button>

            <button
              type="button"
              onClick={() => setVisibleCount((c) => Math.min(filteredAll.length, c + STEP))}
              disabled={visibleCount >= filteredAll.length}
              title="Ver más"
              className="h-7 w-7 rounded border border-neutral-300 dark:border-neutral-600 disabled:opacity-40"
            >
              +
            </button>

            <span className="opacity-70 text-xs">
              {Math.min(visibleCount, filteredAll.length)}/{filteredAll.length}
            </span>
          </div>
        </div>

        {loading ? (
          <div className="p-4">Cargando…</div>
        ) : err ? (
          <div className="p-4 text-red-600">{err}</div>
        ) : filteredAll.length === 0 ? (
          <div className="p-4 text-neutral-500">Sin usuarios.</div>
        ) : (
          filteredAll.slice(0, visibleCount).map((u) => (
            <div key={u._id} className="grid grid-cols-12 gap-2 px-3 py-3 border-t border-neutral-200 dark:border-neutral-700">
              <div className="col-span-4">
                <div className="font-medium">{u.nombreCompleto || u.name || "—"}</div>
                {u.id_persona != null && (
                  <div className="mt-1">
                    <span className="text-[11px] px-2 py-0.5 rounded bg-neutral-200 text-neutral-700 dark:bg-neutral-700 dark:text-neutral-100">
                      ID: {u.id_persona}
                    </span>
                  </div>
                )}
                <div className="text-sm text-neutral-500 mt-1">{u.correoPersona || "—"}</div>
                {u.dni && <div className="text-xs text-neutral-500">DNI: {u.dni}</div>}
              </div>

              <div className="col-span-4">
                <RoleBadges roles={u.roles} />
              </div>

              <div className="col-span-2">
                {u.active === false ? (
                  <span className="text-xs px-2 py-1 rounded bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-200">
                    Inactivo
                  </span>
                ) : (
                  <span className="text-xs px-2 py-1 rounded bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-200">
                    Activo
                  </span>
                )}
              </div>

              {/* Acciones */}
              <div className="col-span-2 flex items-center justify-end gap-2">
                {/* Editar */}
                <button
                  onClick={() => startEdit(u)}
                  title="Editar"
                  aria-label="Editar"
                  className="p-2 rounded-full bg-sky-500 hover:bg-sky-600 text-white shadow transition-colors"
                >
                  <Edit3 size={18} />
                </button>

                {/* Activar/Desactivar */}
                <button
                  onClick={() => toggleActive(u)}
                  title={u.active === false ? "Activar" : "Desactivar"}
                  aria-label={u.active === false ? "Activar" : "Desactivar"}
                  className={`p-2 rounded-full text-white shadow transition-colors ${
                    u.active === false ? "bg-emerald-600 hover:bg-emerald-700" : "bg-neutral-500 hover:bg-neutral-600"
                  }`}
                >
                  ⏻
                </button>

                {/* Eliminar */}
                <button
                  onClick={() => handleDelete(u)}
                  className="p-2 rounded-full bg-red-600 hover:bg-red-700 text-white shadow transition-colors"
                  title="Eliminar usuario"
                  aria-label="Eliminar usuario"
                >
                  <Trash2 size={18} />
                </button>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}

/** Field: acepta 'required' y 'inputRef' para foco controlado */
function Field({ label, name, value, onChange, type = "text", className = "", error, placeholder, required = false, inputRef }) {
  return (
    <label className={`space-y-1 ${className}`}>
      <span className="text-sm">{label}</span>
      <input
        ref={inputRef}
        name={name}
        type={type}
        className="w-full px-3 py-2 rounded border border-neutral-300 dark:border-neutral-600 bg-white dark:bg-neutral-800"
        value={value ?? ""}
        placeholder={placeholder}
        onChange={(e) => onChange(name, e.target.value)}
        required={required}
      />
      {error && <span className="text-xs text-red-500">{error}</span>}
    </label>
  );
}

function Select({ label, name, value, onChange, options = [] }) {
  return (
    <label className="space-y-1">
      <span className="text-sm">{label}</span>
      <select
        name={name}
        className="w-full px-3 py-2 rounded border border-neutral-300 dark:border-neutral-600 bg-white dark:bg-neutral-800"
        value={value ?? ""}
        onChange={(e) => onChange(name, e.target.value)}
      >
        <option value="">Seleccionar</option>
        {options.map((o) => (
          <option key={o} value={o}>
            {o}
          </option>
        ))}
      </select>
    </label>
  );
}
