// client/src/components/ProtectedRoute.jsx
import React from "react";
import { useAuth0, withAuthenticationRequired } from "@auth0/auth0-react";
import { useLocation } from "react-router-dom";

// Con esto se simplifican todo lo que tenian para las rutas protegidas
const ProtectedRoute = ({ children }) => {
  return children;
};

export default withAuthenticationRequired(ProtectedRoute, {
  onRedirecting: () => <div>Cargando...</div>,
});
