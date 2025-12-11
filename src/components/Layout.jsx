// src/components/Layout.jsx
import { Link, NavLink, useLocation, useNavigate } from "react-router-dom";
import { isAuthed, readProfile, lsGetRequests } from "../api";
import Notifier from "./Notifier";
import AssistantWidget from "./AssistantWidget";
import NotificationBell from "./NotificationBell";
import { useEffect, useMemo, useState } from "react";
// Proveedor de toasts se aplica a nivel raíz (main.jsx)

export default function Layout({ authed, onLogout, children }) {
  const logged = authed || isAuthed();
  const { pathname } = useLocation();
  const isLanding = pathname === "/";
  const navigate = useNavigate();
  
  // Páginas con fondo oscuro propio (prefijos incluidos)
  const darkRoots = ["/", "/login", "/register", "/home", "/requests", "/onboarding", "/profile", "/services", "/service", "/chat", "/forgot-password", "/reset-password"];
  const isDarkPage = darkRoots.some((p) => pathname === p || pathname.startsWith(p + "/"));

  const profile = readProfile?.();
  const role = profile?.role || "";
  const isClient = role === "client";
  const isProvider = role === "provider";

  // (opcional) refresco de conteo de requests si cambian en otra pestaÃ±a
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

  const [open, setOpen] = useState(false); // menú mobile

  return (
    <div className="min-h-screen text-slate-900">
        <Notifier intervalMs={5000} enabled={logged} />
        <AssistantWidget />
        {/* Navbar */}
        <header className="fixed inset-x-0 top-0 z-50 border-b border-slate-200 bg-white/95 backdrop-blur supports-[backdrop-filter]:bg-white/80">
          <nav className="mx-auto flex h-16 max-w-6xl items-center gap-4 px-4">
            {/* Branding */}
            <Link
              to="/"
              onClick={() => setOpen(false)}
              className="text-3xl font-extrabold tracking-tight bg-gradient-to-r from-blue-600 via-indigo-600 to-sky-500 bg-clip-text text-transparent"
            >
              Fixly
            </Link>
            {/* Navegación izquierda (desktop) */}
            <div className="hidden items-center gap-1 lg:flex">
              {logged && <NavLink to="/home" className={navClass}>Home</NavLink>}
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

              {/* Ajustar perfil */}
              {logged && (
                <NavLink to="/profile" className={navClass}>
                  {isClient ? "Ajustar perfil" : "Configurar perfil"}
                </NavLink>
              )}
            </div>

            {/* separador flexible */}
            <div className="flex-1" />

            {/* Píldora de rol con avatar */}
            <div className="hidden items-center gap-2 lg:flex">
              <RolePill />
              {logged && <NotificationBell />}

              {!logged && (
                <NavLink to="/register" className={navClass}>Registrarse</NavLink>
              )}
              {logged ? (
                <button
                  onClick={() => { onLogout?.(); navigate("/", { replace: true }); }}
                  className="px-3 py-1.5 rounded-lg text-slate-700 hover:bg-slate-100"
                >
                  Cerrar sesión
                </button>
              ) : (
                <NavLink to="/login" className={navClass}>Iniciar sesión</NavLink>
              )}
            </div>

            {/* Botón móvil (derecha) */}
            <button
              type="button"
              onClick={() => setOpen((o) => !o)}
              className="inline-flex h-10 w-10 flex-col items-center justify-center gap-1 rounded-lg border border-slate-200 bg-white text-slate-700 hover:bg-slate-50 lg:hidden"
              aria-label="Abrir menú"
            >
              <span className="block h-0.5 w-6 rounded-full bg-slate-700" />
              <span className="mt-1 block h-0.5 w-6 rounded-full bg-slate-700" />
              <span className="mt-1 block h-0.5 w-6 rounded-full bg-slate-700" />
            </button>
          </nav>

          {/* Menú móvil */}
          {open && (
            <div className="border-b border-slate-200 bg-white/95 px-4 pb-4 pt-2 shadow lg:hidden">
              <div className="grid gap-2">
                {logged && <NavLink to="/home" className={navClass} onClick={() => setOpen(false)}>Home</NavLink>}
                {logged && isProvider && (
                  <>
                    <NavLink to="/services" className={navClass} onClick={() => setOpen(false)}>Mis servicios</NavLink>
                    <NavLink to="/services/new" className={navClass} onClick={() => setOpen(false)}>Publicar servicio</NavLink>
                  </>
                )}
                {logged && isClient && (
                  <NavLink to="/services/explore" className={navClass} onClick={() => setOpen(false)}>
                    Explorar servicios
                  </NavLink>
                )}
                {logged && isClient && requestsCount > 0 && (
                  <NavLink to="/requests" className={navClass} onClick={() => setOpen(false)}>Mis solicitudes</NavLink>
                )}
                {logged && isProvider && (
                  <NavLink to="/requests" className={navClass} onClick={() => setOpen(false)}>Solicitudes</NavLink>
                )}
                {logged && !isClient && !isProvider && (
                  <NavLink to="/onboarding" className={navClass} onClick={() => setOpen(false)}>Onboarding</NavLink>
                )}
                {logged && (
                  <NavLink to="/profile" className={navClass} onClick={() => setOpen(false)}>
                    {isClient ? "Ajustar perfil" : "Configurar perfil"}
                  </NavLink>
                )}

                <div className="flex items-center gap-3 rounded-lg border border-slate-200 bg-white/80 px-3 py-2">
                  <div className="flex-1">
                    <RolePill />
                  </div>
                  {logged && <NotificationBell />}
                </div>

                {!logged && (
                  <NavLink to="/register" className={navClass} onClick={() => setOpen(false)}>Registrarse</NavLink>
                )}
                {logged ? (
                  <button
                    onClick={() => { onLogout?.(); navigate("/", { replace: true }); setOpen(false); }}
                    className="px-3 py-2 rounded-lg bg-slate-800 text-white hover:bg-slate-700"
                  >
                    Cerrar sesión
                  </button>
                ) : (
                  <NavLink to="/login" className={navClass} onClick={() => setOpen(false)}>Iniciar sesión</NavLink>
                )}
              </div>
            </div>
          )}
        </header>
        

        {/* Contenido */}
        <main className={isDarkPage ? "pt-20 bg-transparent" : "bg-slate-50 pt-20"}>
          <div className={isDarkPage ? "" : "mx-auto max-w-6xl px-4 py-10"}>{children}</div>
        </main>

        {/* Footer */}
<footer className="relative mt-1 bg-white"> {!isLanding && ( <div className="absolute -top-1 left-0 w-full overflow-hidden leading-[0]" aria-hidden> <svg viewBox="0 0 1440 120" preserveAspectRatio="none" className="h-12 w-full"> <path d="M0,64 C240,128 480,0 720,16 C960,32 1200,112 1440,64 L1440,0 L0,0 Z" fill="#ffffff" /> </svg> </div> )} <div className="mx-auto max-w-6xl px-4 py-8 text-center text-sm text-slate-600"> Hecho con amor <span className="align-middle">??</span><br></br><a href="mailto:soporte@fixly.test" className="text-sky-700 hover:underline">soporte@fixly.test</a> · <a href="tel:+56987654321" className="text-sky-700 hover:underline">+56 9 8765 4321</a> </div> </footer>      </div>
    );
}














