// src/components/ToastProvider.jsx
import { createContext, useContext, useMemo, useCallback, useState, useRef } from "react";

const ToastCtx = createContext(null);
const DEFAULT_DURATION = 4500;

const TYPES = {
  success: {
    ring: "ring-emerald-300",
    bg: "bg-white",
    text: "text-slate-900",
    chip: "bg-emerald-50 text-emerald-700 border-emerald-200",
    icon: (
      <svg viewBox="0 0 24 24" className="h-5 w-5">
        <path d="m5 13 4 4L19 7" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
      </svg>
    ),
  },
  error: {
    ring: "ring-rose-300",
    bg: "bg-white",
    text: "text-slate-900",
    chip: "bg-rose-50 text-rose-700 border-rose-200",
    icon: (
      <svg viewBox="0 0 24 24" className="h-5 w-5">
        <path d="M12 9v4m0 4h.01M10.29 3.86 1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0Z" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
      </svg>
    ),
  },
  info: {
    ring: "ring-sky-300",
    bg: "bg-white",
    text: "text-slate-900",
    chip: "bg-sky-50 text-sky-700 border-sky-200",
    icon: (
      <svg viewBox="0 0 24 24" className="h-5 w-5">
        <circle cx="12" cy="12" r="10" fill="none" stroke="currentColor" strokeWidth="2"/>
        <path d="M12 8h.01M11 12h2v4h-2z" fill="currentColor"/>
      </svg>
    ),
  },
  warning: {
    ring: "ring-amber-300",
    bg: "bg-white",
    text: "text-slate-900",
    chip: "bg-amber-50 text-amber-800 border-amber-300",
    icon: (
      <svg viewBox="0 0 24 24" className="h-5 w-5">
        <path d="M12 9v4m0 4h.01M10.29 3.86 1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0Z" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
      </svg>
    ),
  },
};

function ToastItem({ t, onClose }) {
  const cfg = TYPES[t.type] || TYPES.info;
  const [hover, setHover] = useState(false);
  const [leaving, setLeaving] = useState(false);
  const [progress, setProgress] = useState(100);
  const startTsRef = useRef(performance.now());
  const leftRef = useRef(t.duration);
  const rafRef = useRef(null);
  const timeoutRef = useRef(null);

  const tick = useCallback((now) => {
    const elapsed = now - startTsRef.current;
    const remain = Math.max(0, leftRef.current - elapsed);
    setProgress((remain / t.duration) * 100);
    if (remain <= 0) {
      setLeaving(true);
      timeoutRef.current = setTimeout(() => onClose(t.id), 160);
      return;
    }
    rafRef.current = requestAnimationFrame(tick);
  }, [t.id, t.duration, onClose]);

  const start = useCallback(() => {
    startTsRef.current = performance.now();
    rafRef.current = requestAnimationFrame(tick);
  }, [tick]);

  const pause = useCallback(() => {
    cancelAnimationFrame(rafRef.current);
    const elapsed = performance.now() - startTsRef.current;
    leftRef.current = Math.max(0, leftRef.current - elapsed);
  }, []);

  useState(() => { start(); });

  return (
    <div
      onMouseEnter={() => { setHover(true); pause(); }}
      onMouseLeave={() => { setHover(false); start(); }}
      className={[
        "pointer-events-auto w-[360px] max-w-[92vw] select-none",
        "transition-all duration-200 ease-out",
        leaving ? "opacity-0 translate-y-2" : "opacity-100 translate-y-0",
      ].join(" ")}
    >
      <div className={["rounded-xl border shadow-lg ring-1 p-3", cfg.bg, cfg.text, cfg.ring, "border-slate-200"].join(" ")}>
        <div className="flex items-start gap-3">
          <div className={["mt-1 grid place-items-center rounded-lg border p-1.5", cfg.chip].join(" ")}>
            {cfg.icon}
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                {t.title && <div className="truncate text-sm font-bold">{t.title}</div>}
                {t.message && <div className="mt-0.5 text-sm text-slate-600">{t.message}</div>}
              </div>
              <button
                aria-label="Cerrar"
                onClick={() => { setLeaving(true); setTimeout(() => onClose(t.id), 160); }}
                className="rounded-md p-2 text-slate-400 hover:bg-slate-100 hover:text-slate-700 transition"
              >
                <svg viewBox="0 0 24 24" className="h-4 w-4">
                  <path d="M18 6 6 18M6 6l12 12" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
                </svg>
              </button>
            </div>
            <div className="mt-2 h-1 w-full overflow-hidden rounded-full bg-slate-100">
              <div
                className="h-full bg-gradient-to-r from-indigo-600 to-blue-600 transition-[width] duration-100 linear"
                style={{ width: `${hover ? 100 : progress}%` }}
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export function ToastProvider({ children, max = 5, duration = DEFAULT_DURATION }) {
  const [items, setItems] = useState([]);

  const remove = useCallback((id) => {
    setItems((prev) => prev.filter((x) => x.id !== id));
  }, []);

  const push = useCallback((type, title, message, opts = {}) => {
    setItems((prev) => {
      const id = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
      const next = [...prev, { id, type, title, message, duration: opts.duration ?? duration }];
      return next.slice(-max);
    });
  }, [duration, max]);

  const api = useMemo(() => ({
    show: (title, message, opts) => push("info", title, message, opts),
    success: (title, message, opts) => push("success", title, message, opts),
    error: (title, message, opts) => push("error", title, message, opts),
    warning: (title, message, opts) => push("warning", title, message, opts),
  }), [push]);

  return (
    <ToastCtx.Provider value={api}>
      {children}
      <div className="pointer-events-none fixed right-4 top-4 z-[9999] flex max-h-[100dvh] flex-col gap-2 overflow-hidden">
        {items.map((t) => (
          <ToastItem key={t.id} t={t} onClose={remove} />
        ))}
      </div>
    </ToastCtx.Provider>
  );
}

export function useToast() {
  const ctx = useContext(ToastCtx);
  if (!ctx) throw new Error("useToast must be used within <ToastProvider>");
  return ctx;
}
