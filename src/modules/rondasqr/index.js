import React, { Suspense, lazy } from "react";
import { Routes, Route, Navigate } from "react-router-dom";

// Guard / Panel unificado
const ScanPage = lazy(() => import("./guard/ScanPage.jsx"));
// Reportes (supervisor)
const ReportsPage = lazy(() => import("./supervisor/ReportsPage.jsx"));
// Admin
const AdminHub = lazy(() => import("./admin/AdminHub.jsx"));
const CreateRoundsPage = lazy(() => import("./admin/CreateRoundsPage.jsx"));
const EditRoundsPage = lazy(() => import("./admin/EditRoundsPage.jsx"));
const LoadRoundsPage = lazy(() => import("./admin/LoadRoundsPage.jsx"));

function RondasqrModule() {
  return (
    <Suspense fallback={null}>
      <Routes>
        {/* /rondasqr → /rondasqr/scan */}
        <Route index element={<Navigate to="scan" replace />} />

        {/* Panel del guardia (todas las subrutas: /scan, /scan/qr, /scan/msg, /scan/fotos, etc.) */}
        <Route path="scan/*" element={<ScanPage />} />

        {/* Reportes */}
        <Route path="reports" element={<ReportsPage />} />

        {/* Admin */}
        <Route path="admin" element={<AdminHub />} />
        <Route path="admin/create" element={<CreateRoundsPage />} />
        <Route path="admin/edit" element={<EditRoundsPage />} />
        <Route path="admin/load" element={<LoadRoundsPage />} />

        {/* Catch-all del módulo */}
        <Route path="*" element={<Navigate to="scan" replace />} />
      </Routes>
    </Suspense>
  );
}

// Export default y nombrado (para que importes de cualquiera de las dos formas)
export default RondasqrModule;
export { RondasqrModule };

// Redirecciones legacy opcionales
export const rondasqrLegacyRoutes = [
  { path: "/rondasqrpanel",  element: <Navigate to="/rondasqr/scan" replace /> },
  { path: "/rondasqr/panel", element: <Navigate to="/rondasqr/scan" replace /> },
];
