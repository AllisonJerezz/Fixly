// src/pages/ServiceNew.jsx
import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { lsCreateService } from "../api";

function Field({ label, hint, children }){
  return (
    <div>
      <label className="mb-1 block text-sm text-indigo-200/85">{label}</label>
      {children}
      {hint && <p className="mt-1 text-xs text-indigo-200/70">{hint}</p>}
    </div>
  );
}

export default function ServiceNew(){
  const nav = useNavigate();
  const [form, setForm] = useState({
    title: "",
    category: "",
    customCategory: "",
    priceFrom: "",
    location: "",
    description: ""
  });
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState("");

  function onChange(e){
    const { name, value } = e.target;
    setForm(f => ({ ...f, [name]: value }));
  }

  async function submit(e){
    e.preventDefault();
    setErr("");
    const hasCustom = form.category === "Otro";
    const chosenCat = hasCustom ? (form.customCategory || "").trim() : (form.category || "").trim();
    if(!form.title.trim() || !chosenCat){
      setErr("Completa título y categoría (si eliges 'Otro', escribe la categoría).");
      return;
    }
    try{
      setLoading(true);
      const created = await lsCreateService({
        title: form.title.trim(),
        category: hasCustom ? "" : chosenCat,
        customCategory: hasCustom ? chosenCat : "",
        priceFrom: form.priceFrom ? Number(form.priceFrom) : 0,
        location: form.location,
        description: form.description
      });
      nav("/services", { replace: true, state: { createdId: created.id }});
    }catch{
      setErr("No se pudo publicar el servicio. Intenta nuevamente.");
    }finally{
      setLoading(false);
    }
  }

  return (
    <section className="relative overflow-hidden">
      <div className="absolute inset-0 -z-10 bg-gradient-to-br from-[#0A1540] via-[#0B1B4F] to-[#0D2266]" />
      <div className="pointer-events-none absolute -left-28 top-24 h-72 w-72 rounded-full bg-indigo-600/10 blur-3xl" />
      <div className="pointer-events-none absolute -right-20 bottom-10 h-80 w-80 rounded-full bg-sky-500/5 blur-3xl" />

      <div className="mx-auto min-h-[calc(100vh-5rem)] max-w-3xl px-4 py-10 text-white">
        <h1 className="mb-4 text-3xl font-extrabold text-white/95">Publicar servicio</h1>

        <div className="rounded-3xl border border-white/10 bg-white/[0.05] p-8 shadow-2xl backdrop-blur">
          {err && (
            <div className="mb-5 rounded-xl border border-rose-300/40 bg-rose-500/10 px-4 py-2 text-sm text-rose-100">
              {err}
            </div>
          )}

          <form onSubmit={submit} className="grid gap-4">
            <Field label="Título" hint="Ej: Instalación de enchufes y canalización">
              <input
                name="title"
                value={form.title}
                onChange={onChange}
                placeholder="Nombre del servicio"
                className="w-full rounded-xl border border-white/15 bg-white/[0.06] px-4 py-2.5 text-white placeholder-white/60 outline-none focus:ring-2 focus:ring-sky-300/40"
              />
            </Field>

            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Categoría">
                <select
                  name="category"
                  value={form.category}
                  onChange={onChange}
                  className="w-full rounded-xl border border-white/15 bg-indigo-500/20 px-4 py-2.5 text-white outline-none focus:ring-2 focus:ring-sky-300/40"
                >
                  <option value="">Selecciona una categoría</option>
                  <option value="Plomería">Plomería</option>
                  <option value="Electricidad">Electricidad</option>
                  <option value="Gasfitería">Gasfitería</option>
                  <option value="Pintura">Pintura</option>
                  <option value="Carpintería">Carpintería</option>
                  <option value="Cerrajería">Cerrajería</option>
                  <option value="Aseo">Aseo</option>
                  <option value="Mudanzas">Mudanzas</option>
                  <option value="Otro">Otro</option>
                </select>
                {form.category === "Otro" && (
                  <input
                    name="customCategory"
                    value={form.customCategory}
                    onChange={onChange}
                    placeholder="Escribe tu categoría"
                    className="mt-2 w-full rounded-xl border border-white/15 bg-white/[0.06] px-4 py-2.5 text-white placeholder-white/60 outline-none focus:ring-2 focus:ring-sky-300/40"
                  />
                )}
              </Field>

              <Field label="Precio desde (CLP)">
                <input
                  name="priceFrom"
                  type="number"
                  min="0"
                  inputMode="numeric"
                  value={form.priceFrom}
                  onChange={onChange}
                  placeholder="Ej: 30000"
                  className="w-full rounded-xl border border-white/15 bg-indigo-500/20 px-4 py-2.5 text-white placeholder-white/60 outline-none focus:ring-2 focus:ring-sky-300/40"
                />
              </Field>
            </div>

            <Field label="Ubicación">
              <input
                name="location"
                value={form.location}
                onChange={onChange}
                placeholder="Comuna / ciudad"
                className="w-full rounded-xl border border-white/15 bg-white/[0.06] px-4 py-2.5 text-white placeholder-white/60 outline-none focus:ring-2 focus:ring-sky-300/40"
              />
            </Field>

            <Field label="Descripción" hint="Detalla qué incluye, tiempos, garantías, etc.">
              <textarea
                name="description"
                rows={5}
                value={form.description}
                onChange={onChange}
                placeholder="Describe tu servicio…"
                className="w-full resize-y rounded-xl border border-white/15 bg-white/[0.06] px-4 py-3 text-white placeholder-white/60 outline-none focus:ring-2 focus:ring-sky-300/40"
              />
            </Field>

            <div className="mt-2 flex flex-wrap gap-3">
              <button
                type="submit"
                disabled={loading}
                className="rounded-xl bg-indigo-500 px-5 py-2.5 font-semibold text-white shadow hover:bg-indigo-400 disabled:opacity-60"
              >
                {loading ? "Publicando..." : "Publicar servicio"}
              </button>
              <Link to="/services" className="rounded-xl border border-white/30 px-5 py-2.5 font-semibold text-white hover:bg-white/5">
                Cancelar
              </Link>
            </div>
          </form>
        </div>

        <div className="pointer-events-none mx-auto mt-8 h-16 max-w-3xl rounded-full bg-gradient-to-r from-transparent via-white/5 to-transparent blur-2xl" />
      </div>
    </section>
  );
}
