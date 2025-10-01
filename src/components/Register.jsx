// src/components/Register.jsx
import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { register } from "../api";

export default function Register() {
  const [form, setForm] = useState({ username: "", email: "", password: "" });
  const [showPwd, setShowPwd] = useState(false);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState("");
  const navigate = useNavigate();

  function onChange(e) {
    const { name, value } = e.target;
    setForm((f) => ({ ...f, [name]: value }));
  }

  function isValidEmail(v) {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v);
  }

  async function submit(e) {
    e.preventDefault();
    setErr("");
    if (!isValidEmail(form.email)) {
      setErr("Por favor, ingresa un email válido.");
      return;
    }
    try {
  setLoading(true);
  await register(form);
  navigate("/login", { replace: true, state: { username: form.username } });
} catch (e) {
  setErr(e?.message || "No se pudo crear la cuenta. Intenta nuevamente.");
} finally {
  setLoading(false);
}

  }

  return (
    <section className="relative overflow-hidden">
      {/* Fondo degradado (match landing) */}
      <div className="absolute inset-0 -z-10 bg-gradient-to-br from-indigo-900 via-indigo-800 to-blue-900" />
      {/* Halos suaves */}
      <div className="pointer-events-none absolute -left-28 top-24 h-72 w-72 rounded-full bg-indigo-600/20 blur-3xl" />
      <div className="pointer-events-none absolute -right-20 bottom-10 h-80 w-80 rounded-full bg-sky-500/10 blur-3xl" />

      <div className="mx-auto grid min-h-[calc(100vh-5rem)] max-w-6xl grid-cols-1 items-center gap-10 px-4 py-16 text-white lg:grid-cols-2">
        {/* Columna form */}
        <div className="w-full">
          <div className="rounded-3xl border border-white/15 bg-white/10 p-8 shadow-2xl backdrop-blur">
            <div className="mb-6 text-center ">
              <h1 className="text-3xl font-extrabold leading-tight">Crear cuenta</h1>
              <p className="mt-1 text-sm text-indigo-100/90">
                Únete a Fixly y publica solicitudes o encuentra trabajos.
              </p>
            </div>

            {err && (
              <div className="mb-4 rounded-xl border border-rose-300/40 bg-rose-500/10 px-4 py-2 text-sm text-rose-100">
                {err}
              </div>
            )}

            <form onSubmit={submit} className="grid gap-4">
              <div>
                <label className="mb-1 block text-sm text-indigo-100/90">Usuario</label>
                <input
                  name="username"
                  value={form.username}
                  onChange={onChange}
                  placeholder="tu_usuario"
                  required
                  className="w-full rounded-xl border border-white/20 bg-white/10 px-4 py-2.5 text-white placeholder:text-white/70 outline-none focus:ring-2 focus:ring-sky-300/40"
                />
              </div>

              <div>
                <label className="mb-1 block text-sm text-indigo-100/90">Email</label>
                <input
                  name="email"
                  type="email"
                  value={form.email}
                  onChange={onChange}
                  placeholder="tucorreo@dominio.com"
                  required
                  className="w-full rounded-xl border border-white/20 bg-white/10 px-4 py-2.5 text-white placeholder:text-white/70 outline-none focus:ring-2 focus:ring-sky-300/40"
                />
              </div>

              <div>
                <label className="mb-1 block text-sm text-indigo-100/90">Contraseña</label>
                <div className="relative">
                  <input
                    name="password"
                    type={showPwd ? "text" : "password"}
                    value={form.password}
                    onChange={onChange}
                    placeholder="••••••••"
                    required
                    className="w-full rounded-xl border border-white/20 bg-white/10 px-4 py-2.5 pr-10 text-white placeholder:text-white/70 outline-none focus:ring-2 focus:ring-sky-300/40"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPwd((v) => !v)}
                    className="absolute right-2 top-1/2 -translate-y-1/2 rounded-lg border border-white/20 bg-white/10 px-2 py-1 text-xs text-white/90 hover:bg-white/15"
                    aria-label={showPwd ? "Ocultar contraseña" : "Mostrar contraseña"}
                  >
                    {showPwd ? "Ocultar" : "Mostrar"}
                  </button>
                </div>
                <p className="mt-1 text-xs text-indigo-100/70">
                  Usa 8+ caracteres. Recomendado: mayúsculas, minúsculas y números.
                </p>
              </div>

              <button
                disabled={loading}
                className="mt-2 w-full rounded-xl bg-white py-2.5 font-semibold text-slate-900 transition hover:opacity-95 disabled:opacity-60"
              >
                {loading ? "Creando..." : "Registrarme"}
              </button>
            </form>

            <p className="mt-5 text-center text-sm text-indigo-100/90">
              ¿Ya tienes cuenta?{" "}
              <Link to="/login" className="font-semibold text-white hover:underline">
                Iniciar sesión
              </Link>
            </p>
          </div>
        </div>

        {/* Columna imagen */}
        <div className="hidden place-items-center lg:grid">
          <div className="relative">
            {/* borde asimétrico vistoso (no recorta demasiado la imagen) */}
            <img
              src={"/Register.png"}
              onError={(e) => {
                e.currentTarget.src = "https://images.unsplash.com/photo-1600880292240-98eac1f9b9f7?q=80&w=1200&auto=format&fit=crop";
              }}
              alt="Registro en Fixly"
              className="w-[520px] max-w-full rounded-tl-[72px] rounded-br-[72px] rounded-tr-2xl rounded-bl-2xl border border-white/20 shadow-2xl"
            />
            {/* glow/acento */}
            <div className="pointer-events-none absolute -right-10 -top-8 h-28 w-28 rounded-full bg-sky-400/20 blur-2xl" />
          </div>
        </div>
      </div>
    </section>
  );
}
