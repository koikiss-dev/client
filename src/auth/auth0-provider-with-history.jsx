import React from "react";
import { useNavigate } from "react-router-dom";
import { Auth0Provider } from "@auth0/auth0-react";

const Auth0ProviderWithHistory = ({ children }) => {
  const navigate = useNavigate();
  const domain = import.meta.env.VITE_AUTH0_DOMAIN;
  const clientId = import.meta.env.VITE_AUTH0_CLIENT_ID;
  const audience = import.meta.env.VITE_AUTH0_AUDIENCE;

  /* const onRedirectCallback = (appState) => {
    navigate(appState?.returnTo || "/"); // ✅ evita bucle en /login
  };

  // ⚠️ No bloquees si falta audience
  if (!(domain && clientId)) {
    return <div>Configurando Auth0...</div>;
  } */

  return (
    <Auth0Provider
      domain={domain}
      clientId={clientId}
      authorizationParams={{
        redirect_uri: window.location.origin, // vuelve al inicio tras login
        ...(audience ? { audience } : {}),    // solo si existe
        scope: "openid profile email offline_access",
      }}
      onRedirectCallback={onRedirectCallback}
      cacheLocation="localstorage"
      useRefreshTokens={true}
    >
      {children}
    </Auth0Provider>
  );
};

export default Auth0ProviderWithHistory;
