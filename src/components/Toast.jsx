import { createContext, useContext, useMemo, useState, useCallback, useEffect } from "react";

const ToastCtx = createContext(null);

export function ToastProvider({ children }) {
  const [items, setItems] = useState([]); // [{id, type, message, ttl}]

  const remove = useCallback((id) => {
    setItems((xs) => xs.filter((x) => x.id !== id));
  }, []);

  const show = useCallback((message, { type = "success", ttl = 2400 } = {}) => {
    const id = `${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;
    setItems((xs) => [...xs, { id, type, message, ttl }]);
  }, []);

  const value = useMemo(() => ({ show, remove }), [show, remove]);

  return (
    <ToastCtx.Provider value={value}>
      {children}
      <div className="pointer-events-none fixed inset-x-0 top-16 z-[100] flex justify-center px-4">
        <div className="flex w-full max-w-md flex-col gap-2">
          {items.map((t) => (
            <ToastItem key={t.id} {...t} onClose={() => remove(t.id)} />
          ))}
        </div>
      </div>
    </ToastCtx.Provider>
  );
}

export function useToast() {
  const ctx = useContext(ToastCtx);
  if (!ctx) throw new Error("useToast must be used within <ToastProvider>");
  return ctx;
}

function ToastItem({ id, type, message, ttl, onClose }) {
  useEffect(() => {
    const h = setTimeout(onClose, ttl);
    return () => clearTimeout(h);
  }, [ttl, onClose]);

  const palette =
    type === "error"
      ? "border-rose-300/40 bg-rose-500/10 text-rose-100"
      : type === "warning"
      ? "border-amber-300/40 bg-amber-500/10 text-amber-100"
      : "border-emerald-300/40 bg-emerald-500/10 text-emerald-100";

  return (
    <div
      className={`pointer-events-auto animate-slide-up rounded-xl border px-4 py-2 text-sm shadow-xl backdrop-blur ${palette}`}
      role="status"
      aria-live="polite"
    >
      <div className="flex items-start gap-3">
        <span className="mt-[2px] text-base">🔔</span>
        <div className="flex-1">{message}</div>
        <button
          onClick={onClose}
          className="rounded-lg border border-white/10 bg-white/5 px-2 py-1 text-xs text-white/90 hover:bg-white/10"
        >
          Cerrar
        </button>
      </div>
    </div>
  );
}
