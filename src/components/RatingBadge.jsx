// src/components/RatingBadge.jsx
import { lsGetUserRatingStats } from "../api";

export default function RatingBadge({ userId, className = "" }) {
  const { count, avg } = lsGetUserRatingStats(userId);
  if (!count) {
    return (
      <span className={`inline-flex items-center rounded-full border border-white/15 bg-white/[0.06] px-2.5 py-1 text-xs text-indigo-100/85 ${className}`}>
        Sin calificaciones
      </span>
    );
  }
  return (
    <span
      className={`inline-flex items-center gap-2 rounded-full border border-amber-300/40 bg-amber-400/10 px-2.5 py-1 text-sm font-semibold text-amber-100 ${className}`}
      title={`${avg.toFixed(2)} sobre 5 (${count} reseña${count > 1 ? "s" : ""})`}
    >
      {avg.toFixed(1)}★ · {count}
    </span>
  );
}
