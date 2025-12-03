export default function Empty({ title, subtitle, action }) {
  return (
    <div className="animate-fade-in rounded-2xl border border-dashed border-white/20 p-8 text-center text-indigo-100/90">
      <div className="mx-auto mb-3 grid h-12 w-12 place-items-center rounded-full border border-white/10 bg-white/[0.05]">
        <span className="text-xl">✨</span>
      </div>
      <h3 className="text-lg font-extrabold text-white/95">{title}</h3>
      {subtitle && <p className="mt-1 text-sm">{subtitle}</p>}
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
}
