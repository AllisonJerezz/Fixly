import { useEffect, useRef } from "react";
import { useToast } from "./Toast";
import {
  isAuthed,
  readProfile,
  currentUserKey,
  lsGetRequests,
  chatGetMessages,
  lsGetMyLeads,
  fetchProfileAndCache,
} from "../api";

function loadJSON(key, fallback) {
  try { return JSON.parse(localStorage.getItem(key) || "null") ?? fallback; } catch { return fallback; }
}
function saveJSON(key, value) {
  try { localStorage.setItem(key, JSON.stringify(value)); } catch {}
}

export default function Notifier({ intervalMs = 12000 }) {
  const { show } = useToast();
  const timerRef = useRef(null);

  function addNotif(evt) {
    try {
      const list = loadJSON("notif:events", []);
      const id = `${Date.now()}_${Math.random().toString(36).slice(2,6)}`;
      const item = { id, ts: Date.now(), type: evt.type || "info", text: String(evt.text||""), href: evt.href || "" };
      const next = [item, ...list].slice(0, 30);
      saveJSON("notif:events", next);
      const unread = Number(localStorage.getItem("notif:unread") || 0) + 1;
      localStorage.setItem("notif:unread", String(unread));
      window.dispatchEvent(new CustomEvent('notif:add', { detail: item }));
    } catch {}
  }

  useEffect(() => {
    if (!isAuthed()) return;
    // Asegura que tengamos profile.id cacheado; si falta, lo trae del backend
    try {
      const p = readProfile?.();
      if (!p?.id) {
        fetchProfileAndCache?.().catch(() => {});
      }
    } catch {}

    let me = currentUserKey();
    let profile = readProfile?.() || {};

    async function poll() {
      try {
        // refresca identidad por si se actualizó el profile.id
        me = currentUserKey();
        profile = readProfile?.() || {};
        const reqs = await lsGetRequests();

        // --- Nueva oferta para el cliente ---
        const lastOffers = loadJSON("notif:lastOffersSeen", {});
        const lastOfferIdsByReq = loadJSON("notif:lastOfferIdsByReq", {});
        reqs.forEach((r) => {
          const ownerVal = r.owner;
          const ownerId = r.ownerId || (ownerVal && typeof ownerVal === 'object' ? ownerVal.id : ownerVal) || "";
          const meKey = String(me || '').toLowerCase();
          const ownerKey = String(ownerId || '').toLowerCase();
          const isMine = ownerKey === meKey;
          const offersArr = Array.isArray(r.offers) ? r.offers : [];
          const count = r._count?.offers ?? offersArr.length;
          if (isMine) {
            // Método 1: por conteo
            const prevCount = Number(lastOffers[r.id] || 0);
            let hasNew = count > prevCount;
            // Método 2: por IDs (por si hubo upsert y el conteo no cambia)
            try {
              const prevIds = new Set(Array.isArray(lastOfferIdsByReq[r.id]) ? lastOfferIdsByReq[r.id] : []);
              const currIds = offersArr.map(o => o.id);
              const newIds = currIds.filter(id => !prevIds.has(id));
              if (newIds.length > 0) hasNew = true;
              lastOfferIdsByReq[r.id] = currIds;
            } catch {}
            if (hasNew) {
              const msg = `Nueva oferta en: ${r.title || r.id}`;
              show?.(msg, { type: 'info' });
              addNotif({ type: 'offer', text: msg, href: `/requests/${r.id}` });
            }
            lastOffers[r.id] = count;
          }
        });
        saveJSON("notif:lastOffersSeen", lastOffers);
        saveJSON("notif:lastOfferIdsByReq", lastOfferIdsByReq);

        // --- Oferta aceptada para proveedor (solo para rol proveedor) ---
        const lastOfferStatus = loadJSON("notif:lastOfferStatusByReq", {});
        if (profile?.role === 'provider') {
          reqs.forEach((r) => {
            const acceptedProvider = r.acceptedProviderId || (Array.isArray(r.offers) ? (r.offers.find(o => (o.status||'').toLowerCase()==='accepted')?.providerId) : null);
            const prev = lastOfferStatus[r.id];
            if (acceptedProvider && me && acceptedProvider === me && prev !== "accepted") {
              const msg = `Tu oferta fue aceptada: ${r.title || r.id}`;
              show?.(msg, { type: "success" });
              addNotif({ type: 'accepted', text: msg, href: `/requests/${r.id}` });
              lastOfferStatus[r.id] = "accepted";
            } else if (acceptedProvider && me && acceptedProvider !== me) {
              lastOfferStatus[r.id] = "other_accepted";
            }
          });
          saveJSON("notif:lastOfferStatusByReq", lastOfferStatus);
        }

        // --- Oferta aceptada por el cliente (solo cuando soy cliente y es mi solicitud)
        const lastClientAccept = loadJSON("notif:lastClientAcceptedByReq", {});
        if (profile?.role === 'client') {
          reqs.forEach((r) => {
            const ownerVal = r.owner;
            const ownerId = r.ownerId || (ownerVal && typeof ownerVal === 'object' ? ownerVal.id : ownerVal) || "";
            const isMine = ownerId === me;
            const acceptedProvider = r.acceptedProviderId || (Array.isArray(r.offers) ? (r.offers.find(o => (o.status||'').toLowerCase()==='accepted')?.providerId) : null);
            const prev = lastClientAccept[r.id];
            if (isMine && acceptedProvider && prev !== 'accepted') {
              const msg = `Seleccionaste una oferta en: ${r.title || r.id}`;
              show?.(msg, { type: 'success' });
              addNotif({ type: 'accepted_client', text: msg, href: `/requests/${r.id}` });
              lastClientAccept[r.id] = 'accepted';
            }
          });
          saveJSON('notif:lastClientAcceptedByReq', lastClientAccept);
        }

        // --- Leads: nuevos contactos para el proveedor ---
        if (profile?.role === 'provider') {
          try {
            const leads = lsGetMyLeads();
            const lastLeads = loadJSON("notif:lastLeadsSeen", {});
            const seen = new Set(Object.keys(lastLeads));
            for (const lead of leads) {
              const key = String(lead.id);
              if (!seen.has(key)) {
                const msg = `Nuevo contacto de cliente para tu servicio`;
                show?.(msg, { type: 'info' });
                addNotif({ type: 'lead', text: msg, href: `/services` });
                lastLeads[key] = 1;
              }
            }
            saveJSON("notif:lastLeadsSeen", lastLeads);
          } catch {}
        }

        // --- Chat: nuevo mensaje del otro participante ---
        const lastChat = loadJSON("notif:lastChatMsg", {});
        for (const r of reqs) {
          const acceptedProvider = r.acceptedProviderId || null;
          const ownerVal = r.owner;
          const ownerId = r.ownerId || (ownerVal && typeof ownerVal === 'object' ? ownerVal.id : ownerVal) || "";
          const meId = String(me || '').toLowerCase();
          const ownerIdNorm = String(ownerId || '').toLowerCase();
          const accProvNorm = String(acceptedProvider || '').toLowerCase();
          const iAmParticipant = (acceptedProvider && (meId === accProvNorm || meId === ownerIdNorm));
          if (!iAmParticipant) continue;
          try {
            const msgs = await chatGetMessages(r.id);
            const last = Array.isArray(msgs) && msgs.length ? msgs[msgs.length - 1] : null;
            const prevId = lastChat[r.id];
            if (last && last.id !== prevId) {
              const fromId = last.from || last.sender;
              if (fromId && String(fromId).toLowerCase() !== meId) {
                const msg = `Nuevo mensaje en: ${r.title || r.id}`;
                show?.(msg, { type: "info" });
                addNotif({ type: 'chat', text: msg, href: `/chat/${r.id}` });
              }
              lastChat[r.id] = last.id;
            }
          } catch {}
        }
        saveJSON("notif:lastChatMsg", lastChat);
      } catch {}
    }

    // Primera pasada inmediata y luego intervalo
    poll();
    timerRef.current = setInterval(poll, intervalMs);
    return () => clearInterval(timerRef.current);
  }, []); // sólo al montar

  return null;
}
