from django.db import migrations, models
import django.db.models.deletion
from django.db.models import Q


class Migration(migrations.Migration):

    dependencies = [
        ('api', '0001_initial'),
    ]

    operations = [
        # Offer único por (request, provider)
        migrations.AddConstraint(
            model_name='offer',
            constraint=models.UniqueConstraint(fields=('request', 'provider'), name='uniq_offer_request_provider'),
        ),
        # Checks de precios/rating
        migrations.AddConstraint(
            model_name='offer',
            constraint=models.CheckConstraint(check=Q(price__gte=0), name='offer_price_gte_0'),
        ),
        migrations.AddConstraint(
            model_name='request',
            constraint=models.CheckConstraint(check=Q(budget__isnull=True) | Q(budget__gte=0), name='request_budget_gte_0_or_null'),
        ),
        migrations.AddConstraint(
            model_name='service',
            constraint=models.CheckConstraint(check=Q(price_from__gte=0), name='service_price_from_gte_0'),
        ),
        migrations.AddConstraint(
            model_name='review',
            constraint=models.CheckConstraint(check=Q(rating__gte=1) & Q(rating__lte=5), name='review_rating_between_1_5'),
        ),
    ]

