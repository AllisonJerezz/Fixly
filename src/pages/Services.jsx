// src/pages/Services.jsx
import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { currentUserKey, lsGetMyServices } from "../api";
import RatingBadge from "../components/RatingBadge";

function CLP(n) {
  const v = Number(n || 0);
  return v.toLocaleString("es-CL", { style: "currency", currency: "CLP", maximumFractionDigits: 0 });
}

export default function Services() {
  const me = currentUserKey();
  const [list, setList] = useState([]);
        
  useEffect(() => {
    (async () => { try { setList(await lsGetMyServices()); } catch { setList([]); } })();
  }, []);

  const active = useMemo(() => list.filter(s => s.status !== "pausado").length, [list]);

  return (
    <section className="relative overflow-hidden">
      {/* Fondo oscuro */}
      <div className="absolute inset-0 -z-10 bg-gradient-to-br from-[#0A1540] via-[#0B1B4F] to-[#0D2266]" />
      <div className="pointer-events-none absolute -left-28 top-24 h-72 w-72 rounded-full bg-indigo-600/10 blur-3xl" />
      <div className="pointer-events-none absolute -right-20 bottom-10 h-80 w-80 rounded-full bg-sky-500/5 blur-3xl" />

      <div className="mx-auto min-h-[calc(100vh-5rem)] max-w-6xl px-4 py-10 text-white">
        <div className="mb-6 flex items-center justify-between gap-3">
          <div>
            <h1 className="text-3xl font-extrabold text-white/95">Mis servicios</h1>
            <p className="mt-1 text-sm text-indigo-200/85">Activos: <strong>{active}</strong> Total: <strong>{list.length}</strong></p>
          </div>
          <div className="flex items-center gap-2">
            <RatingBadge userId={me} />
            <Link
              to="/services/new"
              className="rounded-xl bg-indigo-500 px-4 py-2.5 font-semibold text-white shadow hover:bg-indigo-400"
            >
              Publicar servicio
            </Link>
          </div>
        </div>

        {list.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-white/20 p-10 text-center text-indigo-100/90">
            Aún no has publicado servicios. ¡Comienza con tu primer aviso!
            <div className="mt-4">
              <Link to="/services/new" className="rounded-xl bg-white/10 px-4 py-2.5 font-semibold text-white hover:bg-white/15 border border-white/20">
                Crear servicio
              </Link>
            </div>
          </div>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {list.map((s) => (
              <article key={s.id} className="group rounded-2xl border border-white/10 bg-white/[0.05] p-5 shadow-xl backdrop-blur hover:bg-white/[0.07]">
                <div className="mb-2 flex items-center justify-between gap-3">
                  <span className={`rounded-full px-2 py-0.5 text-[11px] font-semibold
                    ${s.status === "activo" ? "border border-emerald-300/40 bg-emerald-400/10 text-emerald-200" : "border border-white/15 bg-white/[0.06] text-indigo-100/85"}`}>
                    {s.status}
                  </span>
                  <span className="text-sm font-extrabold text-white/95">{s.priceFrom ? CLP(s.priceFrom) : "-"}</span>
                </div>
                <h3 className="truncate text-lg font-extrabold text-white/95">{s.title}</h3>
                <div className="mt-1 text-sm text-indigo-200/85">{s.category}</div>
                <div className="mt-1 text-sm text-indigo-200/70">{s.location || "-"}</div>
                {/* Reputación del proveedor: siempre la misma para todos los servicios del mismo usuario */}
                <div className="mt-2">
                  <RatingBadge userId={me} />
                </div>
                {s.description && (
                  <p className="mt-3 line-clamp-3 text-sm text-white/90">{s.description}</p>
                )}
                {/* Acción única: Ver detalle */}
                <div className="mt-4">
                  <Link
                    to={`/service/${s.id}`}
                    className="rounded-xl border border-white/30 px-4 py-2.5 text-sm font-semibold text-white hover:bg-white/5"
                  >
                    Ver detalle
                  </Link>
                </div>
              </article>
            ))}
          </div>
        )}
      </div>
    </section>
  );
}
