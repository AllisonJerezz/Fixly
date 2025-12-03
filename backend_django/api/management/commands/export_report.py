import os
from pathlib import Path
from datetime import datetime, timedelta

from django.core.management.base import BaseCommand
from django.utils import timezone

from api.models import Request, Offer, Review, Service, Lead


def fmt(n):
    try:
        return f"{float(n):,.0f}".replace(",", ".")
    except Exception:
        return str(n)


class Command(BaseCommand):
    help = "Genera un reporte (HTML y opcionalmente PDF) con KPIs del sistema."

    def add_arguments(self, parser):
        parser.add_argument("--outdir", default="reports", help="Carpeta de salida (por defecto: reports)")
        parser.add_argument("--days", type=int, default=30, help="Ventana de días para resumen temporal (default 30)")

    def handle(self, *args, **opts):
        outdir = Path(opts["outdir"]).resolve()
        outdir.mkdir(parents=True, exist_ok=True)

        now = timezone.now()
        ts = now.strftime("%Y-%m-%d_%H%M")

        # KPIs generales
        total_requests = Request.objects.count()
        by_status = (
            Request.objects.values_list("status").order_by().annotate(cnt_count=__import__("django").db.models.Count("id"))
        )
        status_rows = [(s or "-", c) for s, c in by_status]

        offers_total = Offer.objects.count()
        offers_accepted = Offer.objects.filter(status="accepted").count()
        acceptance_rate = (offers_accepted / offers_total * 100) if offers_total else 0

        # Precio aceptado promedio
        from django.db.models import Avg
        avg_accepted_price = Offer.objects.filter(status="accepted").aggregate(avg=Avg("price")).get("avg") or 0

        # Top 5 categorías por solicitudes
        by_category = (
            Request.objects.values_list("category").order_by().annotate(cnt_count=__import__("django").db.models.Count("id")).order_by("-cnt_count")[:5]
        )
        category_rows = [(c or "-", n) for c, n in by_category]

        # Serie temporal últimos N días
        days = int(opts["days"]) or 30
        start = (now - timedelta(days=days)).date()
        series = []
        for d in (start + timedelta(days=i) for i in range(days + 1)):
            c = Request.objects.filter(created_at__date=d).count()
            series.append((d.isoformat(), c))

        # Construir HTML
        html = f"""
<!doctype html>
<html lang=\"es\">
<head>
  <meta charset=\"utf-8\" />
  <title>Reporte Fixly - {ts}</title>
  <style>
    body {{ font-family: Arial, Helvetica, sans-serif; color:#1f2937; }}
    .wrap {{ max-width: 900px; margin: 0 auto; padding: 24px; }}
    h1 {{ font-size: 22px; margin: 0 0 12px; }}
    h2 {{ font-size: 18px; margin: 24px 0 8px; }}
    table {{ border-collapse: collapse; width: 100%; margin: 8px 0 16px; }}
    th, td {{ border: 1px solid #e5e7eb; padding: 6px 8px; text-align: left; }}
    th {{ background: #f3f4f6; font-weight: 600; }}
    .kpis {{ display: grid; grid-template-columns: repeat(3,1fr); gap: 12px; margin: 12px 0 16px; }}
    .card {{ border:1px solid #e5e7eb; border-radius:8px; padding:12px; background:#fafafa; }}
    .muted {{ color:#6b7280; font-size:12px; }}
  </style>
  <meta name=\"viewport\" content=\"width=device-width, initial-scale=1\" />
  <meta name=\"generator\" content=\"Django export_report\" />
  <meta name=\"created\" content=\"{ts}\" />
  <meta name=\"robots\" content=\"noindex\" />
  <meta name=\"description\" content=\"Reporte automático de Fixly\" />
  <meta charset=\"utf-8\" />
  <meta http-equiv=\"Content-Type\" content=\"text/html; charset=utf-8\" />
</head>
<body>
  <div class=\"wrap\">
    <h1>Reporte automático — Fixly</h1>
    <div class=\"muted\">Generado: {now.strftime('%Y-%m-%d %H:%M')}</div>

    <div class=\"kpis\">
      <div class=\"card\"><div>Total solicitudes</div><div><strong>{fmt(total_requests)}</strong></div></div>
      <div class=\"card\"><div>Total ofertas</div><div><strong>{fmt(offers_total)}</strong></div></div>
      <div class=\"card\"><div>Tasa aceptación</div><div><strong>{acceptance_rate:.1f}%</strong></div></div>
    </div>

    <h2>Solicitudes por estado</h2>
    <table><thead><tr><th>Estado</th><th>Cantidad</th></tr></thead><tbody>
      {''.join(f'<tr><td>{s}</td><td>{fmt(c)}</td></tr>' for s,c in status_rows)}
    </tbody></table>

    <h2>Precio aceptado promedio</h2>
    <div class=\"card\">CLP <strong>{fmt(avg_accepted_price)}</strong></div>

    <h2>Top 5 categorías por solicitudes</h2>
    <table><thead><tr><th>Categoría</th><th>Cantidad</th></tr></thead><tbody>
      {''.join(f'<tr><td>{c}</td><td>{fmt(n)}</td></tr>' for c,n in category_rows)}
    </tbody></table>

    <h2>Solicitudes por día (últimos {days} días)</h2>
    <table><thead><tr><th>Fecha</th><th>Cantidad</th></tr></thead><tbody>
      {''.join(f'<tr><td>{d}</td><td>{fmt(n)}</td></tr>' for d,n in series)}
    </tbody></table>

    <div class=\"muted\">Fuente: vistas bi.* o tablas api_*.</div>
  </div>
</body>
</html>
"""

        html_path = outdir / f"report_{ts}.html"
        html_path.write_text(html, encoding="utf-8")
        self.stdout.write(self.style.SUCCESS(f"HTML generado: {html_path}"))

        # Intentar PDF con WeasyPrint si está instalado
        try:
            from weasyprint import HTML
            pdf_path = outdir / f"report_{ts}.pdf"
            HTML(string=html, base_url=str(outdir)).write_pdf(target=str(pdf_path))
            self.stdout.write(self.style.SUCCESS(f"PDF generado: {pdf_path}"))
        except Exception as e:
            self.stdout.write(self.style.WARNING(
                f"PDF no generado (WeasyPrint no disponible o error: {e}). Conservado HTML."))

