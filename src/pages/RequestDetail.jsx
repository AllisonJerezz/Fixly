// src/pages/RequestDetail.jsx
import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import {
  lsGetRequestById,
  lsUpdateRequest,
  lsGetOffers,
  lsMyOffer,
  lsUpsertMyOffer,
  lsAcceptOffer,
  lsRejectOffer,
  lsDeleteRequest,
  isOwner,
  currentUserKey,
  readProfile,
  readProfileOf,
} from "../api";
import { lsHasReviewFromUserForRequest, lsAddReview } from "../api";
import StatusBadge from "../components/StatusBadge";
import { useToast } from "../components/Toast";
import ConfirmModal from "../components/ConfirmModal";

function CLP(n) {
  const v = Number(n || 0);
  return v.toLocaleString("es-CL", { style: "currency", currency: "CLP", maximumFractionDigits: 0 });
}

// Mapea estados de oferta a español
function offerStatusLabel(val){
  const s = String(val||'').toLowerCase();
  if (s === 'accepted') return 'aceptada';
  if (s === 'rejected') return 'rechazada';
  if (s === 'pending' || s === '') return 'pendiente';
  return s;
}

export default function RequestDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const profile = readProfile?.();
  const me = currentUserKey?.() || "guest";
  const { show } = useToast();

  const [req, setReq] = useState(null);
  const [err, setErr] = useState("");
  const [ok, setOk] = useState("");

  const ownerView = useMemo(() => (req ? isOwner(req) : false), [req]);
  const [myOfferInitial, setMyOfferInitial] = useState(null);

  const [offer, setOffer] = useState({
    message: myOfferInitial?.message || "",
    price: myOfferInitial?.price || "",
  });
  const [savingOffer, setSavingOffer] = useState(false);
  const [confirmDel, setConfirmDel] = useState(false);

  // Estado para reseñas (debe ejecutarse en todos los renders)
  const [alreadyReviewed, setAlreadyReviewed] = useState(false);
  const [rating, setRating] = useState(5);
  const [comment, setComment] = useState("");
  const [hoverRating, setHoverRating] = useState(0);

  // Verificar si ya existe reseña cuando hay ganador y soy dueño (cliente)
  useEffect(() => {
    (async () => {
      try {
        if (!req) return;
        const ownerViewNow = req ? isOwner(req) : false;
        const isClientOwnerNow = ownerViewNow && profile?.role === "client";
        const offersList = Array.isArray(req.offers) ? req.offers : [];
        const accepted = (req?.acceptedOfferId
          ? (offersList.find(o => o.id === req.acceptedOfferId) || null)
          : (offersList.find(o => String(o.status || '').toLowerCase() === 'accepted') || null));
        const providerWinnerId = accepted?.providerId || "";
        const meIdNow = currentUserKey?.() || "guest";
        if (isClientOwnerNow && providerWinnerId) {
          const done = await lsHasReviewFromUserForRequest({ requestId: req.id, fromUserId: meIdNow, providerId: providerWinnerId });
          setAlreadyReviewed(!!done);
        }
      } catch {}
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [req?.id, req?.offers?.length, profile?.role]);

  async function refresh() {
    const r = await lsGetRequestById(id);
    setReq(r);
    try { setMyOfferInitial(await lsMyOffer(r.id)); } catch { setMyOfferInitial(null); }
  }

  useEffect(() => { refresh(); }, [id]);
  useEffect(() => {
    if (!req) return;
    (async () => {
      try {
        const mine = await lsMyOffer(req.id);
        setOffer({ message: mine?.message || "", price: mine?.price || "" });
      } catch (e) {
        // Si el backend no responde, evitamos romper el render
        console.warn("lsMyOffer falla:", e?.message || e);
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [req?.offers?.length]);

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

  const offers = Array.isArray(req?.offers) ? req.offers : [];
  const accepted = (() => {
    if (!offers || offers.length === 0) return null;
    if (req?.acceptedOfferId) {
      const byId = offers.find(o => o.id === req.acceptedOfferId);
      if (byId) return byId;
    }
    return offers.find(o => String(o.status || '').toLowerCase() === 'accepted') || null;
  })();
  const myOffer = myOfferInitial;
  const isProvider = profile?.role === "provider" && !ownerView;
  const norm = (s) => String(s || '').toLowerCase().replace(/_/g, ' ');
  const isCompleted = ['completado','finalizado','cerrado','completed','done'].includes(norm(req?.status));
  const isClientOwner = ownerView && profile?.role === "client";
  const providerWinnerId = accepted?.providerId || "";
  const meId = currentUserKey?.() || "guest";

  // ReseÃ±as del cliente hacia el proveedor ganador
  // moved: const [alreadyReviewed, setAlreadyReviewed] = useState(false);
  // moved: const [rating, setRating] = useState(5);
  // moved: const [comment, setComment] = useState("");

  // moved: useEffect para verificar reseña se declar antes del return condicional

  async function handleAccept(offerId) {
    setErr(""); setOk("");
    const updated = await lsAcceptOffer(req.id, offerId);
    if (!updated) {
      setErr("No se pudo aceptar la oferta. Intenta nuevamente.");
      show("No se pudo aceptar la oferta", { type: "error" });
      return;
    }
    setOk("Oferta aceptada…");
    show("Oferta aceptada…", { type: "success" });
    refresh();
  }

  async function handleReject(offerId) {
    setErr(""); setOk("");
    const updated = await lsRejectOffer(req.id, offerId);
    if (!updated) {
      setErr("No se pudo rechazar la oferta. Intenta nuevamente.");
      show("No se pudo rechazar la oferta", { type: "error" });
      return;
    }
    setOk("Oferta rechazada.");
    show("Oferta rechazada", { type: "warning" });
    refresh();
  }

  async function handleClose(status) {
    setErr(""); setOk("");
    const updated = await lsUpdateRequest(req.id, { status });
    if (!updated) {
      setErr("No se pudo actualizar el estado.");
      show("No se pudo actualizar el estado", { type: "error" });
      return;
    }
    setOk("Estado actualizado.");
    show("Estado actualizado", { type: "success" });
    refresh();
  }

  async function handleDelete() {
    try {
      await lsDeleteRequest(req.id);
      show("Solicitud eliminada", { type: "success" });
      navigate("/requests", { replace: true });
    } catch (e) {
      show(e?.message || "No se pudo eliminar", { type: "error" });
    }
  }

  async function submitReview() {
    try {
      if (!rating) return;
      await lsAddReview({ requestId: req.id, toUserId: providerWinnerId, rating: Number(rating), comment: String(comment || "").trim() });
      show("Reseña enviada", { type: "success" });
      setAlreadyReviewed(true);
    } catch (e) {
      show(e?.message || "No se pudo enviar la reseña", { type: "error" });
    }
  }

  async function submitOffer(e) {
    e.preventDefault();
    setErr(""); setOk("");
    if (!offer.message.trim() || !String(offer.price).trim()) {
      setErr("Completa mensaje y precio.");
      show("Completa mensaje y precio", { type: "warning" });
      return;
    }
    try {
      setSavingOffer(true);
      const saved = await lsUpsertMyOffer(req.id, {
        message: offer.message,
        price: Number(offer.price) || 0,
      });
      if (!saved) {
        setErr("No se pudo enviar la oferta.");
        show("No se pudo enviar la oferta", { type: "error" });
        return;
      }
      const msg = myOffer ? "Oferta actualizada" : "Oferta enviada";
      setOk(`${msg}.`);
      show(msg, { type: "success" });
      refresh();
    } finally {
      setSavingOffer(false);
    }
  }

  const hasPreference = !!req.toProvider || !!req.fromService;

  return (
    <section className="relative overflow-hidden">
      <div className="absolute inset-0 -z-10 bg-gradient-to-br from-[#0A1540] via-[#0B1B4F] to-[#0D2266]" />
      <div className="pointer-events-none absolute -left-28 top-24 h-72 w-72 rounded-full bg-indigo-600/10 blur-3xl" />
      <div className="pointer-events-none absolute -right-20 bottom-10 h-80 w-80 rounded-full bg-sky-500/5 blur-3xl" />

      <div className="mx-auto min-h-[calc(100vh-5rem)] max-w-6xl px-4 py-10 text-white">
        <div className="mb-6 flex items-center justify-between gap-3">
          <div>
            <div className="mb-2 flex flex-wrap items-center gap-2">
              <StatusBadge status={req.status || "pendiente"} />
              <span className="rounded-full border border-white/10 bg-white/[0.06] px-2 py-0.5 text-xs font-semibold text-indigo-100/90">
                {req.category || "General"}
              </span>
              <span className="rounded-full border border-white/10 bg-white/[0.06] px-2 py-0.5 text-xs font-semibold text-indigo-100/90 capitalize">
                Urgencia: {req.urgency || "normal"}
              </span>

              {/* SELLO de preferencia si vino desde "Contactar" */}
              {hasPreference && (
                <span
                  className="inline-flex items-center gap-1 rounded-full border border-amber-300/40 bg-amber-400/10 px-2 py-0.5 text-xs font-semibold text-amber-100"
                  title={
                    req.toProvider
                      ? `Preferencia original: ${req.toProvider}${req.fromService ? ` (servicio #${req.fromService})` : ""}`
                      : `Origen: servicio #${req.fromService}`
                  }
                >
                  <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M12 17l-5 3 1.9-5.6L4 9h5.9L12 3l2.1 6H20l-4.9 5.4L17 20z" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                  Preferencia{req.toProvider ? `: ${req.toProvider}` : ""}
                </span>
              )}

              {accepted && (
                <span className="rounded-full border border-emerald-300/40 bg-emerald-400/10 px-2 py-0.5 text-xs font-semibold text-emerald-200">
                  Con oferta aceptada
                </span>
              )}
            </div>

            <h1 className="text-3xl font-extrabold text-white/95">{req.title}</h1>
            <p className="mt-1 text-sm text-indigo-200/80">Creado: {new Date(req.created_at || req.createdAt).toLocaleString()}</p>
          </div>

          <div className="flex items-center gap-2">
            <Link to="/requests" className="rounded-xl border border-white/30 px-4 py-2.5 text-sm font-semibold text-white hover:bg-white/5">
              Volver
            </Link>
            {ownerView && norm(req.status) !== "completado" && (
              <button
                onClick={() => handleClose(norm(req.status) === "en progreso" ? "completado" : "en progreso")}
                className="rounded-xl bg-indigo-500 px-4 py-2.5 text-sm font-semibold text-white shadow hover:bg-indigo-400"
              >
                {norm(req.status) === "en progreso" ? "Marcar como completado" : "Marcar en progreso"}
              </button>
            )}
            {/* BotÃ³n para abrir chat cuando hay oferta aceptada y soy participante */}
            {accepted && (ownerView || myOffer?.status === "accepted") && (
              <Link
                to={`/chat/${req.id}`}
                className="rounded-xl bg-emerald-500 px-4 py-2.5 text-sm font-semibold text-white shadow hover:bg-emerald-400"
              >
                Abrir chat
              </Link>
            )}
          </div>
        </div>

        {(err || ok) && (
          <div className="mb-6 grid gap-3">
            {ok && <div className="rounded-xl border border-emerald-300/40 bg-emerald-500/10 px-4 py-2 text-sm text-emerald-100">{ok}</div>}
            {err && <div className="rounded-xl border border-rose-300/40 bg-rose-500/10 px-4 py-2 text-sm text-rose-100">{err}</div>}
          </div>
        )}

        <div className="grid grid-cols-1 items-start gap-8 lg:grid-cols-3">
          <div className="lg:col-span-2 grid gap-8">
            <div className="rounded-3xl border border-white/10 bg-white/[0.05] p-6 shadow-2xl backdrop-blur">
              <div className="grid gap-4 sm:grid-cols-3">
                <InfoBox label="Ubicación" value={req.location || "-"} />
                <InfoBox label="Presupuesto" value={req.budget ? CLP(req.budget) : "-"} />
                <InfoBox label="Estado" value={<StatusBadge status={req.status || "pendiente"} />} />
              </div>

              {/* LÃ­nea extra para mostrar origen si existe */}
              {hasPreference && (
                <div className="mt-3 rounded-xl border border-amber-300/30 bg-amber-400/5 p-3 text-sm text-amber-100">
                  Origen de esta solicitud:&nbsp;
                  {req.toProvider ? (
                    <>
                      preferencia por <strong className="text-amber-50">{req.toProvider}</strong>
                      {req.fromService ? <> (servicio <strong>#{req.fromService}</strong>)</> : null}
                    </>
                  ) : (
                    <>servicio <strong>#{req.fromService}</strong></>
                  )}
                </div>
              )}

              <div className="mt-6">
                <h3 className="mb-2 text-lg font-extrabold text-white/95">Descripción</h3>
                <p className="whitespace-pre-wrap text-indigo-100/90">{req.description || "Sin descripción."}</p>
              </div>
            </div>

            <div>
              <div className="mb-3 flex items-center justify-between gap-3">
                <h3 className="text-lg font-extrabold text-white/95">Ofertas ({offers.length})</h3>
                {ownerView && offers.length > 0 && accepted && (
                  <span className="text-sm text-emerald-200/90">Oferta ganadora: <strong>{CLP(accepted.price)}</strong></span>
                )}
              </div>

              {offers.length === 0 ? (
                <div className="rounded-2xl border border-dashed border-white/20 p-8 text-center text-indigo-100/90">
                  {ownerView ? "Aún no tienes ofertas. Cuando lleguen, podrás verlas aquí­ y aceptar la mejor." : "Sé el primero en ofertar. ¡Enví­a tu propuesta!"}
                </div>
              ) : (
                <div className="grid gap-4">
                  {offers
                    .slice()
                    .sort((a, b) => {
                      if (req.acceptedOfferId === a.id) return -1;
                      if (req.acceptedOfferId === b.id) return 1;
                      return new Date(b.created_at || b.createdAt) - new Date(a.created_at || a.createdAt);
                    })
                    .map((o) => (
                      <OfferCard
                        key={o.id}
                        offer={o}
                        isWinner={req.acceptedOfferId === o.id}
                        canDecide={ownerView && !accepted}
                        onAccept={() => handleAccept(o.id)}
                        onReject={() => handleReject(o.id)}
                        me={me}
                      />
                    ))}
                </div>
              )}
            </div>
          </div>

          <aside className="lg:col-span-1">
            {isProvider ? (
              <div className="rounded-3xl border border-white/10 bg-white/[0.05] p-6 shadow-2xl backdrop-blur">
                <h3 className="text-lg font-extrabold text-white/95">{myOffer ? "Editar mi oferta" : "Enviar oferta"}</h3>
                <form onSubmit={submitOffer} className="mt-4 grid gap-3">
                  <div>
                    <label className="mb-1 block text-sm text-indigo-200/85">Mensaje</label>
                    <textarea
                      rows={4}
                      value={offer.message}
                      onChange={(e) => setOffer((f) => ({ ...f, message: e.target.value }))}
                      placeholder="Describe tu experiencia, disponibilidad y qué incluye tu precio."
                      className="w-full resize-y rounded-xl border border-white/15 bg-white/[0.06] px-3 py-2.5 text-white placeholder-white/60 outline-none focus:ring-2 focus:ring-sky-300/40"
                    />
                  </div>
                  <div>
                    <label className="mb-1 block text-sm text-indigo-200/85">Precio (CLP)</label>
                    <input
                      type="number"
                      min="0"
                      inputMode="numeric"
                      value={offer.price}
                      onChange={(e) => setOffer((f) => ({ ...f, price: e.target.value }))}
                      placeholder="Ej: 120000"
                      className="w-full rounded-xl border border-white/15 bg-white/[0.06] px-3 py-2.5 text-white placeholder-white/60 outline-none focus:ring-2 focus:ring-sky-300/40"
                    />
                  </div>
                  <button
                    disabled={savingOffer}
                    className="mt-1 rounded-xl bg-indigo-500 px-5 py-2.5 font-semibold text-white shadow hover:bg-indigo-400 disabled:opacity-60"
                  >
                    {savingOffer ? "Guardando..." : myOffer ? "Actualizar oferta" : "Enviar oferta"}
                  </button>
                </form>
                {accepted && myOffer && (
                  <p className="mt-3 text-sm text-indigo-200/85">
                    Estado de tu oferta: <strong className="capitalize">{offerStatusLabel(myOffer.status)}</strong>
                  </p>
                )}
                {accepted && isClientOwner && norm(req.status) === "completado" && (
                  <div className="mt-4 rounded-2xl border border-white/10 bg-white/[0.06] p-4">
                    <div className="mb-2 text-sm font-bold text-white/90">Calificar proveedor</div>
                    {alreadyReviewed ? (
                      <div className="text-sm text-indigo-200/85">Ya enviaste una reseña para esta solicitud.</div>
                    ) : (
                      <div className="grid gap-3">
                        <div className="flex items-center gap-2">
                          {[1,2,3,4,5].map((n) => (
                            <button
                              key={n}
                              type="button"
                              onClick={() => setRating(n)}
                              className={[
                                "h-8 w-8 rounded-full border text-sm font-bold",
                                n <= rating ? "bg-amber-400/80 border-amber-300 text-white" : "bg-white/10 border-white/20 text-white/70",
                              ].join(" ")}
                              title={`${n} estrellas`}
                            >
                              {n}
                            </button>
                          ))}
                        </div>
                        <textarea
                          rows={3}
                          placeholder="Escribe un comentario (opcional)"
                          value={comment}
                          onChange={(e) => setComment(e.target.value)}
                          className="w-full rounded-xl border border-white/15 bg-white/[0.06] px-3 py-2 text-white placeholder-white/60 outline-none focus:ring-2 focus:ring-sky-300/40"
                        />
                        <button onClick={submitReview} className="rounded-xl bg-indigo-500 px-4 py-2.5 text-sm font-semibold text-white shadow hover:bg-indigo-400">Enviar reseÃ±a</button>
                      </div>
                    )}
                  </div>
                )}
              </div>
            ) : (
              <div className="rounded-3xl border border-white/10 bg-white/[0.05] p-6 shadow-2xl backdrop-blur">
                <h3 className="text-lg font-extrabold text-white/95">Resumen</h3>
                
                <div className="mt-3 grid gap-2">
                  <InfoRow label="Categoría" value={req.category || "-"} />
                  <InfoRow label="Ubicación" value={req.location || "-"} />
                  <InfoRow label="Urgencia" value={req.urgency || "normal"} />
                  <InfoRow label="Presupuesto" value={req.budget ? CLP(req.budget) : "-"} />
                </div>
                {ownerView && (
                  <div className="mt-4 grid gap-2">
                    <button
                      onClick={() => navigate(`/requests/${req.id}/edit`)}
                      className="rounded-xl border border-white/30 px-4 py-2.5 text-sm font-semibold text-white hover:bg-white/5"
                    >
                      Editar solicitud
                    </button>
                    <button
                      onClick={() => setConfirmDel(true)}
                      className="rounded-xl border border-rose-400/50 bg-rose-500/10 px-4 py-2.5 text-sm font-semibold text-rose-100 hover:bg-rose-500/20"
                    >
                      Eliminar solicitud
                    </button>
                  </div>
                )}
                {accepted && isClientOwner && (
isCompleted ? (
<div className="mt-4 rounded-2xl border border-white/10 bg-white/[0.06] p-4">
<div className="mb-2 text-sm font-bold text-white/90">Calificar proveedor</div>

  {alreadyReviewed ? (
    <div className="text-sm text-indigo-200/85">Ya enviaste una reseña para esta solicitud.</div>
  ) : (
    <>
      <div className="flex items-center gap-1"> {[1, 2, 3, 4, 5].map((n) => { const filled = n <= (hoverRating || rating); return ( <button key={n} type="button" onClick={() => setRating(n)} onMouseEnter={() => setHoverRating(n)} onMouseLeave={() => setHoverRating(0)} className="p-1" aria-label={`${n} estrellas`} aria-pressed={n <= rating} title={`${n} estrellas`} > <svg viewBox="0 0 24 24" className={filled ? "h-7 w-7 text-amber-400 drop-shadow" : "h-7 w-7 text-white/40"} fill={filled ? "currentColor" : "none"} stroke="currentColor" strokeWidth={filled ? 0 : 1.8} > <path d="M12 3.6l2.57 5.21 5.75.84-4.16 4.05.98 5.72L12 16.98 6.86 20.4l.98-5.72-4.16-4.05 5.75-.84L12 3.6z" /> </svg> </button> ); })} <span className="ml-2 text-sm text-indigo-200/85">{(hoverRating || rating)}/5</span> </div>
      <textarea
        rows={3}
        placeholder="Escribe un comentario (opcional)"
        value={comment}
        onChange={(e) => setComment(e.target.value)}
        className="mt-3 w-full rounded-xl border border-white/15 bg-white/[0.06] px-3 py-2 text-white placeholder-white/60 outline-none focus:ring-2 focus:ring-sky-300/40"
      />

      <button
        onClick={submitReview}
        className="mt-2 rounded-xl bg-indigo-500 px-4 py-2.5 text-sm font-semibold text-white shadow hover:bg-indigo-400"
      >
        Enviar reseña
      </button>
    </>
  )}
</div>
) : (
<div className="mt-4 rounded-2xl border border-white/10 bg-white/[0.06] p-4">
<div className="mb-2 text-sm font-semibold text-white/90">
Para calificar, marca la solicitud como completada.
</div>
<button
className="rounded-xl bg-indigo-500 px-4 py-2.5 text-sm font-semibold text-white shadow hover:bg-indigo-400"
onClick={async () => {
try { await lsUpdateRequest(req.id, { status: 'completado' }); await refresh(); } catch {}
}}
>
Marcar como completada
</button>
</div>
)
)}
              </div>
            )}
          </aside>
        </div>
        <RequestDetailConfirm
          open={confirmDel}
          onConfirm={handleDelete}
          onCancel={() => setConfirmDel(false)}
        />
      </div>
    </section>
  );
}

function InfoBox({ label, value }) {
  return (
    <div className="rounded-xl border border-white/10 bg-white/[0.04] p-3">
      <div className="text-[11px] text-indigo-200/80">{label}</div>
      <div className="mt-0.5 text-sm font-semibold text-white/95">{value}</div>
    </div>
  );
}

function InfoRow({ label, value }) {
  return (
    <div className="flex items-center justify-between gap-4 rounded-xl border border-white/10 bg-white/[0.04] px-3 py-2">
      <span className="text-sm text-indigo-200/85">{label}</span>
      <span className="text-sm font-semibold text-white/95">{value}</span>
    </div>
  );
}

function OfferCard({ offer, isWinner, canDecide, onAccept, onReject, me }) {
  function resolveName(key){
    const k = String(key||'').trim();
    if (!k) return '';
    try {
      const mep = readProfile?.();
      if (mep && (String(mep.id) === k || String(mep.username||'').toLowerCase() === k.toLowerCase())) {
        return mep.displayName || mep.username || k;
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
  const providerName = offer?.providerName || resolveName(offer?.providerId || "");
  const providerPhoto = (() => {
    if (offer?.providerPhoto) return offer.providerPhoto;
    const k = String(offer?.providerId || '').trim();
    if (!k) return '';
    try {
      for (let i = 0; i < localStorage.length; i++) {
        const kk = localStorage.key(i);
        if (kk && kk.startsWith('profile:')) {
          try {
            const p = JSON.parse(localStorage.getItem(kk) || 'null');
            if (p && String(p.id) === k) return p.photoURL || p.photo_url || '';
          } catch {}
        }
      }
    } catch {}
    return '';
  })();
  function offerStatusLabel(val){
    const s = String(val||'').toLowerCase();
    if (s === 'accepted') return 'aceptada';
    if (s === 'rejected') return 'rechazada';
    if (s === 'pending' || s === '') return 'pendiente';
    return s;
  }
  return (
    <div className={["rounded-2xl border p-4 shadow-xl backdrop-blur", isWinner ? "border-emerald-300/40 bg-emerald-400/10" : "border-white/10 bg-white/[0.05]"].join(" ")}>
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="mb-1 flex items-center gap-2 text-[11px] text-indigo-200/80">
            <span className="inline-flex items-center gap-1.5">Proveedor:{' '}
              {providerPhoto ? (
                <img src={providerPhoto} alt={providerName} className="h-4 w-4 rounded-full object-cover ring-1 ring-black/10" />
              ) : null}
              <strong className="text-white/95">{providerName}</strong>
            </span>
            {offer.providerId === me && (
              <span className="rounded-full border border-white/10 bg-white/[0.08] px-1.5 py-0.5 text-[10px] font-semibold text-indigo-100/90">Tu oferta</span>
            )}
            <span>{new Date(offer.created_at || offer.createdAt).toLocaleString()}</span>
          </div>
          <div className="whitespace-pre-wrap text-sm text-white/95">{offer.message || "-"}</div>
        </div>

        <div className="shrink-0 text-right">
          <div className="text-xs uppercase tracking-wide text-indigo-200/80">Precio</div>
          <div className="text-lg font-extrabold text-white/95">{CLP(offer.price)}</div>
          <div className="mt-1 text-[11px] capitalize text-indigo-200/80">Estado: {offerStatusLabel(offer.status)}</div>
        </div>
      </div>

      <div className="mt-3 flex flex-wrap items-center justify-between gap-3">
        {isWinner ? (
          <span className="inline-flex items-center gap-1 rounded-full border border-emerald-300/40 bg-emerald-400/10 px-2 py-0.5 text-[11px] font-semibold text-emerald-200">
            <svg viewBox="0 0 24 24" className="h-3.5 w-3.5">
              <path d="m5 13 4 4L19 7" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
            Oferta ganadora
          </span>
        ) : (
          <span className="text-[11px] text-indigo-200/80">Estado: {offerStatusLabel(offer.status)}</span>
        )}

        {canDecide && !isWinner && (
          <div className="flex items-center gap-2">
            <button onClick={onReject} className="rounded-xl border border-white/30 px-3 py-1.5 text-sm font-semibold text-white hover:bg-white/5">
              Rechazar
            </button>
            <button onClick={onAccept} className="rounded-xl bg-indigo-500 px-3 py-1.5 text-sm font-semibold text-white shadow hover:bg-indigo-400">
              Aceptar
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

// Modal de confirmación (se monta al final para evitar stacking issues)
// Render conditionally via confirmDel state above
export function RequestDetailConfirm({ open, onConfirm, onCancel }) {
  return (
    <ConfirmModal
      open={open}
      title="Eliminar solicitud"
      message="Esta acción no se puede deshacer. ¿Deseas continuar?"
      confirmText="Eliminar"
      cancelText="Cancelar"
      onConfirm={onConfirm}
      onCancel={onCancel}
    />
  );
}
