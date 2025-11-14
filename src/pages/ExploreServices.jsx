// src/pages/ExploreServices.jsx
import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { lsGetServices, readProfile, currentUserKey } from "../api";
import RatingBadge from "../components/RatingBadge";

function CLP(n) {
  const v = Number(n || 0);
  return v.toLocaleString("es-CL", { style: "currency", currency: "CLP", maximumFractionDigits: 0 });
}

// Renderiza saltos de línea ("\n") como <br/>
function renderMultiline(text) {
  const parts = String(text || "").split(/\r?\n/);
  return parts.map((p, i) => (
    <span key={i}>
      {p}
      {i < parts.length - 1 ? <br /> : null}
    </span>
  ));
}

export default function ExploreServices() {
  const [all, setAll] = useState([]);
  const me = currentUserKey?.() || "guest";
  const role = readProfile?.()?.role || "";
  const [q, setQ] = useState("");
  const [category, setCategory] = useState("Todas");
  const [loc, setLoc] = useState("");

  useEffect(() => {
    (async () => {
      try { setAll(await lsGetServices()); } catch { setAll([]); }
    })();
  }, []);

  const categories = useMemo(() => {
    const set = new Set(all.map((s) => s.category).filter(Boolean));
    return ["Todas", ...Array.from(set)];
  }, [all]);

  const filtered = useMemo(() => {
    let arr = all.filter((s) => s.status !== "pausado");
    if (q.trim()) {
      const s = q.trim().toLowerCase();
      arr = arr.filter(
        (x) => (x.title || "").toLowerCase().includes(s) || (x.description || "").toLowerCase().includes(s)
      );
    }
    if (category !== "Todas") arr = arr.filter((x) => (x.category || "") === category);
    if (loc.trim()) {
      const s = loc.trim().toLowerCase();
      arr = arr.filter((x) => (x.location || "").toLowerCase().includes(s));
    }
    return arr;
  }, [all, q, category, loc]);

  return (
    <section className="relative overflow-hidden">
      {/* Fondo oscuro */}
      <div className="absolute inset-0 -z-10 bg-gradient-to-br from-[#0A1540] via-[#0B1B4F] to-[#0D2266]" />
      <div className="pointer-events-none absolute -left-28 top-24 h-72 w-72 rounded-full bg-indigo-600/10 blur-3xl" />
      <div className="pointer-events-none absolute -right-20 bottom-10 h-80 w-80 rounded-full bg-sky-500/5 blur-3xl" />

      <div className="mx-auto min-h-[calc(100vh-5rem)] max-w-6xl px-4 py-10 text-white">
        <div className="mb-6">
          <h1 className="text-3xl font-extrabold text-white/95">Explorar servicios</h1>
          <p className="mt-1 text-sm text-indigo-200/85">Encuentra proveedores y revisa su reputación.</p>
        </div>

        {/* Filtros */}
        <div className="mb-6 rounded-2xl border border-white/10 bg-white/[0.05] p-4 shadow-xl backdrop-blur">
          <div className="grid gap-3 md:grid-cols-6">
            <input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Buscar servicio"
              className="md:col-span-2 w-full rounded-lg border border-white/15 bg-white/[0.06] px-3 py-2 text-white placeholder-white/60 outline-none focus:ring-2 focus:ring-sky-300/40"
            />
            <select
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              className="rounded-lg border border-white/15 bg-indigo-500/20 px-3 py-2 text-white outline-none focus:ring-2 focus:ring-sky-300/40"
            >
              {categories.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
            <input
              value={loc}
              onChange={(e) => setLoc(e.target.value)}
              placeholder="Ubicación"
              className="w-full rounded-lg border border-white/15 bg-white/[0.06] px-3 py-2 text-white placeholder-white/60 outline-none focus:ring-2 focus:ring-sky-300/40"
            />
          </div>
        </div>

        {/* Lista */}
        {filtered.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-white/20 p-10 text-center text-indigo-100/90">
            No encontramos servicios con esos filtros.
          </div>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {filtered.map((s) => {
              const q = new URLSearchParams({
                title: s.title || "",
                category: s.category || "",
                location: s.location || "",
                priceFrom: String(s.priceFrom || ""),
                to: s.ownerId || s.owner || "",
                serviceId: s.id || "",
              }).toString();
              const ownerId = (s.ownerId || (typeof s.owner === "object" ? s.owner?.id : s.owner) || "").toString();
              const isOwner = ownerId && ownerId === me;
              return (
                <article
                  key={s.id}
                  className="group rounded-2xl border border-white/10 bg-white/[0.05] p-5 shadow-xl backdrop-blur hover:bg-white/[0.07]"
                >
                  <div className="mb-2 flex items-center justify-between gap-3">
                    <span className="rounded-full border border-white/15 bg-white/[0.06] px-2 py-0.5 text-[11px] font-semibold text-indigo-100/85">
                      {s.category || "General"}
                    </span>
                    <span className="text-sm font-extrabold text-white/95">{s.priceFrom ? CLP(s.priceFrom) : "-"}</span>
                  </div>

                  <h3 className="truncate text-lg font-extrabold text-white/95">{s.title}</h3>
                  <div className="mt-1 text-sm text-indigo-200/85">{s.location || "-"}</div>

                  {/* Reputación del proveedor (global por usuario) */}
                  <div className="mt-2">
                    {(() => {
                      const owner = (s.ownerId || (typeof s.owner === "object" ? s.owner?.id : s.owner) || "").toString();
                      return owner ? (
                        <RatingBadge userId={owner} />
                      ) : (
                        <span className="inline-flex items-center rounded-full border border-white/15 bg-white/[0.06] px-2.5 py-1 text-xs text-indigo-100/85">Sin calificaciones</span>
                      );
                    })()}
                  </div>

                  {s.description && (
                    <p className="mt-3 line-clamp-3 text-sm text-white/90">{renderMultiline(s.description)}</p>
                  )}

                  {/* CTAs */}
                  <div className="mt-4 flex items-center gap-2">
                    <Link
                      to={`/service/${s.id}`}
                      className="inline-flex items-center gap-2 rounded-xl border border-white/20 px-4 py-2.5 text-sm font-semibold text-white hover:bg-white/10"
                      title="Ver detalle del servicio"
                    >
                      Ver detalle
                    </Link>
                    {role === 'client' && !isOwner && (

                      <Link

                        to={`/requests/new?${q}`}

                        className="inline-flex items-center gap-2 rounded-xl bg-indigo-500 px-4 py-2.5 text-sm font-semibold text-white shadow hover:bg-indigo-400"

                        title="Crear solicitud para contactar a este proveedor"

                      >

                        Contactar

                        <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2">

                          <path d="M5 12h14M12 5l7 7-7 7" strokeLinecap="round" strokeLinejoin="round" />

                        </svg>

                      </Link>

                    )}
                  </div>
                </article>
              );
            })}
          </div>
        )}
      </div>
    </section>
  );
}








