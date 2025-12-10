// src/pages/Onboarding.jsx
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { saveProfile, setOnboardingDone, readProfile } from "../api";
import AvatarPicker from "../components/AvatarPicker";

export default function Onboarding({ onFinish }) {
  const navigate = useNavigate();
  const stored = readProfile() || {};

  // ----- Pasos -----
  const steps = ["Perfil", "Rol", "Intereses", "Confirmación"];
  const [step, setStep] = useState(0); // 0..steps.length-1

  // ----- Form -----
  const [form, setForm] = useState({
    displayName: stored.displayName || "",
    role: stored.role || "", // "client" | "provider"
    categories: Array.isArray(stored.categories) ? stored.categories : [],
    // photoURL no es obligatorio guardarlo aquÃ­, AvatarPicker lo persiste directo,
    // pero lo mantenemos en memoria para la Confirmación final si ya existe.
    photoURL: stored.photoURL || "",
  });

  const [err, setErr] = useState("");
  const [loading, setLoading] = useState(false);

  // ----- Helpers -----
  const pct = Math.round(((step + 1) / steps.length) * 100);

  function next() {
    setErr("");
    if (step === 0 && !form.displayName.trim()) {
      setErr("Ingresa tu nombre a mostrar.");
      return;
    }
    if (step === 1 && !form.role) {
      setErr("Selecciona un rol.");
      return;
    }
    if (step === 2 && form.role === "provider" && (!form.categories || form.categories.length === 0)) {
      setErr("Selecciona al menos una categorÃ­a si eres proveedor.");
      return;
    }
    setStep((s) => Math.min(s + 1, steps.length - 1));
  }

  function back() {
    setErr("");
    setStep((s) => Math.max(s - 1, 0));
  }

  function toggleCategory(cat) {
    setForm((f) => {
      const exists = f.categories.includes(cat);
      return { ...f, categories: exists ? f.categories.filter((c) => c !== cat) : [...f.categories, cat] };
    });
  }

  async function finish() {
    setErr("");
    try {
      setLoading(true);
      // saveProfile final (photoURL ya fue guardado por AvatarPicker; lo sincronizamos)
      const latest = readProfile() || {};
      saveProfile({
        displayName: form.displayName.trim(),
        role: form.role,
        categories: form.categories,
        photoURL: latest.photoURL || form.photoURL || "",
      });
      setOnboardingDone();
      onFinish?.();
      navigate("/home", { replace: true });
    } catch (e) {
      setErr("No se pudo guardar el perfil. Intenta nuevamente.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <section className="relative overflow-hidden">
      {/* Fondo degradÃ© + halos */}
      <div className="absolute inset-0 -z-10 bg-gradient-to-br from-[#0A1540] via-[#0B1B4F] to-[#0D2266]" />
      <div className="pointer-events-none absolute -left-28 top-24 h-72 w-72 rounded-full bg-indigo-600/10 blur-3xl" />
      <div className="pointer-events-none absolute -right-20 bottom-10 h-80 w-80 rounded-full bg-sky-500/5 blur-3xl" />

      <div className="mx-auto min-h-[calc(100vh-5rem)] max-w-3xl px-4 py-16 text-white">
        {/* Header */}
        <h1 className="mb-2 text-3xl font-extrabold text-white/95">Personaliza tu experiencia</h1>
        <p className="text-indigo-200/90">Completa tu perfil para conectar mejor con clientes o proveedores.</p>

        {/* Barra de progreso */}
        <div className="mt-6">
          <div className="mb-2 flex items-center justify-between text-sm text-indigo-200/85">
            <span>Progreso</span>
            <span className="font-semibold text-white/95">{pct}%</span>
          </div>
          <div className="h-2 w-full overflow-hidden rounded-full border border-white/10 bg-white/[0.06] backdrop-blur">
            <div
              className="h-full rounded-full bg-gradient-to-r from-indigo-500 via-indigo-400 to-sky-400 transition-all"
              style={{ width: `${pct}%` }}
            />
          </div>
        </div>

        {/* Card principal (glass) */}
        <div className="mt-6 rounded-3xl border border-white/10 bg-white/[0.05] p-8 shadow-2xl backdrop-blur">
          {err && (
            <div className="mb-5 rounded-xl border border-rose-300/40 bg-rose-500/10 px-4 py-2 text-sm text-rose-100">
              {err}
            </div>
          )}

          {/* Contenido por paso */}
          {step === 0 && (
            <StepPerfil
              form={form}
              setForm={setForm}
            />
          )}

          {step === 1 && (
            <StepRol
              role={form.role}
              setRole={(role) => setForm((f) => ({ ...f, role }))}
            />
          )}

          {step === 2 && (
            <StepCategorias
              role={form.role}
              selected={form.categories}
              toggle={toggleCategory}
            />
          )}

          {step === 3 && (
            <StepConfirmacion
              form={form}
            />
          )}

          {/* NavegaciÃ³n */}
          <div className="mt-6 flex flex-wrap items-center justify-between gap-3">
            <button
              onClick={back}
              disabled={step === 0}
              className="rounded-xl border border-white/30 px-5 py-2.5 font-semibold text-white hover:bg-white/5 disabled:opacity-50"
            >
              Atrás
            </button>

            {step < steps.length - 1 ? (
              <button
                onClick={next}
                className="rounded-xl bg-indigo-500 px-5 py-2.5 font-semibold text-white shadow hover:bg-indigo-400"
              >
                Siguiente
              </button>
            ) : (
              <button
                onClick={finish}
                disabled={loading}
                className="rounded-xl bg-indigo-500 px-5 py-2.5 font-semibold text-white shadow hover:bg-indigo-400 disabled:opacity-60"
              >
                {loading ? "Guardando..." : "Finalizar"}
              </button>
            )}
          </div>
        </div>

        {/* Bloom suave */}
        <div className="pointer-events-none mx-auto mt-6 h-16 max-w-3xl rounded-full bg-gradient-to-r from-transparent via-white/5 to-transparent blur-2xl" />
      </div>
    </section>
  );
}

/* ================= Subcomponentes de pasos ================= */

function StepPerfil({ form, setForm }) {
  return (
    <div className="grid gap-5">
      {/* Avatar + Nombre lado a lado */}
      <div className="flex flex-wrap items-center gap-4">
        <AvatarPicker
          size={72}
          onChange={(dataURL) => setForm((f) => ({ ...f, photoURL: dataURL }))}
        />
        <div className="flex-1 min-w-[220px]">
          <label className="mb-1 block text-sm text-indigo-200/85">Nombre a mostrar</label>
          <input
            name="displayName"
            value={form.displayName}
            onChange={(e) => setForm((f) => ({ ...f, displayName: e.target.value }))}
            placeholder="Cómo quieres que te vean"
            className="w-full rounded-xl border border-white/15 bg-white/[0.06] px-4 py-2.5 text-white placeholder-white/60 outline-none focus:ring-2 focus:ring-sky-300/40"
          />
          <p className="mt-1 text-xs text-indigo-200/75">
            Tu foto y nombre ayudan a generar confianza.
          </p>
        </div>
      </div>

      <Tip>Sube una foto real (rostro). Se recorta automáticamente al centro.</Tip>
    </div>
  );
}

function StepRol({ role, setRole }) {
  return (
    <div className="grid gap-4 sm:grid-cols-2">
      <RoleCard
        active={role === "client"}
        title="Cliente"
        desc="Publica solicitudes y recibe ofertas de proveedores."
        onClick={() => setRole("client")}
      />
      <RoleCard
        active={role === "provider"}
        title="Proveedor"
        desc="Explora solicitudes y enví­a propuestas competitivas."
        onClick={() => setRole("provider")}
      />
    </div>
  );
}

function RoleCard({ active, title, desc, onClick }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={[
        "rounded-2xl border p-5 text-left shadow-xl backdrop-blur transition",
        active
          ? "border-indigo-300/40 bg-indigo-400/10"
          : "border-white/10 bg-white/[0.05] hover:bg-white/[0.07]",
      ].join(" ")}
    >
      <div className="flex items-start justify-between gap-3">
        <div>
          <h3 className="text-xl font-extrabold text-white/95">{title}</h3>
          <p className="mt-1 text-sm text-indigo-200/90">{desc}</p>
        </div>
        {active && (
          <span className="mt-0.5 inline-flex items-center gap-1 rounded-full border border-indigo-300/40 bg-indigo-400/10 px-2 py-0.5 text-[11px] font-semibold text-indigo-100/90">
            Seleccionado
          </span>
        )}
      </div>
    </button>
  );
}

function StepCategorias({ role, selected, toggle }) {
  const [custom, setCustom] = useState("");
  const all = [
    "Plomería",
    "Electricidad",
    "Gasfitería",
    "Pintura",
    "Carpintería",
    "Cerrajería",
    "Aseo",
    "Mudanzas",
    "Otro",
  ];

  return (
    <div className="grid gap-4">
      <p className="text-indigo-200/90">
        {role === "provider"
          ? "Elige tus oficios para encontrar trabajos afines."
          : "Selecciona tus intereses (opcional)."}
      </p>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
        {all.map((cat) => {
          const active = selected.includes(cat);
          return (
            <button
              key={cat}
              type="button"
              onClick={() => toggle(cat)}
              className={[
                "rounded-xl border px-3 py-2 text-sm font-semibold shadow backdrop-blur transition",
                active
                  ? "border-indigo-300/40 bg-indigo-400/10 text-white/95"
                  : "border-white/10 bg-white/[0.05] text-indigo-100/90 hover:bg-white/[0.07]",
              ].join(" ")}
            >
              {cat}
            </button>
          );
        })}
      </div>

      <div className="mt-3 grid gap-2 rounded-xl border border-white/10 bg-white/[0.04] p-3">
        <label className="text-sm text-indigo-200/85">¿Otra categoría?</label>
        <div className="flex flex-col gap-2 sm:flex-row">
          <input
            value={custom}
            onChange={(e) => setCustom(e.target.value)}
            placeholder="Escribe tu categoría"
            className="flex-1 rounded-xl border border-white/15 bg-white/[0.06] px-3 py-2 text-white placeholder-white/60 outline-none focus:ring-2 focus:ring-sky-300/40"
          />
          <button
            type="button"
            onClick={() => {
              const val = (custom || "").trim();
              if (!val) return;
              if (!selected.includes(val)) toggle(val);
              setCustom("");
            }}
            className="rounded-xl bg-indigo-500 px-4 py-2 text-sm font-semibold text-white shadow hover:bg-indigo-400"
          >
            Agregar
          </button>
        </div>
      </div>

      <Tip>Puedes cambiar tus categorí­as luego en "Ajustar perfil".</Tip>
    </div>
  );
}

function StepConfirmacion({ form }) {
  const latest = readProfile() || {};
  const photo = latest.photoURL || form.photoURL || "";

  return (
    <div className="grid gap-4">
      <p className="text-indigo-200/90">Revisa tu información antes de finalizar.</p>

      <div className="flex items-center gap-4">
        <div className="h-14 w-14 overflow-hidden rounded-full border border-white/15 bg-white/5 shadow">
          <img
            src={photo || "/avatar-fallback.svg"}
            alt="Avatar"
            className="h-full w-full object-cover"
            onError={(e) => { e.currentTarget.src = "/avatar-fallback.svg"; }}
          />
        </div>
        <div className="text-sm text-indigo-200/85">Así se verá tu avatar</div>
      </div>

      <div className="grid gap-2">
        <Row label="Nombre a mostrar" value={form.displayName || "...”"} />
        <Row
          label="Rol"
          value={
            form.role === "provider"
              ? "Proveedor"
              : form.role === "client"
              ? "Cliente"
              : "â€”"
          }
        />
        <Row
          label="CategorÃ­as"
          value={
            form.categories && form.categories.length > 0
              ? form.categories.join(", ")
              : "â€”"
          }
        />
      </div>

      <Tip>Podrás editar estos datos más adelante.</Tip>
    </div>
  );
}

/* ================= Utils UI ================= */

function Row({ label, value }) {
  return (
    <div className="flex items-center justify-between gap-4 rounded-xl border border-white/10 bg-white/[0.04] px-3 py-2">
      <span className="text-sm text-indigo-200/85">{label}</span>
      <span className="text-sm font-semibold text-white/95">{value}</span>
    </div>
  );
}

function Tip({ children }) {
  return (
    <div className="mt-1 rounded-xl border border-white/10 bg-white/[0.04] px-3 py-2 text-sm text-indigo-200/85">
      {children}
    </div>
  );
}

