import React from "react";
import ReactDOM from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import { Auth0Provider } from "@auth0/auth0-react";

import App from "./App.jsx";
import AuthBridge from "./components/AuthBridge.jsx";
import "./styles.css";

const domain   = import.meta.env.VITE_AUTH0_DOMAIN;
const clientId = import.meta.env.VITE_AUTH0_CLIENT_ID;
const audience = import.meta.env.VITE_AUTH0_AUDIENCE;

if (!domain || !clientId) {
  console.error("Faltan VITE_AUTH0_DOMAIN o VITE_AUTH0_CLIENT_ID en client/.env", {
    domain, clientId, audience
  });
}

ReactDOM.createRoot(document.getElementById("root")).render(
  <Auth0Provider
    domain={domain}
    clientId={clientId}
    authorizationParams={{
      redirect_uri: window.location.origin,
      //audience,
      scope: "openid profile email offline_access",
    }}
    cacheLocation="localstorage"
    useRefreshTokens
  >
    {/* Configura providers de token para tus APIs */}
    <AuthBridge />

    <BrowserRouter>
      <App />
    </BrowserRouter>
  </Auth0Provider>
);
