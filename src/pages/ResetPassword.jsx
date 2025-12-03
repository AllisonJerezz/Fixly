// src/pages/ResetPassword.jsx
import { useState } from "react";
import { Link, useSearchParams, useNavigate } from "react-router-dom";
import { confirmPasswordReset } from "../api";

export default function ResetPassword() {
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const uid = params.get("uid") || "";
  const token = params.get("token") || "";

  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);
  const isLinkValid = uid && token;
  const isStrongPassword = (value) => value.length >= 6 && /[a-z]/.test(value) && /[A-Z]/.test(value) && /\d/.test(value);

  async function submit(e) {
    e.preventDefault();
    setError("");
    setMessage("");
    if (!isLinkValid) {
      setError("El enlace no es válido.");
      return;
    }
    if (!password || !isStrongPassword(password)) {
      setError("La contraseña debe tener al menos 6 caracteres e incluir mayúsculas, minúsculas y números.");
      return;
    }
    if (password !== confirm) {
      setError("Las contraseñas no coinciden.");
      return;
    }
    try {
      setLoading(true);
      await confirmPasswordReset({ uid, token, password });
      setMessage("Contraseña actualizada. Ahora puedes iniciar sesión.");
      setTimeout(() => navigate("/login", { replace: true }), 1500);
    } catch (err) {
      setError(err?.message || "No pudimos actualizar la contraseña.");
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
            <h1 className="text-3xl font-extrabold leading-tight">Restablecer contraseña</h1>
            <p className="mt-1 text-sm text-white/80">Ingresa una nueva contraseña para tu cuenta.</p>
          </div>

          {!isLinkValid && (
            <div className="mb-4 rounded-xl border border-rose-300/40 bg-rose-500/10 px-4 py-2 text-sm text-rose-100">
              Enlace inválido o incompleto. Revisa el correo que recibiste.
            </div>
          )}

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
              <label className="mb-1 block text-sm text-white/85">Nueva contraseña</label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="********"
                disabled={!isLinkValid}
                className="w-full rounded-xl border border-white/20 bg-white/10 px-4 py-2.5 text-white placeholder:text-white/70 outline-none focus:ring-2 focus:ring-sky-300/40 disabled:opacity-60"
              />
              <p className="mt-1 text-xs text-white/75">Usa 6+ caracteres. Recomendado: mayúsculas, minúsculas y números.</p>
            </div>
            <div>
              <label className="mb-1 block text-sm text-white/85">Confirmar contraseña</label>
              <input
                type="password"
                value={confirm}
                onChange={(e) => setConfirm(e.target.value)}
                placeholder="********"
                disabled={!isLinkValid}
                className="w-full rounded-xl border border-white/20 bg-white/10 px-4 py-2.5 text-white placeholder:text-white/70 outline-none focus:ring-2 focus:ring-sky-300/40 disabled:opacity-60"
              />
            </div>
            <button
              type="submit"
              disabled={!isLinkValid || loading}
              className="mt-2 w-full rounded-xl bg-white/90 py-2.5 font-semibold text-slate-900 transition hover:bg-white disabled:opacity-60"
            >
              {loading ? "Actualizando..." : "Guardar contraseña"}
            </button>
          </form>

          <p className="mt-5 text-center text-sm text-white/80">
            ¿Ya la cambiaste?{" "}
            <Link to="/login" className="font-semibold text-white hover:underline">
              Iniciar sesión
            </Link>
          </p>
        </div>
      </div>
    </section>
  );
}
