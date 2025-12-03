// src/pages/Profile.jsx
import { useEffect, useRef, useState } from "react";
import { readProfile, saveProfile, changePassword } from "../api";
import { useNavigate } from "react-router-dom";

/* helpers */
function initials(name = "") {
  return name.trim().split(/\s+/).slice(0, 2).map(p => p[0]?.toUpperCase()).join("") || "U";
}

const ALL_CATEGORIES = [
  "Plomería", "Electricidad", "Gasfitería", "Pintura",
  "Carpintería", "Cerrajería", "Aseo", "Mudanzas", "Otro",
];

export default function ProfilePage() {
  const nav = useNavigate();
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState("");
  const fileRef = useRef(null);
  const [pwdSaving, setPwdSaving] = useState(false);
  const [pwdError, setPwdError] = useState("");
  const [pwdMsg, setPwdMsg] = useState("");
  const [pwdForm, setPwdForm] = useState({ current: "", next: "", confirm: "" });
  const isStrongPassword = (value) => value.length >= 6 && /[a-z]/.test(value) && /[A-Z]/.test(value) && /\d/.test(value);

  const [form, setForm] = useState({
    displayName: "",
    role: "",                // "client" | "provider"
    location: "",
    bio: "",
    categories: [],          // solo si provider
    photoURL: "",
  });

  useEffect(() => {
    const p = readProfile?.() || {};
    setForm({
      displayName: p.displayName || "",
      role: p.role || "",
      location: p.location || "",
      bio: p.bio || "",
      categories: Array.isArray(p.categories) ? p.categories : [],
      photoURL: p.photoURL || "",
    });
  }, []);

  function onChange(e) {
    const { name, value } = e.target;
    setForm(f => ({ ...f, [name]: value }));
  }

  function toggleCategory(cat) {
    setForm(f => {
      const set = new Set(f.categories || []);
      set.has(cat) ? set.delete(cat) : set.add(cat);
      return { ...f, categories: Array.from(set) };
    });
  }

  async function onPickFile(e) {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!/^image\/(png|jpeg|jpg|webp)$/i.test(file.type)) {
      setErr("Sube una imagen JPG/PNG/WEBP.");
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      setForm(f => ({ ...f, photoURL: String(reader.result || "") }));
    };
    reader.readAsDataURL(file);
  }

  async function onSubmit(e) {
    e.preventDefault();
    setErr("");

    if (!form.role) {
      setErr("Selecciona tu rol.");
      return;
    }
    if (!form.displayName.trim()) {
      setErr("Ingresa tu nombre o alias.");
      return;
    }

    try {
      setSaving(true);
      // guardamos
      saveProfile({
        displayName: form.displayName.trim(),
        role: form.role,
        location: form.location.trim(),
        bio: form.bio.trim(),
        categories: form.role === "provider" ? (form.categories || []) : [],
        photoURL: form.photoURL || "",
      });
      nav("/home", { replace: true });
    } catch {
      setErr("No se pudo guardar el perfil. Intenta nuevamente.");
    } finally {
      setSaving(false);
    }
  }

  async function onSubmitPassword(e) {
    e.preventDefault();
    setPwdError("");
    setPwdMsg("");
    if (!pwdForm.current || !pwdForm.next) {
      setPwdError("Completa todos los campos.");
      return;
    }
    if (!isStrongPassword(pwdForm.next)) {
      setPwdError("La nueva contraseña debe tener al menos 6 caracteres e incluir mayúsculas, minúsculas y números.");
      return;
    }
    if (pwdForm.next !== pwdForm.confirm) {
      setPwdError("Las contraseñas no coinciden.");
      return;
    }
    try {
      setPwdSaving(true);
      await changePassword({ oldPassword: pwdForm.current, newPassword: pwdForm.next });
      setPwdMsg("Contraseña actualizada correctamente.");
      setPwdForm({ current: "", next: "", confirm: "" });
    } catch (error) {
      setPwdError(error?.message || "No se pudo cambiar la contraseña.");
    } finally {
      setPwdSaving(false);
    }
  }

  const isProvider = form.role === "provider";

  return (
    <section className="relative overflow-hidden">
      {/* fondo oscuro consistente */}
      <div className="absolute inset-0 -z-10 bg-gradient-to-br from-[#0A1540] via-[#0B1B4F] to-[#0D2266]" />
      <div className="pointer-events-none absolute -left-28 top-24 h-72 w-72 rounded-full bg-indigo-600/10 blur-3xl" />
      <div className="pointer-events-none absolute -right-20 bottom-10 h-80 w-80 rounded-full bg-sky-500/5 blur-3xl" />

      <div className="mx-auto min-h-[calc(100vh-5rem)] max-w-4xl px-4 py-10 text-white">
        <h1 className="mb-4 text-3xl font-extrabold text-white/95">Tu perfil</h1>

        <form onSubmit={onSubmit} className="rounded-3xl border border-white/10 bg-white/[0.05] p-6 shadow-2xl backdrop-blur">
          {/* error */}
          {err && (
            <div className="mb-4 rounded-xl border border-rose-300/40 bg-rose-500/10 px-4 py-2 text-sm text-rose-100">
              {err}
            </div>
          )}

          {/* avatar */}
          <div className="mb-6 flex items-center gap-4">
            {form.photoURL ? (
              <img
                src={form.photoURL}
                alt={form.displayName || "Avatar"}
                className="h-16 w-16 rounded-full object-cover ring-2 ring-white/20"
              />
            ) : (
              <div className="grid h-16 w-16 place-items-center rounded-full bg-white/10 text-lg font-extrabold text-white/90 ring-2 ring-white/20">
                {initials(form.displayName)}
              </div>
            )}
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={() => fileRef.current?.click()}
                className="rounded-xl border border-white/20 bg-white/10 px-3 py-1.5 text-sm font-semibold hover:bg-white/15"
              >
                Cambiar foto
              </button>
              <span className="text-xs text-indigo-200/80">JPG/PNG/WEBP. Se recorta al centro.</span>
            </div>
            <input ref={fileRef} type="file" accept="image/*" onChange={onPickFile} className="hidden" />
          </div>

          {/* campos */}
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="sm:col-span-2">
              <label className="mb-1 block text-sm text-indigo-200/85">Nombre / Alias</label>
              <input
                name="displayName"
                value={form.displayName}
                onChange={onChange}
                placeholder="Tu nombre o alias"
                className="w-full rounded-xl border border-white/15 bg-white/[0.06] px-4 py-2.5 text-white placeholder-white/60 outline-none focus:ring-2 focus:ring-sky-300/40"
              />
            </div>

            {/* SELECT CORREGIDO: letras negras y fondo blanco */}
            <div>
              <label className="mb-1 block text-sm text-indigo-200/85">Rol</label>
              <select
                name="role"
                value={form.role}
                onChange={onChange}
                className="w-full rounded-xl border border-white/15 bg-white px-4 py-2.5 text-slate-900 outline-none focus:ring-2 focus:ring-sky-300/40"
              >
                <option value="">Selecciona tu rol</option>
                <option value="client">Cliente</option>
                <option value="provider">Proveedor</option>
              </select>
            </div>

            <div>
              <label className="mb-1 block text-sm text-indigo-200/85">Ubicación</label>
              <input
                name="location"
                value={form.location}
                onChange={onChange}
                placeholder="Comuna / ciudad"
                className="w-full rounded-xl border border-white/15 bg-white/[0.06] px-4 py-2.5 text-white placeholder-white/60 outline-none focus:ring-2 focus:ring-sky-300/40"
              />
            </div>

            <div className="sm:col-span-2">
              <label className="mb-1 block text-sm text-indigo-200/85">Bio</label>
              <textarea
                name="bio"
                rows={4}
                value={form.bio}
                onChange={onChange}
                placeholder="Cuéntanos brevemente sobre ti…"
                className="w-full resize-y rounded-xl border border-white/15 bg-white/[0.06] px-4 py-2.5 text-white placeholder-white/60 outline-none focus:ring-2 focus:ring-sky-300/40"
              />
            </div>
          </div>

          {/* categorías (checkboxes para evitar menú nativo) */}
          {isProvider && (
            <div className="mt-4 rounded-2xl border border-white/10 bg-white/[0.04] p-4">
              <div className="mb-2 text-sm font-bold text-indigo-100/90">Tus oficios</div>
              <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
                {ALL_CATEGORIES.map((cat) => {
                  const checked = (form.categories || []).includes(cat);
                  return (
                    <label key={cat} className="inline-flex items-center gap-2 text-sm text-indigo-100/90">
                      <input
                        type="checkbox"
                        checked={checked}
                        onChange={() => toggleCategory(cat)}
                        className="accent-indigo-400"
                      />
                      {cat}
                    </label>
                  );
                })}
              </div>
            </div>
          )}

          <div className="mt-6 flex flex-wrap items-center gap-3">
            <button
              type="submit"
              disabled={saving}
              className="rounded-xl bg-indigo-500 px-5 py-2.5 font-semibold text-white shadow hover:bg-indigo-400 disabled:opacity-60"
            >
              {saving ? "Guardando…" : "Guardar cambios"}
            </button>
            <button
              type="button"
              className="rounded-xl border border-white/30 px-5 py-2.5 font-semibold text-white hover:bg-white/5"
              onClick={() => nav(-1)}
            >
              Cancelar
            </button>
          </div>
        </form>

        <form onSubmit={onSubmitPassword} className="mt-8 rounded-3xl border border-white/10 bg-white/[0.05] p-6 shadow-2xl backdrop-blur">
          <h2 className="mb-4 text-2xl font-extrabold text-white/95">Cambiar contraseña</h2>
          {pwdError && (
            <div className="mb-4 rounded-xl border border-rose-300/40 bg-rose-500/10 px-4 py-2 text-sm text-rose-100">
              {pwdError}
            </div>
          )}
          {pwdMsg && (
            <div className="mb-4 rounded-xl border border-emerald-300/40 bg-emerald-500/10 px-4 py-2 text-sm text-emerald-100">
              {pwdMsg}
            </div>
          )}
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="sm:col-span-2">
              <label className="mb-1 block text-sm text-indigo-200/85">Contraseña actual</label>
              <input
                type="password"
                value={pwdForm.current}
                onChange={(e) => setPwdForm((f) => ({ ...f, current: e.target.value }))}
                placeholder="********"
                className="w-full rounded-xl border border-white/15 bg-white/[0.06] px-4 py-2.5 text-white placeholder-white/60 outline-none focus:ring-2 focus:ring-sky-300/40"
              />
            </div>
            <div>
              <label className="mb-1 block text-sm text-indigo-200/85">Nueva contraseña</label>
              <input
                type="password"
                value={pwdForm.next}
                onChange={(e) => setPwdForm((f) => ({ ...f, next: e.target.value }))}
                placeholder="********"
                className="w-full rounded-xl border border-white/15 bg-white/[0.06] px-4 py-2.5 text-white placeholder-white/60 outline-none focus:ring-2 focus:ring-sky-300/40"
              />
              <p className="mt-1 text-xs text-indigo-100/70">Usa 6+ caracteres. Recomendado: mayúsculas, minúsculas y números.</p>
            </div>
            <div>
              <label className="mb-1 block text-sm text-indigo-200/85">Confirmar contraseña</label>
              <input
                type="password"
                value={pwdForm.confirm}
                onChange={(e) => setPwdForm((f) => ({ ...f, confirm: e.target.value }))}
                placeholder="********"
                className="w-full rounded-xl border border-white/15 bg-white/[0.06] px-4 py-2.5 text-white placeholder-white/60 outline-none focus:ring-2 focus:ring-sky-300/40"
              />
            </div>
          </div>
          <div className="mt-4">
            <button
              type="submit"
              disabled={pwdSaving}
              className="rounded-xl bg-indigo-500 px-5 py-2.5 font-semibold text-white shadow hover:bg-indigo-400 disabled:opacity-60"
            >
              {pwdSaving ? "Actualizando..." : "Cambiar contraseña"}
            </button>
          </div>
        </form>

        {/* bloom */}
        <div className="pointer-events-none mx-auto mt-8 h-16 max-w-4xl rounded-full bg-gradient-to-r from-transparent via-white/5 to-transparent blur-2xl" />
      </div>
    </section>
  );
}
