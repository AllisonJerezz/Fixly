// src/pages/RequestNew.jsx
import { useEffect, useMemo, useState } from "react";
import { useNavigate, useSearchParams, Link } from "react-router-dom";
import { lsCreateRequest, readProfile } from "../api";

const CATEGORIES = [
  "Plomería", "Electricidad", "Gasfitería", "Pintura",
  "Carpintería", "Cerrajería", "Aseo", "Mudanzas", "Otro",
];

export default function RequestNew() {
  const navigate = useNavigate();
  const profile = readProfile?.();
  const [params] = useSearchParams();

  // Prefill desde querystring (al venir de "Contactar")
  const prefill = useMemo(() => {
    const title = params.get("title");
    const category = params.get("category");
    const location = params.get("location");
    const priceFrom = params.get("priceFrom");
    const to = params.get("to"); // proveedor (ownerId)
    const serviceId = params.get("serviceId");
    return {
      title: title ? `Necesito` : "",
      category: category || "",
      location: location || "",
      budget: priceFrom ? Number(priceFrom) : 0,
      to: to || "",
      serviceId: serviceId || "",
    };
  }, [params]);

  // Nombre del proveedor a mostrar
  const [provName, setProvName] = useState("");
  const [svcTitle, setSvcTitle] = useState("");
  useEffect(() => {
    (async () => {
      try {
        const key = String(prefill.to || '').trim();
        if (!key) return;
        // 1) Intentar cache local (perfiles guardados por usernameLower)
        for (let i = 0; i < localStorage.length; i++) {
          const k = localStorage.key(i);
          if (k && k.startsWith('profile:')) {
            try {
              const p = JSON.parse(localStorage.getItem(k) || 'null');
              if (p && (String(p.id) === key || String(p.username || '').toLowerCase() === key.toLowerCase())) {
                setProvName(p.displayName || p.username || 'Proveedor');
                return;
              }
            } catch {}
          }
        }
        // 2) Preguntar al backend por id
        const base = (import.meta.env.VITE_API_URL || '').replace(/\/$/, '');
        const r = await fetch(`${base}/users/${key}`);
        const d = await r.json().catch(() => ({}));
        if (r.ok && d) setProvName((d?.profile?.display_name || d?.username || 'Proveedor').trim());
      } catch {}
    })();
  }, [prefill.to]);

  // Cargar título del servicio (si viene desde "Contactar")
  useEffect(() => {
    (async () => {
      try {
        const sid = String(prefill.serviceId || '').trim();
        if (!sid) { setSvcTitle(""); return; }
        const base = (import.meta.env.VITE_API_URL || '').replace(/\/$/, '');
        const r = await fetch(`${base}/services/${sid}`);
        const d = await r.json().catch(() => ({}));
        if (r.ok && d) setSvcTitle(String(d.title || '').trim());
      } catch { setSvcTitle(""); }
    })();
  }, [prefill.serviceId]);

  // Formulario
  const [form, setForm] = useState({
    title: prefill.title || "",
    category: prefill.category || "",
    location: prefill.location || "",
    urgency: "normal",
    budget: prefill.budget || "",
    description: "",
  });
  const [err, setErr] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    setForm((f) => ({
      ...f,
      title: prefill.title || f.title,
      category: prefill.category || f.category,
      location: prefill.location || f.location,
      budget: prefill.budget || f.budget,
    }));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [prefill.title, prefill.category, prefill.location, prefill.budget]);

  function onChange(e) {
    const { name, value } = e.target;
    setForm((f) => ({ ...f, [name]: name === 'budget' ? value.replace(/[^\d]/g, '') : value }));
  }

  async function onSubmit(e) {
    e.preventDefault();
    setErr("");
    if (!form.title.trim() || !form.category) {
      setErr("Completa el título y la categoría.");
      return;
    }
    try {
      setLoading(true);
      const created = await lsCreateRequest({
        title: form.title.trim(),
        category: form.category,
        location: form.location.trim(),
        urgency: form.urgency,
        description: form.description.trim(),
        budget: Number(form.budget) || 0,
        fromService: prefill.serviceId || "",
        toProvider: prefill.to || "",
      });
      navigate(`/requests/${created.id}`, { replace: true });
    } catch {
      setErr("No se pudo crear la solicitud. Intenta nuevamente.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <section className="relative overflow-hidden">
      {/* Fondo */}
      <div className="absolute inset-0 -z-10 bg-gradient-to-br from-[#0A1540] via-[#0B1B4F] to-[#0D2266]" />
      <div className="pointer-events-none absolute -left-28 top-24 h-72 w-72 rounded-full bg-indigo-600/10 blur-3xl" />
      <div className="pointer-events-none absolute -right-20 bottom-10 h-80 w-80 rounded-full bg-sky-500/5 blur-3xl" />

      <div className="mx-auto min-h-[calc(100vh-5rem)] max-w-4xl px-4 py-10 text-white">
        <h1 className="mb-4 text-3xl font-extrabold text-white/95">Nueva solicitud</h1>

        {prefill.to && (
          <div className="mb-4 rounded-xl border border-white/15 bg-white/[0.06] px-4 py-3 text-sm text-indigo-100/90">
            Estás contactando al proveedor: <strong className="text-white/95">{provName || 'Proveedor'}</strong>
            {svcTitle ? <> (servicio {svcTitle})</> : null}.
            <br />
            Al publicar, tu solicitud será visible y el proveedor podrá ofertar.
          </div>
        )}

        {err && (
          <div className="mb-4 rounded-xl border border-rose-300/40 bg-rose-500/10 px-4 py-2 text-sm text-rose-100">{err}</div>
        )}

        <form onSubmit={onSubmit} className="rounded-3xl border border-white/10 bg-white/[0.05] p-6 shadow-2xl backdrop-blur">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="sm:col-span-2">
              <label className="mb-1 block text-sm text-indigo-200/85">Título</label>
              <input
                name="title"
                value={form.title}
                onChange={onChange}
                placeholder="Ej: Instalar lámparas en living"
                className="w-full rounded-xl border border-white/15 bg-white/[0.06] px-4 py-2.5 text-white placeholder-white/60 outline-none focus:ring-2 focus:ring-sky-300/40"
              />
            </div>
            <div>
              <label className="mb-1 block text-sm text-indigo-200/85">Categoría</label>
              <select
                name="category"
                value={form.category}
                onChange={onChange}
                className="w-full rounded-xl border border-white/15 bg-indigo-500/20 px-4 py-2.5 text-white outline-none focus:ring-2 focus:ring-sky-300/40"
              >
                <option value="">Selecciona una categoría</option>
                {CATEGORIES.map((c) => (
                  <option key={c} value={c}>{c}</option>
                ))}
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
            <div>
              <label className="mb-1 block text-sm text-indigo-200/85">Urgencia</label>
              <select
                name="urgency"
                value={form.urgency}
                onChange={onChange}
                className="w-full rounded-xl border border-white/15 bg-indigo-500/20 px-4 py-2.5 text-white outline-none focus:ring-2 focus:ring-sky-300/40"
              >
                <option value="baja">baja</option>
                <option value="normal">normal</option>
                <option value="alta">alta</option>
              </select>
            </div>
            <div>
              <label className="mb-1 block text-sm text-indigo-200/85">Presupuesto (CLP)</label>
              <input
                name="budget"
                inputMode="numeric"
                value={form.budget}
                onChange={onChange}
                placeholder="Ej: 120000"
                className="w-full rounded-xl border border-white/15 bg-white/[0.06] px-4 py-2.5 text-white placeholder-white/60 outline-none focus:ring-2 focus:ring-sky-300/40"
              />
            </div>
            <div className="sm:col-span-2">
              <label className="mb-1 block text-sm text-indigo-200/85">Descripción</label>
              <textarea
                name="description"
                rows={5}
                value={form.description}
                onChange={onChange}
                placeholder="Describe el trabajo, materiales, fotos (opcional), horarios, etc."
                className="w-full resize-y rounded-xl border border-white/15 bg-white/[0.06] px-4 py-2.5 text-white placeholder-white/60 outline-none focus:ring-2 focus:ring-sky-300/40"
              />
            </div>
          </div>

          <div className="mt-6 flex flex-wrap items-center gap-3">
            <button
              type="submit"
              disabled={loading}
              className="rounded-xl bg-indigo-500 px-5 py-2.5 font-semibold text-white shadow hover:bg-indigo-400 disabled:opacity-60"
            >
              {loading ? "Creando…" : "Publicar solicitud"}
            </button>
            <Link
              to="/requests"
              className="rounded-xl border border-white/30 px-5 py-2.5 font-semibold text-white hover:bg-white/5"
            >
              Cancelar
            </Link>
          </div>
        </form>

        <div className="pointer-events-none mx-auto mt-8 h-16 max-w-4xl rounded-full bg-gradient-to-r from-transparent via-white/5 to-transparent blur-2xl" />
      </div>
    </section>
  );
}
