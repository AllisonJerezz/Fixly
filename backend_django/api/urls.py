from django.urls import path
from . import views as v

urlpatterns = [
    path('auth/register', v.register),
    path('auth/login', v.login_view),
    path('auth/send-verification', v.send_verification_email),
    path('auth/verify', v.verify_email),
    path('auth/password-reset', v.password_reset_request),
    path('auth/password-reset/confirm', v.password_reset_confirm),
    path('auth/password-change', v.password_change),

    path('profile', v.profile_view),  # GET/PUT

    path('requests', v.requests_view),  # GET/POST
    path('requests/<uuid:request_id>', v.request_view),  # GET/PUT/DELETE
    path('requests/<uuid:request_id>/offers', v.offers_view),  # GET/POST
    path('requests/<uuid:request_id>/offers/<uuid:offer_id>/accept', v.offer_accept),
    path('requests/<uuid:request_id>/offers/<uuid:offer_id>/reject', v.offer_reject),

    path('services', v.services_view),  # GET/POST
    path('services/me', v.my_services),
    path('services/<uuid:service_id>', v.service_view),  # GET/PUT/DELETE

    path('services/<uuid:service_id>/contact', v.lead_create),
    path('me/leads', v.my_leads),

    path('chats/<uuid:request_id>/messages', v.chat_view),  # GET/POST

    path('reviews', v.review_create),
    path('users/<uuid:user_id>/reviews', v.user_reviews),
    path('users/<uuid:user_id>/rating', v.user_rating),
    path('users/<uuid:user_id>', v.user_detail),

    # Assistant (Ollama local)
    path('assistant/chat', v.assistant_chat),
]
