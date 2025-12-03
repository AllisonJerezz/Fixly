from django.contrib import admin
from django.urls import path, include
from api.views import health

urlpatterns = [
    path('admin/', admin.site.urls),
    path('api/health', health),
    path('api/', include('api.urls')),
]
