import { useEffect, useRef, useState } from "react";
import { assistantChat } from "../api";

const SUGGESTIONS = [
  "\u00BFC\u00F3mo publico una solicitud?",
  "\u00BFC\u00F3mo env\u00EDo una oferta?",
  "\u00BFC\u00F3mo acepto una oferta?",
  "\u00BFC\u00F3mo publico un servicio?",
  "\u00BFCu\u00E1ndo puedo chatear?",
  "Estados de la solicitud",
];

export default function AssistantWidget() {
  const [open, setOpen] = useState(false);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [messages, setMessages] = useState(() => {
    try { return JSON.parse(localStorage.getItem('assistant:history') || '[]'); } catch { return []; }
  });
  const listRef = useRef(null);

  useEffect(() => {
    try { localStorage.setItem('assistant:history', JSON.stringify(messages || []))} catch {}
  }, [messages]);

  useEffect(() => {
    if (!open) return;
    setTimeout(() => { listRef.current?.scrollTo?.(0, 999999); }, 50);
  }, [open, messages]);

  async function send(text) {
    const msg = String((text ?? input) || "").trim();
    if (!msg || loading) return;
    setInput("");
    const prev = [...messages, { role: 'user', content: msg }];
    setMessages(prev);
    setLoading(true);
    try {
      const res = await assistantChat({ message: msg, history: prev.slice(-8) });
      const reply = (res?.reply || '').trim() || 'Lo siento, no pude responder.';
      setMessages((m) => [...m, { role: 'assistant', content: reply }]);
    } catch (e) {
      setMessages((m) => [...m, { role: 'assistant', content: e?.message || 'Error al consultar el asistente.' }]);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="fixed bottom-6 right-6 z-[100]">
      {!open && (
        <button
          onClick={() => setOpen(true)}
          className="rounded-full bg-indigo-600 p-4 text-white shadow-xl hover:bg-indigo-500"
          title="Abrir ayuda"
        >
          <span aria-hidden="true" className="text-2xl leading-none">🔧</span>
        </button>
      )}

      {open && (
        <div className="w-[320px] sm:w-[380px] rounded-2xl border border-white/15 bg-slate-900/95 text-white shadow-2xl backdrop-blur">
          <div className="flex items-center justify-between px-4 py-3 border-b border-white/10">
            <div className="text-sm font-semibold">Asistente</div>
            <button onClick={() => setOpen(false)} aria-label="Cerrar" title="Cerrar" className="rounded-lg px-2 py-1 text-slate-300 hover:bg-white/10">
              &times;
            </button>
          </div>
          <div className="px-4 pt-2">
            <div className="mb-2 flex flex-wrap gap-2">
              {SUGGESTIONS.map((s) => (
                <button key={s} onClick={() => send(s)} className="rounded-full border border-white/15 bg-white/10 px-2.5 py-1 text-xs text-indigo-100 hover:bg-white/15">
                  {s}
                </button>
              ))}
            </div>
          </div>
          <div ref={listRef} className="max-h-80 overflow-auto px-4 py-3 space-y-2">
            {messages.length === 0 && (
              <div className="text-sm text-indigo-200/80">
                Hola, soy tu asistente. Puedo ayudarte con preguntas frecuentes sobre Fixly.
              </div>
            )}
            {messages.map((m, i) => (
              <div key={i} className={m.role === 'user' ? 'text-right' : ''}>
                <div className={[
                  'inline-block max-w-[85%] rounded-2xl px-3 py-2 text-sm',
                  m.role === 'user'
                    ? 'bg-indigo-600 text-white'
                    : 'bg-white/10 text-white'
                ].join(' ')}>
                  {m.content}
                </div>
              </div>
            ))}
            {loading && <div className="text-sm text-indigo-200/80">Pensando...</div>}
          </div>

          <div className="px-4 pb-3">
            <form onSubmit={(e) => { e.preventDefault(); send(); }} className="flex items-center gap-2">
              <input
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder="Escribe tu pregunta..."
                className="flex-1 rounded-xl border border-white/15 bg-white/10 px-3 py-2 text-sm text-white placeholder-white/60 outline-none focus:ring-2 focus:ring-indigo-400/40"
              />
              <button disabled={loading} className="rounded-xl bg-indigo-600 px-3 py-2 text-sm font-semibold text-white hover:bg-indigo-500 disabled:opacity-60">
                Enviar
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}






