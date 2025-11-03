import { useEffect, useRef } from "react";
import { useToast } from "./Toast";
import {
  isAuthed,
  readProfile,
  currentUserKey,
  lsGetRequests,
  chatGetMessages,
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

  useEffect(() => {
    if (!isAuthed()) return;
    const me = currentUserKey();
    const profile = readProfile?.() || {};

    async function poll() {
      try {
        const reqs = await lsGetRequests();

        // --- Nueva oferta para el cliente ---
        const lastOffers = loadJSON("notif:lastOffersSeen", {});
        reqs.forEach((r) => {
          const isMine = (r.ownerId || r.owner || "") === me;
          const count = r._count?.offers ?? (Array.isArray(r.offers) ? r.offers.length : 0);
          if (isMine) {
            const prev = Number(lastOffers[r.id] || 0);
            if (count > prev) {
              show?.(`Nueva oferta en: ${r.title || r.id}`, { type: "info" });
            }
            lastOffers[r.id] = count;
          }
        });
        saveJSON("notif:lastOffersSeen", lastOffers);

        // --- Oferta aceptada para proveedor ---
        const lastOfferStatus = loadJSON("notif:lastOfferStatusByReq", {});
        reqs.forEach((r) => {
          const acceptedProvider = r.acceptedProviderId || (Array.isArray(r.offers) ? (r.offers.find(o => (o.status||'').toLowerCase()==='accepted')?.providerId) : null);
          const prev = lastOfferStatus[r.id];
          if (acceptedProvider === me && prev !== "accepted") {
            show?.(`Tu oferta fue aceptada: ${r.title || r.id}`, { type: "success" });
            lastOfferStatus[r.id] = "accepted";
          } else if (acceptedProvider && acceptedProvider !== me) {
            lastOfferStatus[r.id] = "other_accepted";
          }
        });
        saveJSON("notif:lastOfferStatusByReq", lastOfferStatus);

        // --- Chat: nuevo mensaje del otro participante ---
        const lastChat = loadJSON("notif:lastChatMsg", {});
        for (const r of reqs) {
          const acceptedProvider = r.acceptedProviderId || null;
          const owner = r.ownerId || r.owner || "";
          const iAmParticipant = (acceptedProvider && (me === acceptedProvider || me === owner));
          if (!iAmParticipant) continue;
          try {
            const msgs = await chatGetMessages(r.id);
            const last = Array.isArray(msgs) && msgs.length ? msgs[msgs.length - 1] : null;
            const prevId = lastChat[r.id];
            if (last && last.id !== prevId) {
              const fromId = last.from || last.sender;
              if (fromId && fromId !== me) {
                show?.(`Nuevo mensaje en: ${r.title || r.id}`, { type: "info" });
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

