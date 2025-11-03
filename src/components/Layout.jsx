// src/components/Layout.jsx
import { Link, NavLink, useLocation, useNavigate } from "react-router-dom";
import { isAuthed, readProfile, lsGetRequests } from "../api";
import Notifier from "./Notifier";
import { useEffect, useMemo, useState } from "react";
// Proveedor de toasts se aplica a nivel raíz (main.jsx)

export default function Layout({ authed, onLogout, children }) {
  const logged = authed || isAuthed();
  const { pathname } = useLocation();
  const navigate = useNavigate();
  
  // Páginas con fondo oscuro propio (prefijos incluidos)
  const darkRoots = ["/", "/login", "/register", "/home", "/requests", "/onboarding", "/profile", "/services", "/service", "/chat"];
  const isDarkPage = darkRoots.some((p) => pathname === p || pathname.startsWith(p + "/"));

  const profile = readProfile?.();
  const role = profile?.role || "";
  const isClient = role === "client";
  const isProvider = role === "provider";

  // (opcional) refresco de conteo de requests si cambian en otra pestaña
  const [requestsCount, setRequestsCount] = useState(0);
  useEffect(() => { (async () => { try {
    const list = await lsGetRequests();
    setRequestsCount(Array.isArray(list) ? list.length : 0);
  } catch { setRequestsCount(0); } })(); }, [pathname]);

  /* ---- helpers ---- */
  function initials(name = "") {
    return name
      .trim()
      .split(/\s+/)
      .slice(0, 2)
      .map((p) => p[0]?.toUpperCase())
      .join("") || "U";
  }

  function RolePill() {
    const photo = profile?.photoURL || "";
    const name = profile?.displayName || profile?.username || "Usuario";
    if (!logged) return null;

    const map = { client: "Cliente", provider: "Proveedor" };
    const label = map[role] || "Sin rol";
    const styles =
      isClient
        ? "border-emerald-300/50 bg-emerald-50/70 text-emerald-800"
        : isProvider
        ? "border-sky-300/60 bg-sky-50/80 text-sky-800"
        : "border-slate-300 bg-slate-50 text-slate-700";

    return (
      <Link
        to="/profile"
        className={`hidden sm:inline-flex items-center gap-2 rounded-full border px-2.5 py-0.5 text-xs font-semibold ${styles}`}
        title="Ver perfil"
      >
        {photo ? (
          <img src={photo} alt={name} className="h-6 w-6 rounded-full object-cover ring-1 ring-black/5" />
        ) : (
          <div className="grid h-6 w-6 place-items-center rounded-full bg-white/70 text-[10px] font-bold text-slate-700 ring-1 ring-black/5">
            {initials(name)}
          </div>
        )}
        <span className="whitespace-nowrap">{label}</span>
      </Link>
    );
  }

  // Clases de NavLink activo
  const navClass = ({ isActive }) =>
    [
      "px-3 py-1.5 rounded-lg text-sm font-semibold transition",
      isActive ? "bg-indigo-50 text-indigo-700" : "text-slate-700 hover:bg-slate-100",
    ].join(" ");

  return (
    <div className="min-h-screen text-slate-900">
        <Notifier />
        {/* Navbar */}
        <header className="fixed inset-x-0 top-0 z-50 border-b border-slate-200 bg-white/95 backdrop-blur supports-[backdrop-filter]:bg-white/80">
          <nav className="mx-auto flex h-16 max-w-6xl items-center gap-6 px-4">
            {/* Branding */}
            <Link
              to="/"
              className="text-3xl font-extrabold tracking-tight bg-gradient-to-r from-blue-600 via-indigo-600 to-sky-500 bg-clip-text text-transparent"
            >
              Fixly
            </Link>

            {/* Navegación izquierda */}
            <div className="flex items-center gap-1">
              <NavLink to="/home" className={navClass}>Home</NavLink>
              {/* Navegación izquierda (dentro del bloque ya existente) */}
{logged && isProvider && (
  <>
    <NavLink to="/services" className={navClass}>Mis servicios</NavLink>
    <NavLink to="/services/new" className={navClass}>Publicar servicio</NavLink>
  </>
)}
{logged && isClient && (
  <NavLink to="/services/explore" className={navClass}>
    Explorar servicios
  </NavLink>
)}


              {logged && isClient && requestsCount > 0 && (
                <NavLink to="/requests" className={navClass}>Mis solicitudes</NavLink>
              )}
              {logged && isProvider && (
                <NavLink to="/requests" className={navClass}>Solicitudes</NavLink>
                
              )}
              {logged && !isClient && !isProvider && (
                <NavLink to="/onboarding" className={navClass}>Onboarding</NavLink>
              )}

              {/* NUEVO: Ajustar/Configurar perfil */}
              {logged && (
                <NavLink to="/profile" className={navClass}>
                  {isClient ? "Ajustar perfil" : "Configurar perfil"}
                </NavLink>
              )}
            </div>

            {/* separador flexible */}
            <div className="flex-1" />

            {/* Píldora de rol con avatar */}
            <RolePill />

            {/* Acciones derechas */}
            <div className="flex items-center gap-2">
              {logged ? (
                <button
                  onClick={() => {
                    onLogout?.();
                    navigate("/login", { replace: true });
                  }}
                  className="px-3 py-1.5 rounded-lg text-slate-700 hover:bg-slate-100"
                >
                  Cerrar sesión
                </button>
              ) : (
                <NavLink to="/login" className={navClass}>Iniciar sesión</NavLink>
              )}
            </div>
          </nav>
        </header>

        {/* Contenido */}
        <main className={isDarkPage ? "pt-20 bg-transparent" : "bg-slate-50 pt-20"}>
          <div className={isDarkPage ? "" : "mx-auto max-w-6xl px-4 py-10"}>{children}</div>
        </main>

        {/* Footer */}
        <footer className="relative mt-10">
          <div className="absolute -top-6 left-0 w-full overflow-hidden leading-[0]">
            <svg viewBox="0 0 1440 120" preserveAspectRatio="none" className="h-12 w-full rotate-180 -mb-px">
              <path d="M0,64 C240,128 480,0 720,16 C960,32 1200,112 1440,64 L1440,0 L0,0 Z" fill="url(#footerGradient)" />
              <defs>
                <linearGradient id="footerGradient" x1="0%" y1="0%" x2="100%" y2="0%">
                  <stop offset="0%" stopColor="#312e81" />
                  <stop offset="50%" stopColor="#3730a3" />
                  <stop offset="100%" stopColor="#1e3a8a" />
                </linearGradient>
              </defs>
            </svg>
          </div>
          <div className="bg-gradient-to-r from-indigo-900 via-indigo-800 to-blue-900">
            <div className="mx-auto max-w-6xl px-4 py-8 text-center text-sm text-white">
              Hecho con amor <span className="align-middle">❤️</span>
            </div>
          </div>
        </footer>
      </div>
    );
}
