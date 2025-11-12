import React from "react";
import { useLocation, useNavigate } from "react-router-dom";
import Sidebar from "./Sidebar.jsx";
import Topbar from "./Topbar.jsx";
import ChatDock from "./ChatDock.jsx";
import Footer from "./Footer.jsx";
import { useLayoutUI } from "./layout-ui.jsx";

// 👇 NUEVO: escucha global de alertas
import GlobalPanicListener from "./GlobalPanicListener.jsx";

export default function Layout({ children }) {
  const [mobileOpen, setMobileOpen] = React.useState(false);
  const { pathname } = useLocation();
  const navigate = useNavigate();

  // Estado global opcional del layout (si no hay provider, devuelve dummies)
  const { hideSidebar, back } = useLayoutUI();

  // Sidebar sólo en el home, a menos que algún módulo lo oculte
  const showSidebar = pathname === "/" && !hideSidebar;

  // Mostrar botón "Regresar" en cualquier ruta que no sea "/"
  // o si un módulo definió un back custom.
  const showBack = pathname !== "/" || !!back;

  // Back inteligente: usa el custom si existe; si no, evita el bucle /login
  const smartBack = React.useCallback(() => {
    if (back?.onClick) {
      back.onClick();
      return;
    }
    const ref = document.referrer || "";
    const cameFromLogin = ref.includes("/login");
    const shallowHistory = window.history.length <= 2;
    if (cameFromLogin || shallowHistory) {
      navigate("/", { replace: true });
    } else {
      navigate(-1);
    }
  }, [back, navigate]);

  // Objeto back que pasamos al Topbar (con label y handler)
  const backProp = React.useMemo(
    () => ({
      label: back?.label || "Regresar",
      onClick: smartBack,
    }),
    [back?.label, smartBack]
  );

  React.useEffect(() => {
    const onKey = (e) => e.key === "Escape" && setMobileOpen(false);
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  return (
    <div className="min-h-[100svh] bg-white dark:bg-neutral-950 text-neutral-900 dark:text-neutral-100">
      {/* 👇 AQUÍ: esto vive en todo el layout, por lo tanto en toda la app */}
      <GlobalPanicListener />

      {/* Fondo global */}
      <div className="app-bg pointer-events-none" aria-hidden />

      {/* Topbar fijo */}
      <header className="sticky top-0 z-40 h-14 bg-white/80 dark:bg-neutral-950/80 backdrop-blur border-b border-neutral-200 dark:border-neutral-800">
        <Topbar
          onToggleMenu={() => setMobileOpen(true)}
          showBack={showBack}
          back={backProp}
        />
      </header>

      {/* Carril fijo del sidebar (md+) solo en home */}
      {showSidebar && (
        <aside
          role="complementary"
          aria-label="Barra lateral fija"
          className="
            hidden md:block fixed left-0 top-14 bottom-0 w-64 z-40
            bg-white dark:bg-neutral-950 border-r border-white/10
            overflow-hidden
          "
        >
          <Sidebar />
        </aside>
      )}

      {/* Columna principal */}
      <div
        className={[
          "relative z-10",
          showSidebar ? "md:pl-64" : "",
          "min-h-[calc(100vh-3.5rem)] flex flex-col",
        ].join(" ")}
      >
        <main id="app-main" className="flex-1">
          <div
            className={`${
              showSidebar ? "max-w-7xl" : "max-w-[1600px]"
            } w-full mx-auto px-4 md:px-6 py-6 space-y-6`}
          >
            {children}
          </div>
        </main>

        <Footer />
      </div>

      {/* Drawer móvil para el sidebar */}
      <div
        className={`fixed inset-0 z-50 md:hidden transition-opacity ${
          mobileOpen
            ? "opacity-100 pointer-events-auto"
            : "opacity-0 pointer-events-none"
        }`}
        aria-hidden={!mobileOpen}
      >
        <div
          className="absolute inset-0 bg-black/40"
          onClick={() => setMobileOpen(false)}
        />
        <div
          role="dialog"
          aria-modal="true"
          className={`absolute inset-y-0 left-0 w-72 max-w-[85vw]
            bg-white dark:bg-neutral-950 border-r border-neutral-200 dark:border-neutral-800
            shadow-xl transition-transform duration-300
            ${mobileOpen ? "translate-x-0" : "-translate-x-full"}`}
        >
          <Sidebar variant="mobile" onNavigate={() => setMobileOpen(false)} />
        </div>
      </div>

      {/* Burbuja de chat flotante */}
      <ChatDock />
    </div>
  );
}
