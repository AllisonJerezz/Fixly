// src/pages/Chat.jsx
import { useEffect, useMemo, useRef, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { useToast } from "../components/Toast";
import {
  lsGetRequestById,
  currentUserKey,
  readProfile,
  isOwner,
  chatGetMessages,
  chatSendMessage,
} from "../api";
import StatusBadge from "../components/StatusBadge";

function fmtTime(ts) {
  const d = new Date(ts);
  return d.toLocaleString();
}

export default function Chat() {
  const { requestId } = useParams();
  const me = currentUserKey?.() || "guest";
  const profile = readProfile?.();
  const { show } = useToast();

  const [req, setReq] = useState(null);
  const [text, setText] = useState("");
  const [messages, setMessages] = useState([]);
  const listRef = useRef(null);
  const accepted = useMemo(() => {
    if (!req) return null;
    return (req.offers||[]).find(o => String(o.status||'').toLowerCase() === 'accepted') || null;
  }, [req]);

  const ownerView = useMemo(() => (req ? isOwner(req) : false), [req]);
  const winnerId = accepted?.providerId || "";
  const ownerId = req?.ownerId || req?.owner || "";

  const canView = !!req && !!accepted && (me === ownerId || me === winnerId);

  // nombres amigables
  const mapName = (id) => {
    if (id === ownerId) return "Cliente";
    if (id === winnerId) return "Proveedor";
    return id || "Usuario";
  };

  useEffect(() => { (async () => {
    const r = await lsGetRequestById(requestId);
    setReq(r);
    try {
      const arr = await chatGetMessages(requestId);
      setMessages(arr||[]);
    } catch (e) {
      setMessages([]);
      show(e?.message || "No autorizado para ver el chat", { type: "error" });
    }
  })(); }, [requestId, show]);
  useEffect(() => { autoScroll(); }, [messages]);

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

  if (!accepted) {
    return (
      <section className="relative overflow-hidden">
        <div className="absolute inset-0 -z-10 bg-gradient-to-br from-[#0A1540] via-[#0B1B4F] to-[#0D2266]" />
        <div className="mx-auto min-h-[calc(100vh-5rem)] max-w-3xl px-4 py-16 text-white">
          <div className="rounded-2xl border border-white/10 bg-white/[0.05] p-8 text-center shadow-xl backdrop-blur">
            <h1 className="text-2xl font-extrabold text-white/95">Chat no disponible</h1>
            <p className="mt-2 text-indigo-200/90">
              Solo se habilita el chat cuando hay una <strong>oferta aceptada</strong>.
            </p>
            <div className="mt-6">
              <Link to={`/requests/${req.id}`} className="rounded-xl bg-indigo-500 px-4 py-2.5 font-semibold text-white shadow hover:bg-indigo-400">
                Volver a la solicitud
              </Link>
            </div>
          </div>
        </div>
      </section>
    );
  }

  if (!canView) {
    return (
      <section className="relative overflow-hidden">
        <div className="absolute inset-0 -z-10 bg-gradient-to-br from-[#0A1540] via-[#0B1B4F] to-[#0D2266]" />
        <div className="mx-auto min-h-[calc(100vh-5rem)] max-w-3xl px-4 py-16 text-white">
          <div className="rounded-2xl border border-white/10 bg-white/[0.05] p-8 text-center shadow-xl backdrop-blur">
            <h1 className="text-2xl font-extrabold text-white/95">Sin acceso al chat</h1>
            <p className="mt-2 text-indigo-200/90">
              Este chat es solo entre el <strong>cliente</strong> y el <strong>proveedor ganador</strong>.
            </p>
            <div className="mt-6">
              <Link to={`/requests/${req.id}`} className="rounded-xl bg-indigo-500 px-4 py-2.5 font-semibold text-white shadow hover:bg-indigo-400">
                Volver a la solicitud
              </Link>
            </div>
          </div>
        </div>
      </section>
    );
  }

  async function send() {
    const msg = text.trim();
    if (!msg) return;
    try {
      const saved = await chatSendMessage(requestId, msg);
      setMessages((xs) => [...xs, saved]);
      setText("");
    } catch (e) {
      show(e?.message || "No autorizado para enviar mensajes", { type: "error" });
    }
  }

  function onKey(e) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      send();
    }
  }

  function autoScroll() {
    const el = listRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }

  return (
    <section className="relative overflow-hidden">
      {/* Fondo oscuro consistente */}
      <div className="absolute inset-0 -z-10 bg-gradient-to-br from-[#0A1540] via-[#0B1B4F] to-[#0D2266]" />
      <div className="pointer-events-none absolute -left-28 top-24 h-72 w-72 rounded-full bg-indigo-600/10 blur-3xl" />
      <div className="pointer-events-none absolute -right-20 bottom-10 h-80 w-80 rounded-full bg-sky-500/5 blur-3xl" />

      <div className="mx-auto min-h-[calc(100vh-5rem)] max-w-4xl px-4 py-8 text-white">
        {/* Header */}
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <div className="min-w-0">
            <div className="mb-1 flex items-center gap-2">
              <StatusBadge status={req.status || "pendiente"} />
              <span className="rounded-full border border-white/10 bg-white/[0.06] px-2 py-0.5 text-xs font-semibold text-indigo-100/90">
                {req.category || "General"}
              </span>
            </div>
            <h1 className="truncate text-2xl font-extrabold text-white/95">
              Chat Â· {req.title}
            </h1>
            <p className="mt-1 text-sm text-indigo-200/80">
              Participantes: <strong>{mapName(ownerId)}</strong> y <strong>{mapName(winnerId)}</strong>
            </p>
          </div>
          <Link
            to={`/requests/${req.id}`}
            className="shrink-0 rounded-xl border border-white/30 px-4 py-2.5 text-sm font-semibold text-white hover:bg-white/5"
          >
            Volver a solicitud
          </Link>
        </div>

        {/* Caja de chat */}
        <div className="rounded-3xl border border-white/10 bg-white/[0.05] shadow-2xl backdrop-blur">
          {/* Mensajes */}
          <div ref={listRef} className="max-h-[60vh] overflow-y-auto px-4 py-5">
            {messages.length === 0 ? (
  <div className="rounded-xl border border-dashed border-white/20 p-8 text-center text-indigo-100/90">
    Empiecen la conversacion!
  </div>
) : (
  <ul className="grid gap-3">
    {messages.map((m) => {
      const fromId = m.from || m.sender;
      const mine = fromId === me;
      const avatar = (
        <div
          className={["mt-4 grid h-8 w-8 place-items-center rounded-full text-xs font-bold",
            mine ? "bg-indigo-500/80 text-white" : "bg-white/20 text-white/90"].join(" ")}
          title={mapName(fromId)}
        >
          {mapName(fromId).slice(0, 1)}
        </div>
      );
      return (
        <li key={m.id} className={`flex items-end gap-2 ${mine ? "justify-end" : "justify-start"}`}>
          {!mine && avatar}
          <div
            className={["max-w-[80%] rounded-2xl border px-3 py-2 text-sm shadow",
              mine ? "border-indigo-300/40 bg-indigo-500/20 text-white/95" : "border-white/10 bg-white/[0.06] text-white/95"].join(" ")}
          >
            <div className="mb-0.5 text-[10px] opacity-70">{mapName(fromId)} • {fmtTime(m.ts)}</div>
            <div className="whitespace-pre-wrap">{m.text}</div>
          </div>
          {mine && avatar}
        </li>
      );
    })}
  </ul>
)}/* Input */}
          <div className="flex items-center gap-2 border-t border-white/10 p-3">
            <textarea
              rows={1}
              value={text}
              onChange={(e) => setText(e.target.value)}
              onKeyDown={onKey}
              placeholder="Escribe un mensajeâ€¦"
              className="w-full resize-none rounded-xl border border-white/15 bg-white/[0.06] px-3 py-2 text-white placeholder-white/60 outline-none focus:ring-2 focus:ring-sky-300/40"
            />
            <button
              onClick={send}
              className="shrink-0 rounded-xl bg-indigo-500 px-4 py-2.5 font-semibold text-white shadow hover:bg-indigo-400 disabled:opacity-60"
              disabled={!text.trim()}
            >
              Enviar
            </button>
          </div>
        </div>

        {/* bloom decor */}
        <div className="pointer-events-none mx-auto mt-6 h-16 max-w-4xl rounded-full bg-gradient-to-r from-transparent via-white/5 to-transparent blur-2xl" />
      </div>
    </section>
  );
}

/* almacenamiento local removido: ahora usa API */


