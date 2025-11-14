// src/pages/RequestEdit.jsx
import { useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import {
  lsGetRequestById,
  lsUpdateRequest,
} from "../api";
import { useToast } from "../components/Toast";

function Field({ label, children, hint }) {
  return (
    <div>
      <label className="mb-1 block text-sm text-indigo-200/85">{label}</label>
      {children}
      {hint && <p className="mt-1 text-xs text-indigo-200/70">{hint}</p>}
    </div>
  );
}

export default function RequestEdit() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { show } = useToast();

  const [req, setReq] = useState(null);
  const [form, setForm] = useState({
    title: "",
    category: "",
    description: "",
    budget: "",
    location: "",
    urgency: "normal",
    status: "pendiente",
  });
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState("");

  useEffect(() => {
    (async () => {
      const r = await lsGetRequestById(id);
      if (!r) return;
      setReq(r);
      setForm({
        title: r.title || "",
        category: r.category || "",
        description: r.description || "",
        budget: typeof r.budget === "number" ? r.budget : "",
        location: r.location || "",
        urgency: r.urgency || "normal",
        status: r.status || "pendiente",
      });
    })();
  }, [id]);

  function onChange(e) {
    const { name, value } = e.target;
    setForm((f) => ({ ...f, [name]: value }));
  }

  function setStatus(newStatus) {
    setForm((f) => ({ ...f, status: newStatus }));
  }

  async function submit(e) {
    e.preventDefault();
    setErr("");

    if (!form.title.trim() || !form.category.trim() || !form.description.trim()) {
      setErr("Completa título, categoría y descripción.");
      return;
    }

    try {
      setLoading(true);
      const patch = {
        title: form.title.trim(),
        category: form.category,
        description: form.description,
        budget: form.budget ? Number(form.budget) : undefined,
        location: form.location,
        urgency: form.urgency,
        status: form.status,
      };
      const updated = await lsUpdateRequest(id, patch);
      if (!updated) {
        show("No se pudo guardar", { type: "error" });
        setErr("No se pudo guardar la solicitud.");
        return;
      }
      show("Cambios guardados ✅", { type: "success" });
      navigate(`/requests/${id}`, { replace: true });
    } catch {
      show("Error al guardar", { type: "error" });
      setErr("Ocurrió un error al guardar.");
    } finally {
      setLoading(false);
    }
  }

  if (!req) {
    return (
      <section className="relative overflow-hidden">
        <div className="absolute inset-0 -z-10 bg-gradient-to-br from-[#0A1540] via-[#0B1B4F] to-[#0D2266]" />
        <div className="mx-auto min-h-[calc(100vh-5rem)] max-w-3xl px-4 py-16 text-white">
          <div className="rounded-2xl border border-white/10 bg-white/[0.05] p-8 text-center shadow-xl backdrop-blur">
            <h1 className="text-2xl font-extrabold text-white/95">Solicitud no encontrada</h1>
            <p className="mt-2 text-indigo-200/90">Puede que haya sido eliminada o el enlace sea incorrecto.</p>
            <div className="mt-6">
              <Link to="/requests" className="rounded-xl bg-indigo-500 px-4 py-2.5 font-semibold text-white shadow hover:bg-indigo-400">
                Volver a solicitudes
              </Link>
            </div>
          </div>
        </div>
      </section>
    );
  }

  return (
    <section className="relative overflow-hidden">
      {/* Fondo degradé + halos */}
      <div className="absolute inset-0 -z-10 bg-gradient-to-br from-[#0A1540] via-[#0B1B4F] to-[#0D2266]" />
      <div className="pointer-events-none absolute -left-28 top-24 h-72 w-72 rounded-full bg-indigo-600/10 blur-3xl" />
      <div className="pointer-events-none absolute -right-20 bottom-10 h-80 w-80 rounded-full bg-sky-500/5 blur-3xl" />

      <div className="mx-auto min-h-[calc(100vh-5rem)] max-w-6xl px-4 py-10 text-white">
        {/* Header */}
        <div className="mb-6 flex items-center justify-between gap-3">
          <div>
            <h1 className="text-3xl font-extrabold text-white/95">Editar solicitud</h1>
            <p className="mt-1 text-sm text-indigo-200/80">ID: {req.id}</p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Link
              to={`/requests/${id}`}
              className="rounded-xl border border-white/30 px-4 py-2.5 text-sm font-semibold text-white hover:bg-white/5"
            >
              Volver al detalle
            </Link>
          </div>
        </div>

        <div className="grid grid-cols-1 items-start gap-10 lg:grid-cols-3">
          {/* Form principal */}
          <div className="lg:col-span-2 rounded-3xl border border-white/10 bg-white/[0.05] p-8 shadow-2xl backdrop-blur">
            {err && (
              <div className="mb-4 rounded-xl border border-rose-300/40 bg-rose-500/10 px-4 py-2 text-sm text-rose-100">
                {err}
              </div>
            )}

            <form onSubmit={submit} className="grid gap-4">
              <Field label="Título">
                <input
                  name="title"
                  value={form.title}
                  onChange={onChange}
                  placeholder="Ej: Reparación de enchufe y revisión de circuito"
                  required
                  className="w-full rounded-xl border border-white/15 bg-white/[0.06] px-4 py-2.5 text-white placeholder-white/60 outline-none focus:ring-2 focus:ring-sky-300/40"
                />
              </Field>

              <div className="grid gap-4 sm:grid-cols-2">
                <Field label="Categoría">
                  <select
                    name="category"
                    value={form.category}
                    onChange={onChange}
                    required
                    className="w-full rounded-xl border border-white/15 bg-indigo-500/20 px-4 py-2.5 text-white outline-none focus:ring-2 focus:ring-sky-300/40"
                  >
                    <option value="">Selecciona una categoría</option>
                    <option value="Plomería">Plomería</option>
                    <option value="Electricidad">Electricidad</option>
                    <option value="Gasfitería">Gasfitería</option>
                    <option value="Pintura">Pintura</option>
                    <option value="Carpintería">Carpintería</option>
                    <option value="Otro">Otro</option>
                  </select>
                </Field>

                <Field label="Urgencia">
                  <select
                    name="urgency"
                    value={form.urgency}
                    onChange={onChange}
                    className="w-full rounded-xl border border-white/15 bg-indigo-500/20 px-4 py-2.5 text-white outline-none focus:ring-2 focus:ring-sky-300/40"
                  >
                    <option value="baja">Baja</option>
                    <option value="normal">Normal</option>
                    <option value="alta">Alta</option>
                  </select>
                </Field>
              </div>

              <Field label="Descripción" hint="Actualiza los detalles que ayuden a los proveedores a cotizar mejor.">
                <textarea
                  name="description"
                  value={form.description}
                  onChange={onChange}
                  rows={6}
                  placeholder="Describe el trabajo, materiales, medidas, fechas, etc."
                  className="w-full resize-y rounded-xl border border-white/15 bg-white/[0.06] px-4 py-3 text-white placeholder-white/60 outline-none focus:ring-2 focus:ring-sky-300/40"
                />
              </Field>

              <div className="grid gap-4 sm:grid-cols-2">
                <Field label="Presupuesto (CLP)">
                  <input
                    name="budget"
                    type="number"
                    min="0"
                    inputMode="numeric"
                    value={form.budget}
                    onChange={onChange}
                    placeholder="Ej: 150000"
                    className="w-full rounded-xl border border-white/15 bg-white/[0.06] px-4 py-2.5 text-white placeholder-white/60 outline-none focus:ring-2 focus:ring-sky-300/40"
                  />
                </Field>

                <Field label="Ubicación">
                  <input
                    name="location"
                    value={form.location}
                    onChange={onChange}
                    placeholder="Comuna / Ciudad"
                    className="w-full rounded-xl border border-white/15 bg-white/[0.06] px-4 py-2.5 text-white placeholder-white/60 outline-none focus:ring-2 focus:ring-sky-300/40"
                  />
                </Field>
              </div>

              <div className="mt-2 flex flex-wrap gap-3">
                <button
                  type="submit"
                  disabled={loading}
                  className="rounded-xl bg-indigo-500 px-5 py-2.5 font-semibold text-white shadow hover:bg-indigo-400 disabled:opacity-60"
                >
                  {loading ? "Guardando..." : "Guardar cambios"}
                </button>
                <Link
                  to={`/requests/${id}`}
                  className="rounded-xl border border-white/30 px-5 py-2.5 font-semibold text-white hover:bg-white/5"
                >
                  Cancelar
                </Link>
              </div>
            </form>
          </div>

          {/* Panel lateral: estado rápido */}
          <aside className="rounded-3xl border border-white/10 bg-white/[0.05] p-8 shadow-2xl backdrop-blur">
            <h3 className="text-lg font-extrabold text-white/95">Estado</h3>
            <div className="mt-3 grid gap-2">
              <StateButton
                active={String(form.status||'').toLowerCase().replace(/_/g,' ') === "pendiente"}
                label="Pendiente"
                onClick={() => setStatus("pendiente")}
              />
              <StateButton
                active={String(form.status||'').toLowerCase().replace(/_/g,' ') === "en progreso"}
                label="En progreso"
                onClick={() => setStatus("en progreso")}
              />
              <StateButton
                active={String(form.status||'').toLowerCase().replace(/_/g,' ') === "completado"}
                label="Completado"
                onClick={() => setStatus("completado")}
              />
              <StateButton
                active={String(form.status||'').toLowerCase().replace(/_/g,' ') === "cancelado"}
                label="Cancelado"
                onClick={() => setStatus("cancelado")}
              />
            </div>

            <div className="mt-5 text-sm text-indigo-200/85">
              <p>
                <strong className="text-white/95">TIP:</strong> si el trabajo ya está en marcha,
                marca “En progreso”; cuando termine, marca “Completado”.
              </p>
            </div>
          </aside>
        </div>

        {/* Bloom suave */}
        <div className="pointer-events-none mx-auto mt-8 h-16 max-w-5xl rounded-full bg-gradient-to-r from-transparent via-white/5 to-transparent blur-2xl" />
      </div>
    </section>
  );
}

/* ---------- Subcomponentes ---------- */
function StateButton({ active, label, onClick }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={[
        "w-full rounded-xl border px-4 py-2 text-left font-semibold transition",
        active
          ? "border-indigo-300/40 bg-indigo-400/10 text-white/95"
          : "border-white/10 bg-white/[0.05] text-indigo-100/90 hover:bg-white/[0.07]",
      ].join(" ")}
    >
      {label}
    </button>
  );
}
