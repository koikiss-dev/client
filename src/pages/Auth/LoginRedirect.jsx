// client/src/pages/Auth/LoginRedirect.jsx
import React, { useEffect, useRef } from "react";
import { useAuth0 } from "@auth0/auth0-react";
import { useNavigate, useLocation } from "react-router-dom";

export default function LoginRedirect() {
  const { loginWithRedirect, isAuthenticated, isLoading } = useAuth0();
  const nav = useNavigate();
  const { state } = useLocation(); // opcional: { returnTo: "/ruta" }
  const calledRef = useRef(false);

  useEffect(() => {
    if (isLoading) return;

    if (isAuthenticated) {
      nav(state?.returnTo || "/", { replace: true });
      return;
    }

    if (!calledRef.current) {
      calledRef.current = true;
      const options = {
        // Si quieres enviar algo de estado para “volver a…”
        appState: { returnTo: state?.returnTo || "/" },
        // Si DEFINITIVAMENTE necesitas audiencia, úsala. Si no, omítela.
        // authorizationParams: { audience: import.meta.env.VITE_AUTH0_AUDIENCE },
      };
      loginWithRedirect(options).catch((err) =>
        console.error("Error en loginWithRedirect:", err)
      );
    }
  }, [isAuthenticated, isLoading, loginWithRedirect, nav, state]);

  return (
    <div className="min-h-[60vh] grid place-items-center p-6">
      <div className="text-center">
        <div className="text-lg font-semibold mb-2">Redirigiendo al inicio de sesión…</div>
        <div className="opacity-70">Si no sucede nada, recarga la página.</div>
      </div>
    </div>
  );
}
