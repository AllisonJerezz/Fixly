import { useEffect, useState } from "react";
import { Link } from "react-router-dom";

function loadJSON(key, fallback) {
  try { return JSON.parse(localStorage.getItem(key) || "null") ?? fallback; } catch { return fallback; }
}

export default function NotificationBell() {
  const [open, setOpen] = useState(false);
  const [unread, setUnread] = useState(Number(localStorage.getItem('notif:unread') || 0));
  const [items, setItems] = useState(loadJSON('notif:events', []));

  useEffect(() => {
    function onAdd() {
      setUnread(Number(localStorage.getItem('notif:unread') || 0));
      setItems(loadJSON('notif:events', []));
    }
    window.addEventListener('notif:add', onAdd);
    return () => window.removeEventListener('notif:add', onAdd);
  }, []);

  function markAllRead() {
    try {
      localStorage.setItem('notif:unread', '0');
      localStorage.setItem('notif:events', JSON.stringify([]));
    } catch {}
    setUnread(0);
    setItems([]);
  }

  return (
    <div className="relative">
      <button
        onClick={() => {
          setOpen((v) => !v);
          // Al abrir, NO limpiar: solo refrescar desde storage
          setUnread(Number(localStorage.getItem('notif:unread') || 0));
          setItems(loadJSON('notif:events', []));
        }}
        className="relative rounded-lg px-3 py-1.5 text-slate-700 hover:bg-slate-100"
        title="Notificaciones"
      >
        <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M15 17h5l-1.4-1.4A2 2 0 0 1 18 14.2V11a6 6 0 1 0-12 0v3.2c0 .5-.2 1-.6 1.4L4 17h5" strokeLinecap="round" strokeLinejoin="round" />
          <path d="M9 21h6" strokeLinecap="round" />
        </svg>
        {unread > 0 && (
          <span className="absolute -right-0.5 -top-0.5 inline-flex h-5 min-w-[20px] items-center justify-center rounded-full bg-rose-500 px-1 text-xs font-bold text-white">
            {unread}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute right-0 mt-2 w-80 overflow-hidden rounded-xl border border-slate-200 bg-white shadow-xl">
          <div className="flex items-center justify-between border-b border-slate-200 px-3 py-2">
            <div className="text-sm font-semibold text-slate-700">Notificaciones</div>
            <button onClick={markAllRead} className="text-xs text-slate-500 hover:text-slate-700">Marcar leídas</button>
          </div>
          {items.length === 0 ? (
            <div className="p-4 text-sm text-slate-500">Sin notificaciones</div>
          ) : (
            <ul className="max-h-96 divide-y divide-slate-200 overflow-auto">
              {items.map((it) => (
                <li key={it.id} className="p-3 text-sm">
                  {it.href ? (
                    <Link to={it.href} className="text-slate-800 hover:underline" onClick={() => setOpen(false)}>
                      {it.text}
                    </Link>
                  ) : (
                    <span className="text-slate-800">{it.text}</span>
                  )}
                  <div className="mt-0.5 text-[11px] text-slate-500">{new Date(it.ts).toLocaleString()}</div>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}
