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

export default function Notifier({ intervalMs = 12000, enabled = true }) {
  const { show } = useToast();
  const timerRef = useRef(null);
  const initDoneRef = useRef(false);

  function addNotif(evt) {
    if (!initDoneRef.current) return;
    try {
      const list = loadJSON("notif:events", []);
      const id = `${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;
      const item = { id, ts: Date.now(), type: evt.type || "info", text: String(evt.text || ""), href: evt.href || "" };
      const next = [item, ...list].slice(0, 30);
      saveJSON("notif:events", next);
      const unread = Number(localStorage.getItem("notif:unread") || 0) + 1;
      localStorage.setItem("notif:unread", String(unread));
      window.dispatchEvent(new CustomEvent("notif:add", { detail: item }));
    } catch {}
  }

  useEffect(() => {
    if (!enabled || !isAuthed()) {
      if (timerRef.current) clearInterval(timerRef.current);
      timerRef.current = null;
      return;
    }

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
        const sent = loadJSON("notif:lastSent", {});
        const alreadySent = (key) => {
          if (!key) return false;
          if (sent[key]) return true;
          sent[key] = Date.now();
          return false;
        };

        // refresca identidad por si se actualizó el profile.id
        me = currentUserKey();
        profile = readProfile?.() || {};

        // Si cambió de usuario, limpiamos estado previo
        const meKey = String(me || "");
        const lastUser = localStorage.getItem("notif:user");
        if (lastUser !== meKey) {
          localStorage.setItem("notif:user", meKey);
          localStorage.setItem("notif:unread", "0");
          saveJSON("notif:events", []);
          saveJSON("notif:lastOffersSeen", {});
          saveJSON("notif:lastOfferIdsByReq", {});
          saveJSON("notif:lastOfferStatusByReq", {});
          saveJSON("notif:lastClientAcceptedByReq", {});
          saveJSON("notif:lastLeadsSeen", {});
          saveJSON("notif:lastChatMsg", {});
          for (const k of Object.keys(sent)) delete sent[k];
          initDoneRef.current = false;
        }

        const normalize = (value) => {
          if (value === undefined || value === null) return "";
          return String(value).trim().toLowerCase();
        };

        const pushCandidate = (set, value) => {
          if (value === undefined || value === null) return;
          if (typeof value === "object") {
            pushCandidate(set, value.id);
            pushCandidate(set, value.username);
            pushCandidate(set, value.email);
            return;
          }
          const norm = normalize(value);
          if (norm) set.add(norm);
        };

        const sameAs = (setA, setB) => {
          for (const val of setA) {
            if (setB.has(val)) return true;
          }
          return false;
        };

        const meCandidates = new Set();
        pushCandidate(meCandidates, me);
        pushCandidate(meCandidates, profile?.id);
        pushCandidate(meCandidates, profile?.username);
        pushCandidate(meCandidates, profile?.email);
        const reqs = await lsGetRequests();

        // --- Nueva oferta para el cliente ---
        const lastOffers = loadJSON("notif:lastOffersSeen", {});
        const lastOfferIdsByReq = loadJSON("notif:lastOfferIdsByReq", {});
        reqs.forEach((r) => {
          const ownerVal = r.owner;
          const ownerCandidates = new Set();
          pushCandidate(ownerCandidates, r.ownerId);
          pushCandidate(ownerCandidates, ownerVal);
          const isMine = sameAs(meCandidates, ownerCandidates);
          const offersArr = Array.isArray(r.offers) ? r.offers : [];
          const count = r._count?.offers ?? offersArr.length;
          if (isMine) {
            // Método 1: por conteo
            const prevCount = Number(lastOffers[r.id] || 0);
            let hasNew = count > prevCount;
            // Método 2: por IDs (por si hubo upsert y el conteo no cambia)
            try {
              const prevIds = new Set(Array.isArray(lastOfferIdsByReq[r.id]) ? lastOfferIdsByReq[r.id] : []);
              const currIds = offersArr.map((o) => o.id);
              const newIds = currIds.filter((id) => !prevIds.has(id));
              if (newIds.length > 0) hasNew = true;
              lastOfferIdsByReq[r.id] = currIds;
            } catch {}
            if (hasNew) {
              const msg = `Nueva oferta en: ${r.title || r.id}`;
              if (initDoneRef.current) {
                const key = `offer:${r.id}:${count}`;
                if (!alreadySent(key)) {
                  show?.(msg, { type: "info" });
                  addNotif({ type: "offer", text: msg, href: `/requests/${r.id}` });
                }
              }
            }
            lastOffers[r.id] = count;
          }
        });
        saveJSON("notif:lastOffersSeen", lastOffers);
        saveJSON("notif:lastOfferIdsByReq", lastOfferIdsByReq);

        // --- Oferta aceptada para proveedor (solo para rol proveedor) ---
        const lastOfferStatus = loadJSON("notif:lastOfferStatusByReq", {});
        if (profile?.role === "provider") {
          reqs.forEach((r) => {
            const winner =
              (Array.isArray(r.offers) ? r.offers : []).find((o) => String(o.status || "").toLowerCase() === "accepted") ||
              (r.acceptedOfferId ? (r.offers || []).find((o) => o.id === r.acceptedOfferId) : null);
            const acceptedProvider = r.acceptedProviderId || (winner && winner.providerId);
            const acceptedSet = new Set();
            pushCandidate(acceptedSet, acceptedProvider);
            const prev = lastOfferStatus[r.id];
            if (acceptedProvider && sameAs(meCandidates, acceptedSet) && prev !== "accepted") {
              const msg = `Tu oferta fue aceptada: ${r.title || r.id}`;
              if (initDoneRef.current) {
                const key = `accepted:${r.id}:${acceptedProvider}`;
                if (!alreadySent(key)) {
                  show?.(msg, { type: "success" });
                  addNotif({ type: "accepted", text: msg, href: `/requests/${r.id}` });
                }
              }
              lastOfferStatus[r.id] = "accepted";
            } else if (acceptedProvider) {
              lastOfferStatus[r.id] = "other_accepted";
            }
          });
          saveJSON("notif:lastOfferStatusByReq", lastOfferStatus);
        }

        // --- Oferta aceptada por el cliente (solo cuando soy cliente y es mi solicitud)
        const lastClientAccept = loadJSON("notif:lastClientAcceptedByReq", {});
        if (profile?.role === "client") {
          reqs.forEach((r) => {
            const ownerVal = r.owner;
            const ownerCandidates = new Set();
            pushCandidate(ownerCandidates, r.ownerId);
            pushCandidate(ownerCandidates, ownerVal);
            const isMine = sameAs(meCandidates, ownerCandidates);
            const winner =
              (Array.isArray(r.offers) ? r.offers : []).find((o) => String(o.status || "").toLowerCase() === "accepted") ||
              (r.acceptedOfferId ? (r.offers || []).find((o) => o.id === r.acceptedOfferId) : null);
            const acceptedProvider = r.acceptedProviderId || (winner && winner.providerId);
            const prev = lastClientAccept[r.id];
            if (isMine && acceptedProvider && prev !== "accepted") {
              const msg = `Seleccionaste una oferta en: ${r.title || r.id}`;
              if (initDoneRef.current) {
                const key = `acceptedClient:${r.id}:${acceptedProvider}`;
                if (!alreadySent(key)) {
                  show?.(msg, { type: "success" });
                  addNotif({ type: "accepted_client", text: msg, href: `/requests/${r.id}` });
                }
              }
              lastClientAccept[r.id] = "accepted";
            }
          });
          saveJSON("notif:lastClientAcceptedByReq", lastClientAccept);
        }

        // --- Leads: nuevos contactos para el proveedor ---
        if (profile?.role === "provider") {
          try {
            const leads = lsGetMyLeads();
            const lastLeads = loadJSON("notif:lastLeadsSeen", {});
            const seen = new Set(Object.keys(lastLeads));
            for (const lead of leads) {
              const key = String(lead.id);
              if (!seen.has(key)) {
                const msg = `Nuevo contacto de cliente para tu servicio`;
                if (initDoneRef.current) {
                  const dedupKey = `lead:${key}`;
                  if (!alreadySent(dedupKey)) {
                    show?.(msg, { type: "info" });
                    addNotif({ type: "lead", text: msg, href: `/services` });
                  }
                }
                lastLeads[key] = 1;
              }
            }
            saveJSON("notif:lastLeadsSeen", lastLeads);
          } catch {}
        }

        // --- Chat: nuevo mensaje del otro participante ---
        const lastChat = loadJSON("notif:lastChatMsg", {});
        for (const r of reqs) {
          const ownerVal = r.owner;
          const ownerCandidates = new Set();
          pushCandidate(ownerCandidates, r.ownerId);
          pushCandidate(ownerCandidates, ownerVal);

          const winner =
            (Array.isArray(r.offers) ? r.offers : []).find((o) => String(o.status || "").toLowerCase() === "accepted") ||
            (r.acceptedOfferId ? (r.offers || []).find((o) => o.id === r.acceptedOfferId) : null);
          const acceptedCandidates = new Set();
          pushCandidate(acceptedCandidates, r.acceptedProviderId);
          pushCandidate(acceptedCandidates, winner?.providerId);

          const iAmParticipant = sameAs(meCandidates, ownerCandidates) || sameAs(meCandidates, acceptedCandidates);
          const hasAccepted = acceptedCandidates.size > 0;
          if (!iAmParticipant || !hasAccepted) continue;
          try {
            const msgs = await chatGetMessages(r.id);
            const getTime = (m) => {
              const v = m?.created_at ?? m?.createdAt ?? m?.timestamp ?? m?.date ?? m?.sent_at ?? m?.sentAt ?? m?.ts ?? null;
              if (v instanceof Date) return v.getTime();
              const num = Date.parse(v);
              return Number.isNaN(num) ? 0 : num;
            };
            let last = null;
            if (Array.isArray(msgs) && msgs.length) {
              last = msgs.reduce((acc, m) => (getTime(m) > getTime(acc) ? m : acc), msgs[0]);
              if (!last) last = msgs[msgs.length - 1];
            }
            const prevId = lastChat[r.id];
            if (last && last.id !== prevId) {
              const fromId = last.from || last.sender;
              const fromNorm = normalize(fromId);
              if (fromNorm && !meCandidates.has(fromNorm)) {
                const msg = `Nuevo mensaje en: ${r.title || r.id}`;
                if (initDoneRef.current) {
                  const key = `chat:${r.id}:${last.id}`;
                  if (!alreadySent(key)) {
                    show?.(msg, { type: "info" });
                    addNotif({ type: "chat", text: msg, href: `/chat/${r.id}` });
                  }
                }
              }
              lastChat[r.id] = last.id;
            }
          } catch {}
        }
        saveJSON("notif:lastChatMsg", lastChat);

        if (!initDoneRef.current) {
          initDoneRef.current = true;
        }

        saveJSON("notif:lastSent", sent);
      } catch {}
    }

    // Primera pasada inmediata y luego intervalo
    poll();
    timerRef.current = setInterval(poll, intervalMs);
    return () => clearInterval(timerRef.current);
  }, [enabled]);

  return null;
}
