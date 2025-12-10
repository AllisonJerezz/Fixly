// src/pages/Requests.jsx (UTF-8)
import { Link } from "react-router-dom";
import { useMemo, useState, useEffect } from "react";
import { lsGetRequests, readProfile, isOwner } from "../api";
import StatusBadge from "../components/StatusBadge";
import Empty from "../components/Empty";
import { SkeletonCard } from "../components/Skeletons";

function CLP(n) {
  const v = Number(n || 0);
  return v.toLocaleString("es-CL", { style: "currency", currency: "CLP", maximumFractionDigits: 0 });
}

function RequestCard({ item, isClientView }) {
  function resolveName(key){
    const k = String(key||'').trim();
    if (!k) return '';
    try {
      const me = readProfile?.();
      if (me && (String(me.id) === k || String(me.username||'').toLowerCase() === k.toLowerCase())) {
        return me.displayName || me.username || k;
      }
    } catch {}
    if (k.includes('-')) {
      try {
        for (let i=0;i<localStorage.length;i++){
          const kk = localStorage.key(i);
          if (kk && kk.startsWith('profile:')){
            try{
              const p = JSON.parse(localStorage.getItem(kk) || 'null');
              if (p && String(p.id) === k) return p.displayName || p.username || k;
            }catch{}
          }
        }
      } catch {}
      return 'Proveedor';
    }
    try {
      const p = JSON.parse(localStorage.getItem(`profile:${k.toLowerCase()}`) || 'null');
      return p?.displayName || p?.username || k;
    } catch { return k; }
  }
  const offers = Array.isArray(item.offers) ? item.offers : [];
  const count = item?._count?.offers ?? offers.length;
  const accepted = item.acceptedOfferId
    ? offers.find((o) => o.id === item.acceptedOfferId)
    : offers.find((o) => String(o.status || "").toLowerCase() === "accepted") || null;
  const acceptedPrice = accepted?.price || item.acceptedPrice || null;
  const providerName = (accepted?.providerName || item.acceptedProviderName) ?? (accepted?.providerId ? resolveName(accepted.providerId) : "");

  return (
    <Link
      to={`/requests/${item.id}`}
      className="group block rounded-2xl border border-white/10 bg-white/[0.05] p-4 shadow-xl backdrop-blur transition hover:bg-white/[0.07] hover:shadow-2xl"
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h3 className="truncate text-lg font-extrabold text-white/95">{item.title}</h3>
          <div className="mt-2 flex flex-wrap items-center gap-2">
            <StatusBadge status={item.status || "pendiente"} />
            <span className="inline-flex items-center gap-1 rounded-full border border-white/10 bg-white/[0.06] px-2 py-0.5 text-[11px] font-semibold text-indigo-100/90">
              <svg viewBox="0 0 24 24" className="h-3.5 w-3.5">
                <path d="M3 6h18M3 12h18M3 18h18" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
              </svg>
              {count} {count === 1 ? "oferta" : "ofertas"}
            </span>
            {accepted && (
              <span className="inline-flex items-center gap-1 rounded-full border border-emerald-300/40 bg-emerald-400/10 px-2 py-0.5 text-[11px] font-semibold text-emerald-200">
                <svg viewBox="0 0 24 24" className="h-3.5 w-3.5">
                  <path d="m5 13 4 4L19 7" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
                Oferta aceptada
              </span>
            )}
          </div>
        </div>
        {accepted && (
          <div className="shrink-0 rounded-lg border border-emerald-300/40 bg-emerald-400/10 px-3 py-2 text-right">
            <div className="text-[10px] uppercase tracking-wide text-emerald-200">Ganador</div>
            {acceptedPrice && <div className="text-sm font-bold text-emerald-100">{CLP(acceptedPrice)}</div>}
          </div>
        )}
      </div>

      <div className="mt-3 grid gap-2 sm:grid-cols-3">
        <div className="rounded-lg border border-white/10 bg-white/[0.04] p-2">
          <div className="text-[10px] text-indigo-200/80">CategorÃ­a</div>
          <div className="text-sm font-semibold text-white/95">{item.category}</div>
        </div>
        <div className="rounded-lg border border-white/10 bg-white/[0.04] p-2">
          <div className="text-[10px] text-indigo-200/80">UbicaciÃ³n</div>
          <div className="text-sm font-semibold text-white/90">{item.location || ""}</div>
        </div>
        <div className="rounded-lg border border-white/10 bg-white/[0.04] p-2">
          <div className="text-[10px] text-indigo-200/80">Urgencia</div>
          <div className="text-sm font-semibold capitalize text-white/90">{item.urgency || "normal"}</div>
        </div>
      </div>

      <div className="mt-3 flex flex-wrap items-center justify-between gap-3">
        <div className="text-[11px] text-indigo-200/70">Creado: {new Date(item.created_at || item.createdAt || Date.now()).toLocaleString()}</div>
        <div className="text-[11px] text-indigo-100/95">
          {accepted
            ? (isClientView
                ? (`Proveedor aceptado${providerName && providerName !== 'Proveedor' ? `: ${providerName}` : ''}`)
                : `Estado: en progreso`)
            : count > 0
            ? (isClientView ? "Tienes ofertas para revisar" : "AÃºn en concurso")
            : "Sin ofertas aÃºn"}
        </div>
      </div>
    </Link>
  );
}

export default function Requests() {
  const profile = readProfile?.();
  const role = profile?.role || "";

  const [all, setAll] = useState([]);
  useEffect(() => {
    (async () => { try { setAll(await lsGetRequests()); } catch { setAll([]); } })();
  }, [role]);

  const norm = (s) => String(s || "").toLowerCase().replace(/_/g, " ");
  const baseList = useMemo(() => {
    if (role === "client") return all.filter((r) => isOwner(r));
    if (role === "provider") return all.filter((r) => !isOwner(r));
    return all;
  }, [all, role]);

  const categoryOptions = useMemo(() => {
    const set = new Set(baseList.map((x) => x.category).filter(Boolean));
    return ["Todas", ...Array.from(set)];
  }, [baseList]);

  const statusOptions = ["Todos", "pendiente", "en progreso", "completado", "cancelado"];
  const urgencyOptions = ["Todas", "baja", "normal", "alta"];

  const [q, setQ] = useState("");
  const [status, setStatus] = useState("Todos");
  const [category, setCategory] = useState("Todas");
  const [urgency, setUrgency] = useState("Todas");
  const [loc, setLoc] = useState("");
  const [onlyWithOffers, setOnlyWithOffers] = useState(false);
  const [onlyAccepted, setOnlyAccepted] = useState(false);
  const [sortBy, setSortBy] = useState("newest");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    setLoading(true);
    const h = setTimeout(() => setLoading(false), 200);
    return () => clearTimeout(h);
  }, [q, status, category, urgency, loc, onlyWithOffers, onlyAccepted, sortBy]);

  const filtered = useMemo(() => {
    let arr = [...baseList];
    if (q.trim()) {
      const s = q.trim().toLowerCase();
      arr = arr.filter((r) => (r.title || "").toLowerCase().includes(s) || (r.description || "").toLowerCase().includes(s));
    }
    if (status !== "Todos") arr = arr.filter((r) => norm(r.status || "pendiente") === norm(status));
    if (category !== "Todas") arr = arr.filter((r) => (r.category || "") === category);
    if (urgency !== "Todas") arr = arr.filter((r) => (r.urgency || "normal") === urgency);
    if (loc.trim()) {
      const s = loc.trim().toLowerCase();
      arr = arr.filter((r) => (r.location || "").toLowerCase().includes(s));
    }
    if (onlyWithOffers) arr = arr.filter((r) => (r._count?.offers || (r.offers?.length || 0)) > 0);
    if (onlyAccepted) arr = arr.filter((r) => !!r.acceptedOfferId);

    arr.sort((a, b) => {
      const offersA = a._count?.offers || (a.offers?.length || 0);
      const offersB = b._count?.offers || (b.offers?.length || 0);
      if (sortBy === "newest") return new Date(b.created_at || b.createdAt) - new Date(a.created_at || a.createdAt);
      if (sortBy === "oldest") return new Date(a.created_at || a.createdAt) - new Date(b.created_at || b.createdAt);
      if (sortBy === "mostOffers") return offersB - offersA;
      if (sortBy === "leastOffers") return offersA - offersB;
      return 0;
    });
    return arr;
  }, [baseList, q, status, category, urgency, loc, onlyWithOffers, onlyAccepted, sortBy]);

  const title = role === "client" ? "Mis solicitudes" : role === "provider" ? "Solicitudes disponibles" : "Solicitudes";

  return (
    <section className="relative overflow-hidden">
      <div className="absolute inset-0 -z-10 bg-gradient-to-br from-[#0A1540] via-[#0B1B4F] to-[#0D2266]" />
      <div className="pointer-events-none absolute -left-28 top-24 h-72 w-72 rounded-full bg-indigo-600/10 blur-3xl" />
      <div className="pointer-events-none absolute -right-20 bottom-10 h-80 w-80 rounded-full bg-sky-500/5 blur-3xl" />

      <div className="mx-auto min-h-[calc(100vh-5rem)] max-w-6xl px-4 py-10 text-white">
        <div className="mb-6 flex items-center justify-between gap-3">
          <h1 className="text-3xl font-extrabold text-white/95">{title}</h1>
          {role === "client" && (
            <Link to="/requests/new" className="rounded-xl bg-indigo-500 px-4 py-2.5 font-semibold text-white shadow hover:bg-indigo-400">
              Crear solicitud
            </Link>
          )}
        </div>

        {/* Filtros */}
        <div className="mb-6 rounded-2xl border border-white/10 bg-white/[0.05] p-4 shadow-xl backdrop-blur">
          <div className="mb-3 text-sm font-bold text-indigo-100/90">Filtrar por</div>
          <div className="grid gap-3 md:grid-cols-6">
            <input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Buscar (tÃ­tulo o descripciÃ³n)"
              className="md:col-span-2 w-full rounded-lg border border-white/15 bg-white/[0.06] px-3 py-2 text-white placeholder-white/60 outline-none focus:ring-2 focus:ring-sky-300/40"
            />
            <div>
              <label className="mb-1 block text-xs text-indigo-200/80">Estado</label>
              <select value={status} onChange={(e) => setStatus(e.target.value)} className="w-full rounded-lg border border-white/15 bg-indigo-500/20 px-3 py-2 text-white outline-none focus:ring-2 focus:ring-sky-300/40 relative z-20">
                {statusOptions.map((opt) => (
                  <option key={opt} value={opt}>{opt}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="mb-1 block text-xs text-indigo-200/80">CategorÃ­a</label>
              <select value={category} onChange={(e) => setCategory(e.target.value)} className="w-full rounded-lg border border-white/15 bg-indigo-500/20 px-3 py-2 textç™½ outline-none focus:ring-2 focus:ring-sky-300/40">
                {categoryOptions.map((opt) => (
                  <option key={opt} value={opt}>{opt}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="mb-1 block text-xs text-indigo-200/80">Criticidad</label>
              <select value={urgency} onChange={(e) => setUrgency(e.target.value)} className="w-full rounded-lg border border-white/15 bg-indigo-500/20 px-3 py-2 text-white outline-none focus:ring-2 focus:ring-sky-300/40 relative z-20">
                {urgencyOptions.map((opt) => (
                  <option key={opt} value={opt}>{opt}</option>
                ))}
              </select>
            </div>
            <input
              value={loc}
              onChange={(e) => setLoc(e.target.value)}
              placeholder="UbicaciÃ³n"
              className="w-full rounded-lg border border-white/15 bg-white/[0.06] px-3 py-2 text-white placeholder-white/60 outline-none focus:ring-2 focus:ring-sky-300/40"
            />
            <div className="md:col-span-2 flex items-center gap-4 text-sm text-indigo-100/90">
              <label className="inline-flex items-center gap-2 select-none">
                <input type="checkbox" checked={onlyWithOffers} onChange={(e) => setOnlyWithOffers(e.target.checked)} className="accent-indigo-400" />
                Solo con ofertas
              </label>
              <label className="inline-flex items-center gap-2 select-none">
                <input type="checkbox" checked={onlyAccepted} onChange={(e) => setOnlyAccepted(e.target.checked)} className="accent-indigo-400" />
                Con oferta aceptada
              </label>
            </div>
            <div className="md:col-span-2">
              <label className="mb-1 block text-xs text-indigo-200/80">Ordenar</label>
              <select value={sortBy} onChange={(e) => setSortBy(e.target.value)} className="w-full rounded-lg border border-white/15 bg-indigo-500/20 px-3 py-2 text-white outline-none focus:ring-2 focus:ring-sky-300/40 relative z-20">
                <option value="newest">MÃ¡s recientes</option>
                <option value="oldest">MÃ¡s antiguas</option>
                <option value="mostOffers">MÃ¡s ofertas</option>
                <option value="leastOffers">Menos ofertas</option>
              </select>
            </div>
          </div>
        </div>

        {/* Lista */}
        {loading ? (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {Array.from({ length: 6 }).map((_, i) => (
              <SkeletonCard key={i} />
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <Empty
            title={role === "client" ? "Sin resultados" : role === "provider" ? "Nada por aquÃ­" : "No hay solicitudes"}
            subtitle={
              role === "client"
                ? "Prueba ajustando los filtros o crea una nueva solicitud."
                : role === "provider"
                ? "Cambia filtros o vuelve mÃ¡s tarde."
                : "Cuando existan solicitudes, aparecerÃ¡n aquÃ­."
            }
            action={
              role === "client" ? (
                <Link to="/requests/new" className="rounded-xl bg-indigo-500 px-4 py-2.5 font-semibold text-white shadow hover:bg-indigo-400">
                  Crear solicitud
                </Link>
              ) : null
            }
          />
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {filtered.map((item) => (
              <RequestCard key={item.id} item={item} isClientView={role === "client"} />
            ))}
          </div>
        )}
      </div>
    </section>
  );
}

