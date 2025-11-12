// client/src/lib/api.js
import axios from "axios";

// Base URL SIN "/api" (el código de cada módulo añade /api en sus rutas)
const API_ROOT = (import.meta.env.VITE_API_BASE_URL || "http://localhost:4000").replace(/\/$/, "");

// Prefijo común de API, útil para módulos que usan fetch
export const API = `${API_ROOT}/api`;

const api = axios.create({
  baseURL: API_ROOT, // mantenemos para compatibilidad
  withCredentials: true,
});

// Guardamos un proveedor de token (Auth0 u otro)
let tokenProvider = null;

/** Conecta tu proveedor de tokens (Auth0) */
export function attachAuth0(provider) {
  tokenProvider = typeof provider === "function" ? provider : null;
}

/** Alias de compatibilidad */
export function setAuthToken(provider) {
  tokenProvider = typeof provider === "function" ? provider : null;
}

// Interceptor: agrega Authorization si hay token
api.interceptors.request.use(async (config) => {
  if (tokenProvider) {
    try {
      const token = await tokenProvider();
      if (token) config.headers.Authorization = `Bearer ${token}`;
    } catch {
      // silencioso
    }
  }
  return config;
});

export default api;
// 👇 también exporto como named para que no fallen imports antiguos
export { api };
