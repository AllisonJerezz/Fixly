export default function StatusBadge({ status = "pendiente", className = "" }) {
  const label = String(status || "").replace(/_/g, " ").toLowerCase();
  const s = label;
  const styles = {
    "pendiente":  "border-amber-300 bg-amber-50 text-amber-800",
    "en progreso":"border-sky-300 bg-sky-50 text-sky-800",
    "completado": "border-emerald-300 bg-emerald-50 text-emerald-800",
    "cancelado":  "border-rose-300 bg-rose-50 text-rose-800",
  };
  const base = "inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold";
  return <span className={`${base} ${styles[s] || styles["pendiente"]} ${className}`} children={label || "pendiente"} />;
}
