// src/pages/ServiceDetail.jsx
import { useEffect, useMemo, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { currentUserKey, lsUpdateService, lsDeleteService, lsGetMyServices } from "../api";
import ConfirmModal from "../components/ConfirmModal";

function CLP(n){ const v=Number(n||0); return v.toLocaleString('es-CL',{style:'currency',currency:'CLP',maximumFractionDigits:0}); }

export default function ServiceDetail(){
  const { id } = useParams();
  const [svc, setSvc] = useState(null);
  const [rating, setRating] = useState({ count:0, avg:0 });
  const [reviews, setReviews] = useState([]);
  const [provider, setProvider] = useState({ name: '', photo: '', bio: '' });
  const me = currentUserKey?.() || "guest";
  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState({ title:"", category:"", location:"", priceFrom:"", description:"", status:"activo" });
  const [saving, setSaving] = useState(false);
  const [confirmDel, setConfirmDel] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        const base = (import.meta.env.VITE_API_URL || '').replace(/\/$/, '');
        const rs = await fetch(`${base}/services/${id}`);
        const s = await rs.json();
        if(rs.ok){ setSvc(s); }
        const owner = s?.owner || s?.ownerId;
        if(owner){
          const rr = await fetch(`${base}/users/${owner}/rating`);
          const rjson = await rr.json();
          if(rr.ok) setRating({ count: rjson.count||0, avg: rjson.avg||0 });
          const rv = await fetch(`${base}/users/${owner}/reviews`);
          const rvj = await rv.json();
          if(rv.ok) setReviews(Array.isArray(rvj)?rvj:[]);
          try {
            const du = await fetch(`${base}/users/${owner}`);
            const uj = await du.json();
            if (du.ok && uj) {
              const name = (uj?.profile?.display_name || uj?.username || '').trim();
              const photo = (uj?.profile?.photo_url || '').trim();
              const bio = (uj?.profile?.bio || '').trim();
              setProvider({ name, photo, bio });
            }
          } catch {}
        }
      } catch {}
    })();
  }, [id]);

  if(!svc){
    return (
      <section className="relative overflow-hidden">
        <div className="absolute inset-0 -z-10 bg-gradient-to-br from-[#0A1540] via-[#0B1B4F] to-[#0D2266]" />
        <div className="mx-auto max-w-4xl px-4 py-12 text-white">Cargando¦</div>
      </section>
    );
  }

  const qs = new URLSearchParams({
    title: svc.title || '',
    category: svc.category || '',
    location: svc.location || '',
    priceFrom: String(svc.price_from || svc.priceFrom || ''),
    to: svc.owner || svc.ownerId || '',
    serviceId: svc.id || ''
  }).toString();

  return (
    <section className="relative overflow-hidden">
      <div className="absolute inset-0 -z-10 bg-gradient-to-br from-[#0A1540] via-[#0B1B4F] to-[#0D2266]" />
      <div className="mx-auto min-h-[calc(100vh-5rem)] max-w-5xl px-4 py-10 text-white">
        <div className="mb-6 flex items-center justify-between gap-3">
          <div>
            <h1 className="text-3xl font-extrabold text-white/95">{svc.title || 'Servicio'}</h1>
            <div className="mt-1 text-sm text-indigo-200/80">Categoría: <strong>{svc.category || 'General'}</strong></div>
            <div className="text-sm text-indigo-200/80">Ubicación: <strong>{svc.location || '-'}</strong></div>
            {provider.name && (
              <div className="mt-1 inline-flex items-center gap-2 text-sm text-indigo-200/80">
                Proveedor:
                {provider.photo && (
                  <img src={provider.photo} alt={provider.name} className="h-5 w-5 rounded-full object-cover ring-1 ring-black/10" />
                )}            {provider.bio && (
              <div className="mt-3 rounded-2xl border border-white/10 bg-white/5 p-4 text-sm text-white/85 shadow">
                <div className="text-xs uppercase tracking-wide text-white/60">Descripción del proveedor</div>
                <p className="mt-1 whitespace-pre-wrap text-sm text-white/90">{provider.bio}</p>
              </div>
            )}
                <strong className="text-white/95">{provider.name}</strong>
              </div>
            )}
          </div>
          {(svc?.ownerId || svc?.owner) && String(svc.ownerId || svc.owner) === me ? (
            <div className="flex items-center gap-2">
              <button
                onClick={() => { setEditing(true); setForm({ title: svc.title||"", category: svc.category||"", location: svc.location||"", priceFrom: svc.price_from || svc.priceFrom || "", description: svc.description||"", status: svc.status||"activo" }); }}
                className="rounded-xl bg-indigo-500 px-4 py-2.5 font-semibold text-white shadow hover:bg-indigo-400"
              >
                Editar
              </button>
              <button
                onClick={() => setConfirmDel(true)}
                className="rounded-xl border border-rose-400/50 bg-rose-500/10 px-4 py-2.5 font-semibold text-rose-100 hover:bg-rose-500/20"
              >
                Eliminar
              </button>
            </div>
          ) : (
            <Link to={`/requests/new?${qs}`} className="rounded-xl bg-indigo-500 px-4 py-2.5 font-semibold text-white shadow hover:bg-indigo-400">Contactar</Link>
          )}
        </div>

        <div className="grid gap-6 lg:grid-cols-3">
          <div className="lg:col-span-2 rounded-3xl border border-white/10 bg-white/[0.05] p-6">
            <div className="text-sm text-indigo-200/80">Descripción</div>
            <div className="mt-1 whitespace-pre-wrap text-white/95">{svc.description || '-'}</div>
            <div className="mt-4 grid grid-cols-3 gap-3">
              <InfoBox label="Precio desde" value={svc.price_from ? CLP(svc.price_from) : (svc.priceFrom ? CLP(svc.priceFrom) : '-')} />
              <InfoBox label="Estado" value={svc.status || 'activo'} />
              <InfoBox label="Publicación" value={svc.created_at ? new Date(svc.created_at).toLocaleString() : '-'} />
            </div>
          </div>
          <div className="rounded-3xl border border-white/10 bg-white/[0.05] p-6">
            <div className="text-sm text-indigo-200/80">Reputación</div>
            {rating.count ? (
              <div className="mt-2 inline-flex items-center gap-2 rounded-full border border-amber-300/40 bg-amber-400/10 px-3 py-1.5 text-amber-100">
                <span className="font-bold">{rating.avg.toFixed(1)} ★</span>
                <span className="text-sm">· {rating.count} reseña{rating.count>1?'s':''}</span>
              </div>
            ) : (
              <div className="mt-2 text-sm text-indigo-200/80">Sin calificaciones</div>
            )}
            {reviews.length>0 && (
              <div className="mt-4 grid gap-3">
                {reviews.slice(0,6).map((rv) => (
                  <div key={rv.id} className="rounded-xl border border-white/10 bg-white/[0.04] p-3">
                    <div className="text-xs text-indigo-200/80">{new Date(rv.created_at || rv.createdAt).toLocaleString()}</div>
                    <div className="mt-1 text-sm font-semibold text-white/95">{rv.rating} ★</div>
                    {rv.comment && <div className="mt-1 text-sm text-white/90">{rv.comment}</div>}
                  </div>
                ))}
                {reviews.length>6 && <div className="text-xs text-indigo-200/80">Mostrando 6 de {reviews.length} reseñas¦</div>}
              </div>
            )}
          </div>
        </div>
        {/* Modal editar */}
        {editing && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/40 p-4">
            <div className="w-full max-w-xl rounded-2xl border border-slate-200 bg-white p-5 shadow-2xl">
              <h3 className="text-lg font-extrabold text-slate-900">Editar servicio</h3>
              <div className="mt-4 grid gap-3">
                <div>
                  <label className="mb-1 block text-sm text-slate-700">Tí­tulo</label>
                  <input value={form.title} onChange={(e)=>setForm(f=>({...f,title:e.target.value}))} className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500" />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="mb-1 block text-sm text-slate-700">Categoría</label>
                    <input value={form.category} onChange={(e)=>setForm(f=>({...f,category:e.target.value}))} className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500" />
                  </div>
                  <div>
                    <label className="mb-1 block text-sm text-slate-700">Ubicación</label>
                    <input value={form.location} onChange={(e)=>setForm(f=>({...f,location:e.target.value}))} className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500" />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="mb-1 block text-sm text-slate-700">Precio desde (CLP)</label>
                    <input value={form.priceFrom} onChange={(e)=>setForm(f=>({...f,priceFrom:e.target.value.replace(/[^\d]/g,'')}))} className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500" />
                  </div>
                  <div>
                    <label className="mb-1 block text-sm text-slate-700">Estado</label>
                    <select value={form.status} onChange={(e)=>setForm(f=>({...f,status:e.target.value}))} className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500">
                      <option value="activo">activo</option>
                      <option value="pausado">pausado</option>
                    </select>
                  </div>
                </div>
                <div>
                  <label className="mb-1 block text-sm text-slate-700">Descripción</label>
                  <textarea rows={4} value={form.description} onChange={(e)=>setForm(f=>({...f,description:e.target.value}))} className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500" />
                </div>
              </div>
              <div className="mt-5 flex items-center justify-end gap-2">
                <button onClick={()=>setEditing(false)} className="rounded-lg border border-slate-300 px-4 py-2 text-slate-700 hover:bg-slate-50">Cancelar</button>
                <button disabled={saving} onClick={async ()=>{ try { setSaving(true); const patch = { title: form.title.trim(), category: form.category.trim(), location: form.location.trim(), description: form.description, status: form.status, price_from: form.priceFrom ? Number(form.priceFrom) : 0 }; await lsUpdateService(svc.id, patch); const base = (import.meta.env.VITE_API_URL || '').replace(/\/$/, ''); const rs = await fetch(`${base}/services/${id}`); const s = await rs.json(); if(rs.ok){ setSvc(s); } setEditing(false); } finally { setSaving(false); } }} className="rounded-lg bg-indigo-600 px-4 py-2 font-semibold text-white hover:bg-indigo-700 disabled:opacity-60">{saving? 'Guardando...' : 'Guardar cambios'}</button>
              </div>
            </div>
          </div>
        )}
        {/* Confirmación eliminar */}
        <ConfirmModal
          open={confirmDel}
          title="Eliminar servicio"
          message="Esta acción no se puede deshacer. ¿Deseas continuar?"
          confirmText="Eliminar"
          cancelText="Cancelar"
          onConfirm={async ()=>{ try { await lsDeleteService(svc.id); window.history.back(); } finally { setConfirmDel(false);} }}
          onCancel={()=>setConfirmDel(false)}
        />
      </div>
    </section>
  );
}

function InfoBox({ label, value }){
  return (
    <div className="rounded-xl border border-white/10 bg-white/[0.04] p-3">
      <div className="text-[11px] text-indigo-200/80">{label}</div>
      <div className="mt-0.5 text-sm font-semibold text-white/95">{value}</div>
    </div>
  );
}










