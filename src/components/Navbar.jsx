// src/components/Navbar.jsx
import { Link, NavLink } from "react-router-dom";
import { readProfile, isAuthed } from "../api";

function Brand() {
  return (
    <Link to="/" className="flex items-center gap-2">
      <span
        className="text-2xl font-black leading-none bg-gradient-to-r from-indigo-700 via-blue-700 to-sky-600 bg-clip-text text-transparent"
        style={{ letterSpacing: "-0.02em" }}
      >
        Fixly
      </span>
    </Link>
  );
}

function NavItem({ to, children }) {
  return (
    <NavLink
      to={to}
      className={({ isActive }) =>
        [
          "rounded-lg px-3 py-2 text-sm font-semibold transition",
          isActive
            ? "text-indigo-700 bg-indigo-50"
            : "text-slate-700 hover:bg-slate-100",
        ].join(" ")
      }
    >
      {children}
    </NavLink>
  );
}

export default function Navbar({ onLogout }) {
  const authed = isAuthed();
  const profile = readProfile?.();
  const role =
    profile?.role === "client" ? "Cliente" :
    profile?.role === "provider" ? "Proveedor" : "—";

  return (
    <header className="fixed inset-x-0 top-0 z-50 border-b border-slate-200 bg-white/95 backdrop-blur supports-[backdrop-filter]:bg-white/80">
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4">
        <Brand />

        <nav className="hidden gap-1 sm:flex">
          <NavItem to="/">Inicio</NavItem>
          {authed && <NavItem to="/home">Panel</NavItem>}
          <NavItem to="/requests">Solicitudes</NavItem>
        </nav>

        <div className="flex items-center gap-2">
          {authed ? (
            <>
              <span className="hidden rounded-lg border border-slate-200 px-2 py-1 text-xs font-semibold text-slate-600 sm:inline-flex">
                {role}
              </span>
              <button
                onClick={onLogout}
                className="rounded-xl bg-indigo-600 px-3 py-2 text-sm font-semibold text-white hover:bg-indigo-700"
              >
                Cerrar sesión
              </button>
            </>
          ) : (
            <>
              <Link
                to="/login"
                className="rounded-lg px-3 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-100"
              >
                Entrar
              </Link>
              <Link
                to="/register"
                className="rounded-xl bg-indigo-600 px-3 py-2 text-sm font-semibold text-white hover:bg-indigo-700"
              >
                Crear cuenta
              </Link>
            </>
          )}
        </div>
      </div>
    </header>
  );
}
