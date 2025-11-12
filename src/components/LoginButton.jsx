import React from "react";
import { useAuth0 } from "@auth0/auth0-react";

export default function LoginButton({
  label = "Iniciar sesión",
  className = "px-4 py-2 bg-blue-600 text-white rounded-xl shadow hover:brightness-110 active:scale-[.98]",
}) {
  const { loginWithRedirect, isLoading } = useAuth0();
  const audience = import.meta.env.VITE_AUTH0_AUDIENCE; // opcional

  const handleLogin = async () => {
    if (isLoading) return;
    const opts = {
      scope: "openid profile email offline_access",
      appState: { returnTo: window.location.pathname + window.location.search },
    };
    if (audience) {
      opts.authorizationParams = { audience };
    }
    await loginWithRedirect(opts);
  };

  return (
    <button disabled={isLoading} onClick={handleLogin} className={className}>
      {label}
    </button>
  );
}
