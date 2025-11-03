from django.contrib import admin
from django.db import transaction
from .models import User, Profile, Request, Offer, Service, Lead, ChatMessage, Review


@admin.register(User)
class UserAdmin(admin.ModelAdmin):
  list_display = ("id", "username", "email", "is_active", "is_staff", "date_joined")
  search_fields = ("username", "email")
  list_filter = ("is_active", "is_staff")


@admin.register(Profile)
class ProfileAdmin(admin.ModelAdmin):
  list_display = ("user", "display_name", "role", "location")
  search_fields = ("user__username", "display_name", "location")
  list_filter = ("role",)


class OfferInline(admin.TabularInline):
  model = Offer
  extra = 0
  fields = ("provider", "price", "status", "created_at")
  readonly_fields = ("created_at",)
  show_change_link = True
  classes = ("collapse",)


class ChatMessageInline(admin.TabularInline):
  model = ChatMessage
  extra = 0
  fields = ("sender", "recipient", "text", "ts")
  readonly_fields = ("sender", "recipient", "text", "ts")
  classes = ("collapse",)


@admin.register(Request)
class RequestAdmin(admin.ModelAdmin):
  list_display = ("id", "title", "owner", "status", "category", "urgency", "created_at")
  search_fields = ("title", "description", "owner__username", "category", "location")
  list_filter = ("status", "urgency", "category")
  date_hierarchy = "created_at"
  inlines = [OfferInline, ChatMessageInline]

  actions = [
    "mark_pendiente",
    "mark_en_progreso",
    "mark_completado",
    "mark_cancelado",
  ]

  @admin.action(description="Marcar como pendiente")
  def mark_pendiente(self, request, queryset):
    queryset.update(status="pendiente")

  @admin.action(description="Marcar como en progreso")
  def mark_en_progreso(self, request, queryset):
    queryset.update(status="en_progreso")

  @admin.action(description="Marcar como completado")
  def mark_completado(self, request, queryset):
    queryset.update(status="completado")

  @admin.action(description="Marcar como cancelado")
  def mark_cancelado(self, request, queryset):
    queryset.update(status="cancelado")


@admin.register(Offer)
class OfferAdmin(admin.ModelAdmin):
  list_display = ("id", "request", "provider", "price", "status", "created_at")
  search_fields = ("request__title", "provider__username")
  list_filter = ("status",)
  date_hierarchy = "created_at"
  list_select_related = ("request", "provider")

  actions = ["accept_selected_offers", "reject_selected_offers"]

  @admin.action(description="Aceptar oferta seleccionada (una por solicitud)")
  @transaction.atomic
  def accept_selected_offers(self, request, queryset):
    for off in queryset.select_related("request"):
      req = off.request
      Offer.objects.filter(request=req).exclude(pk=off.pk).update(status="rejected")
      Offer.objects.filter(pk=off.pk).update(status="accepted")
      if req.status == "pendiente":
        req.status = "en_progreso"
        req.save(update_fields=["status"]) 

  @admin.action(description="Rechazar ofertas seleccionadas")
  def reject_selected_offers(self, request, queryset):
    queryset.update(status="rejected")


@admin.register(Service)
class ServiceAdmin(admin.ModelAdmin):
  list_display = ("id", "title", "owner", "category", "price_from", "status", "created_at")
  search_fields = ("title", "owner__username", "category", "location")
  list_filter = ("status", "category")
  date_hierarchy = "created_at"
  list_select_related = ("owner",)


@admin.register(Lead)
class LeadAdmin(admin.ModelAdmin):
  list_display = ("id", "service", "provider", "client", "status", "created_at")
  search_fields = ("service__title", "provider__username", "client__username")
  list_filter = ("status",)
  date_hierarchy = "created_at"
  list_select_related = ("service", "provider", "client")


@admin.register(ChatMessage)
class ChatMessageAdmin(admin.ModelAdmin):
  list_display = ("id", "request", "sender", "recipient", "ts")
  search_fields = ("request__title", "sender__username", "recipient__username", "text")
  date_hierarchy = "ts"
  list_select_related = ("request", "sender", "recipient")


@admin.register(Review)
class ReviewAdmin(admin.ModelAdmin):
  list_display = ("id", "request", "to_user", "from_user", "rating", "created_at")
  search_fields = ("request__title", "to_user__username", "from_user__username", "comment")
  list_filter = ("rating",)
  date_hierarchy = "created_at"