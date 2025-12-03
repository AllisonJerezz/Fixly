// src/pages/ForgotPassword.jsx
import { useState } from "react";
import { Link } from "react-router-dom";
import { requestPasswordReset } from "../api";

export default function ForgotPassword() {
  const [email, setEmail] = useState("");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function submit(e) {
    e.preventDefault();
    setError("");
    setMessage("");
    if (!email.trim()) {
      setError("Ingresa tu email.");
      return;
    }
    try {
      setLoading(true);
      await requestPasswordReset(email);
      setMessage("Si tu email está registrado, te enviamos instrucciones para restablecer la contraseña.");
    } catch (err) {
      setError(err?.message || "No pudimos enviar el correo. Intenta nuevamente.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <section className="relative overflow-hidden">
      <div className="absolute inset-0 -z-10 bg-gradient-to-br from-indigo-900 via-indigo-800 to-blue-900" />
      <div className="pointer-events-none absolute -left-28 top-24 h-72 w-72 rounded-full bg-indigo-600/30 blur-3xl" />
      <div className="pointer-events-none absolute -right-20 bottom-10 h-80 w-80 rounded-full bg-sky-500/20 blur-2xl" />

      <div className="mx-auto grid min-h-[calc(100vh-5rem)] max-w-md items-center px-4 py-16 text-white">
        <div className="rounded-3xl border border-white/15 bg-white/15 p-8 shadow-2xl backdrop-blur">
          <div className="mb-6 text-center text-white/95">
            <h1 className="text-3xl font-extrabold leading-tight">Recuperar contraseña</h1>
            <p className="mt-1 text-sm text-white/80">Te enviaremos un enlace a tu correo.</p>
          </div>

          {error && (
            <div className="mb-4 rounded-xl border border-rose-300/40 bg-rose-500/10 px-4 py-2 text-sm text-rose-100">
              {error}
            </div>
          )}
          {message && (
            <div className="mb-4 rounded-xl border border-emerald-300/40 bg-emerald-500/10 px-4 py-2 text-sm text-emerald-100">
              {message}
            </div>
          )}

          <form onSubmit={submit} className="grid gap-4">
            <div>
              <label className="mb-1 block text-sm text-white/85">Email</label>
              <input
                name="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="tucorreo@dominio.com"
                required
                className="w-full rounded-xl border border-white/20 bg-white/10 px-4 py-2.5 text-white placeholder:text-white/70 outline-none focus:ring-2 focus:ring-sky-300/40"
              />
            </div>
            <button
              type="submit"
              disabled={loading}
              className="mt-2 w-full rounded-xl bg-white/90 py-2.5 font-semibold text-slate-900 transition hover:bg-white disabled:opacity-60"
            >
              {loading ? "Enviando..." : "Enviar instrucciones"}
            </button>
          </form>

          <p className="mt-5 text-center text-sm text-white/80">
            ¿Recordaste tu contraseña?{" "}
            <Link to="/login" className="font-semibold text-white hover:underline">
              Iniciar sesión
            </Link>
          </p>
        </div>
      </div>
    </section>
  );
}
