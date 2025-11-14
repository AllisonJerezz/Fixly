// src/pages/Home.jsx
import { Link } from "react-router-dom";
import { useMemo, useEffect, useState } from "react";
import { lsGetRequests, readProfile, isOwner, currentUserKey } from "../api";
import StatusBadge from "../components/StatusBadge";
import AvatarPicker from "../components/AvatarPicker";

/* ------------ Helpers ------------ */
function CLP(n) {
  const v = Number(n || 0);
  return v.toLocaleString("es-CL", { style: "currency", currency: "CLP", maximumFractionDigits: 0 });
}

function MiniCard({ item, isClientView }) {
  const count = item?._count?.offers ?? (Array.isArray(item.offers) ? item.offers.length : 0);
  const accepted = item.acceptedOfferId ? { id: item.acceptedOfferId, price: item.acceptedPrice || null, providerId: item.acceptedProviderId || "", providerName: item.acceptedProviderName || "" } : null;
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
  const providerName = accepted?.providerName || (accepted?.providerId ? resolveName(accepted.providerId) : "");

  return (
    <Link
      to={`/requests/${item.id}`}
      className="group block rounded-2xl border border-white/10 bg-white/[0.05] p-4 shadow-xl backdrop-blur transition hover:bg-white/[0.07] hover:shadow-2xl"
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          
          <h3 className="truncate text-base font-extrabold text-white/95">
            {item.title}
          </h3>

          <div className="mt-2 flex flex-wrap items-center gap-2">
            <StatusBadge status={item.status || "pendiente"} />

            <span className="inline-flex items-center gap-1 rounded-full border border-white/10 bg-white/[0.06] px-2 py-0.5 text-[11px] font-semibold text-indigo-100/90">
              <svg viewBox="0 0 24 24" className="h-3.5 w-3.5">
                <path d="M3 6h18M3 12h18M3 18h18" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
              </svg>
              {count} {count === 1 ? "oferta" : "ofertas"}
            </span>

            {accepted && (
              <span className="inline-flex items-center gap-1 rounded-full border border-emerald-300/40 bg-emerald-400/10 px-2 py-0.5 text-[11px] font-semibold text-emerald-200">
                <svg viewBox="0 0 24 24" className="h-3.5 w-3.5">
                  <path d="m5 13 4 4L19 7" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
                Oferta aceptada
              </span>
            )}
          </div>
        </div>

        {accepted && (
          <div className="shrink-0 rounded-lg border border-emerald-300/40 bg-emerald-400/10 px-3 py-2 text-right">
            <div className="text-[10px] uppercase tracking-wide text-emerald-200">Ganador</div>
            {accepted?.price && <div className="text-sm font-bold text-emerald-100">{CLP(accepted.price)}</div>}
          </div>
        )}
      </div>

      <div className="mt-3 grid gap-2 sm:grid-cols-3">
        <div className="rounded-lg border border-white/10 bg-white/[0.04] p-2">
          <div className="text-[10px] text-indigo-200/80">Categoría</div>
          <div className="text-sm font-semibold text-white/95">{item.category}</div>
        </div>
        <div className="rounded-lg border border-white/10 bg-white/[0.04] p-2">
          <div className="text-[10px] text-indigo-200/80">Ubicación</div>
          <div className="text-sm font-semibold text-white/90">{item.location || "—"}</div>
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
            : (count > 0
                ? (isClientView ? "Tienes ofertas para revisar" : "Aún en concurso")
                : "Sin ofertas aún")}
        </div>
      </div>
    </Link>
  );
}

/* ------------ Home ------------ */
export default function Home() {
  const profile = readProfile?.();
  const role = profile?.role || ""; // "client" | "provider"
  const displayName = profile?.displayName || "";
  const me = currentUserKey?.() || "guest";

  // Todas las solicitudes (desde API)
  const [all, setAll] = useState([]);
  useEffect(() => { (async () => { try { setAll(await lsGetRequests()); } catch { setAll([]); } })(); }, [role]);

  // Listas por rol
  const mine = useMemo(() => all.filter(r => isOwner(r)), [all]);
  const available = useMemo(() => all.filter(r => !isOwner(r)), [all]);

  // Métricas rápidas
  const metrics = useMemo(() => {
    if (role === "client") {
      const active = mine.filter(r => { const n = String(r.status||'').toLowerCase().replace(/_/g,' '); return n === 'pendiente' || n === 'en progreso'; }).length;
      const offersReceived = mine.reduce((acc, r) => acc + (Array.isArray(r.offers) ? r.offers.length : 0), 0);
      const accepted = mine.filter(r => !!r.acceptedOfferId).length;
      return { active, offersReceived, accepted };
    }
    if (role === "provider") {
      const activeAvail = available.filter(r => { const n = String(r.status||'').toLowerCase().replace(/_/g,' '); return n === 'pendiente' || n === 'en progreso'; }).length;
      const myOffersSent = all.reduce((acc, r) => {
        const offers = Array.isArray(r.offers) ? r.offers : [];
        return acc + offers.filter(o => o.providerId === me).length;
      }, 0);
      const myWins = all.reduce((acc, r) => {
        if (!r.acceptedOfferId) return acc;
        const offers = Array.isArray(r.offers) ? r.offers : [];
        const winner = offers.find(o => o.id === r.acceptedOfferId);
        return acc + (winner?.providerId === me ? 1 : 0);
      }, 0);
      return { activeAvail, myOffersSent, myWins };
    }
    return { active: all.length, offersReceived: 0, accepted: 0 };
  }, [role, mine, available, all, me]);

  // Últimas 3 según rol
  const last3 = useMemo(() => {
    const list = role === "provider" ? available : mine;
    return [...list].sort((a, b) => new Date(b.created_at || b.createdAt) - new Date(a.created_at || a.createdAt)).slice(0, 3);
  }, [mine, available, role]);

  // Urgentes (proveedor): alta + no propias
  const urgentForProvider = useMemo(() => {
    if (role !== "provider") return [];
    const list = available.filter(r => (r.urgency || "normal") === "alta");
    return [...list].sort((a, b) => new Date(b.created_at || b.createdAt) - new Date(a.created_at || a.createdAt)).slice(0, 3);
  }, [available, role]);

  return (
    <section className="relative overflow-hidden">
      {/* Fondo degradé + halos */}
      <div className="absolute inset-0 -z-10 bg-gradient-to-br from-[#0A1540] via-[#0B1B4F] to-[#0D2266]" />
      <div className="pointer-events-none absolute -left-28 top-24 h-72 w-72 rounded-full bg-indigo-600/10 blur-3xl" />
      <div className="pointer-events-none absolute -right-20 bottom-10 h-80 w-80 rounded-full bg-sky-500/5 blur-3xl" />

      <div className="mx-auto max-w-6xl px-4 py-10 text-white">
        {/* ---------- HERO ---------- */}
        <div className="relative overflow-hidden rounded-3xl border border-white/10 bg-white/[0.05] p-8 text-white shadow-2xl backdrop-blur">
          <div className="flex flex-wrap items-center justify-between gap-6">
            <div className="min-w-0">
              <h1 className="text-3xl font-extrabold leading-tight text-white/95">
                {role === "client" && <>Hola{displayName ? `, ${displayName}` : ""} 👋<br /> ¿Listo para solicitar un servicio?</>}
                {role === "provider" && <>¡Bienvenido{displayName ? `, ${displayName}` : ""}! 🔧<br /> Encuentra trabajos cerca de ti</>}
                {!role && <>Bienvenido a Fixly 👋<br /> Conecta clientes y proveedores al instante</>}
              </h1>
              <p className="mt-2 max-w-2xl text-indigo-200/90">
                {role === "client"
                  ? "Crea una solicitud, recibe ofertas de proveedores y elige la mejor."
                  : role === "provider"
                    ? "Explora solicitudes disponibles y envía ofertas competitivas."
                    : "Completa tu onboarding para personalizar tu experiencia como cliente o proveedor."}
              </p>

              <div className="mt-5 flex flex-wrap gap-3">
                {role === "client" && (
                  <>
                    <Link
                      to="/requests/new"
                      className="rounded-xl bg-white px-5 py-2.5 font-semibold text-slate-900 transition hover:opacity-95"
                    >
                      Crear solicitud
                    </Link>
                    <Link
                      to="/requests"
                      className="rounded-xl border border-white/40 px-5 py-2.5 font-semibold text-white hover:bg-white/10"
                    >
                      Ver todas
                    </Link>
                  </>
                )}
                {role === "provider" && (
                  <Link
                    to="/requests"
                    className="rounded-xl bg-white px-5 py-2.5 font-semibold text-slate-900 transition hover:opacity-95"
                  >
                    Ver solicitudes disponibles
                  </Link>
                )}
              </div>
            </div>

          </div>

          {/* halos suaves del hero */}
          <div className="pointer-events-none absolute -right-16 -top-16 h-56 w-56 rounded-full bg-white/10 blur-2xl" />
          <div className="pointer-events-none absolute -left-20 -bottom-24 h-64 w-64 rounded-full bg-blue-400/10 blur-2xl" />
        </div>

        {/* ---------- MÉTRICAS ---------- */}
        <div className="mt-6 grid gap-4 sm:grid-cols-3">
          {role === "client" && (
            <>
              <div className="rounded-2xl border border-white/10 bg-white/[0.05] p-4 shadow-xl backdrop-blur">
                <div className="text-xs text-indigo-200/80">Solicitudes activas</div>
                <div className="mt-1 text-2xl font-extrabold text-white/95">{metrics.active}</div>
              </div>
              <div className="rounded-2xl border border-white/10 bg-white/[0.05] p-4 shadow-xl backdrop-blur">
                <div className="text-xs text-indigo-200/80">Ofertas recibidas</div>
                <div className="mt-1 text-2xl font-extrabold text-white/95">{metrics.offersReceived}</div>
              </div>
              <div className="rounded-2xl border border-white/10 bg-white/[0.05] p-4 shadow-xl backdrop-blur">
                <div className="text-xs text-indigo-200/80">Con oferta aceptada</div>
                <div className="mt-1 text-2xl font-extrabold text-white/95">{mine.filter(r => !!r.acceptedOfferId).length}</div>
              </div>
            </>
          )}

          {role === "provider" && (
            <>
              <div className="rounded-2xl border border-white/10 bg-white/[0.05] p-4 shadow-xl backdrop-blur">
                <div className="text-xs text-indigo-200/80">Solicitudes disponibles</div>
                <div className="mt-1 text-2xl font-extrabold text-white/95">{metrics.activeAvail}</div>
              </div>
              <div className="rounded-2xl border border-white/10 bg-white/[0.05] p-4 shadow-xl backdrop-blur">
                <div className="text-xs text-indigo-200/80">Tus ofertas enviadas</div>
                <div className="mt-1 text-2xl font-extrabold text-white/95">{metrics.myOffersSent}</div>
              </div>
              <div className="rounded-2xl border border-white/10 bg-white/[0.05] p-4 shadow-xl backdrop-blur">
                <div className="text-xs text-indigo-200/80">Trabajos ganados</div>
                <div className="mt-1 text-2xl font-extrabold text-white/95">{metrics.myWins}</div>
              </div>
            </>
          )}

          {!role && (
            <>
              <div className="rounded-2xl border border-white/10 bg-white/[0.05] p-4 shadow-xl backdrop-blur">
                <div className="text-xs text-indigo-200/80">Solicitudes totales</div>
                <div className="mt-1 text-2xl font-extrabold text-white/95">{all.length}</div>
              </div>
              <div className="rounded-2xl border border-white/10 bg-white/[0.05] p-4 shadow-xl backdrop-blur">
                <div className="text-xs text-indigo-200/80">Usuarios activos</div>
                <div className="mt-1 text-2xl font-extrabold text-white/95">—</div>
              </div>
              <div className="rounded-2xl border border-white/10 bg-white/[0.05] p-4 shadow-xl backdrop-blur">
                <div className="text-xs text-indigo-200/80">En progreso</div>
                <div className="mt-1 text-2xl font-extrabold text-white/95">{all.filter(r => String(r.status||'').toLowerCase().replace(/_/g,' ') === "en progreso").length}</div>
              </div>
            </>
          )}
        </div>

        {/* ---------- ÚLTIMAS 3 ---------- */}
        <div className="mt-8 mb-3 flex items-center justify-between gap-3">
          <h2 className="text-lg font-extrabold text-white/95">
            {role === "provider" ? "Solicitudes recientes" : "Tus últimas solicitudes"}
          </h2>
          {(role ? (role === "provider" ? available.length : mine.length) : all.length) > 0 && (
            <Link
              to="/requests"
              className="rounded-lg border border-white/30 px-3 py-1.5 text-sm text-white hover:bg-white/5"
            >
              Ver todas
            </Link>
          )}
        </div>

        {last3.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-white/20 p-8 text-center text-indigo-100/90">
            {role === "client"
              ? "Aún no tienes solicitudes. ¡Crea la primera para recibir ofertas ✨!"
              : role === "provider"
                ? "No hay solicitudes disponibles por ahora. Vuelve pronto."
                : "Empieza completando tu onboarding para personalizar tu experiencia."}
          </div>
        ) : (
          <div className="grid gap-4 sm:grid-cols-3">
            {last3.map(item => (
              <MiniCard key={item.id} item={item} isClientView={role === "client"} />
            ))}
          </div>
        )}

        {/* ---------- URGENTES (Proveedor) ---------- */}
        {role === "provider" && (
          <div className="mt-10">
            <div className="mb-3 flex items-center justify-between gap-3">
              <h2 className="text-lg font-extrabold text-white/95">Urgentes cerca de ti</h2>
              <Link
                to="/requests"
                className="rounded-lg border border-white/30 px-3 py-1.5 text-sm text-white hover:bg-white/5"
              >
                Ver más
              </Link>
            </div>

            {urgentForProvider.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-white/20 p-8 text-center text-indigo-100/90">
                No hay solicitudes urgentes en este momento.
              </div>
            ) : (
              <div className="grid gap-4 sm:grid-cols-3">
                {urgentForProvider.map(item => (
                  <MiniCard key={item.id} item={item} isClientView={false} />
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </section>
  );
}
