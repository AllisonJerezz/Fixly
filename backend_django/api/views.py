from django.contrib.auth import authenticate
from django.db.models import Q, Avg, Count
from django.views.decorators.csrf import csrf_exempt
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.response import Response
from rest_framework import status
from rest_framework_simplejwt.tokens import RefreshToken
from django.contrib.auth.tokens import default_token_generator
from django.utils.http import urlsafe_base64_encode, urlsafe_base64_decode
from django.utils.encoding import force_bytes, force_str
from django.core.mail import send_mail
from threading import Thread
from django.core.validators import validate_email
from django.core.exceptions import ValidationError
import re
import logging
logger = logging.getLogger(__name__)

from .models import User, Profile, Request, Offer, Service, Lead, ChatMessage, Review
from .serializers import (
    UserSerializer, ProfileSerializer, RequestSerializer, OfferSerializer,
    ServiceSerializer, LeadSerializer, ChatMessageSerializer, ReviewSerializer
)
import os
import urllib.parse
import json
from pathlib import Path
import time
from django.conf import settings
from django.utils.text import slugify
from rest_framework.permissions import AllowAny
from rest_framework.decorators import permission_classes
try:
    import requests as _requests
except Exception:  # fallback mÃ­nimo con urllib
    _requests = None
    import urllib.request as _urlreq
    import urllib.error as _urlerr


@api_view(['GET'])
@permission_classes([AllowAny])
def health(request):
    return Response({'ok': True, 'ts': request._request.META.get('REQUEST_TIME', '')})


def _jwt_for_user(user):
    token = RefreshToken.for_user(user)
    return str(token.access_token)


def _role_of(user):
    try:
        prof, _ = Profile.objects.get_or_create(user=user)
        return (prof.role or '').strip()
    except Exception:
        return ''


def _is_strong_password(pw):
    if not pw or len(pw) < 6:
        return False
    if not re.search(r'[A-Z]', pw):
        return False
    if not re.search(r'[a-z]', pw):
        return False
    if not re.search(r'\d', pw):
        return False
    return True


@api_view(['POST'])
@permission_classes([AllowAny])
def register(request):
    username = (request.data.get('username') or '').strip().lower()
    email = (request.data.get('email') or '').strip().lower()
    password = request.data.get('password') or ''

    if not username or not email or not password:
        return Response({'error': 'Todos los campos son obligatorios.'}, status=400)

    if len(username) < 3:
        return Response({'error': 'El usuario debe tener al menos 3 caracteres.'}, status=400)

    try:
        validate_email(email)
    except ValidationError:
        return Response({'error': 'Email inválido.'}, status=400)

    if not _is_strong_password(password):
        return Response({
            'error': 'La contraseña debe tener al menos 6 caracteres e incluir mayúsculas, minúsculas y números.'
        }, status=400)

    if User.objects.filter(Q(username=username) | Q(email=email)).exists():
        return Response({'error': 'Usuario o email ya registrados'}, status=409)

    user = User.objects.create_user(username=username, email=email, password=password)

    try:
        user.is_active = False
        user.save(update_fields=["is_active"])
    except Exception:
        logger.exception("Error marcando usuario %s como inactivo tras registro", user.id)

    Profile.objects.get_or_create(user=user)

    Thread(target=_send_verification_email, args=(user,), daemon=True).start()

    return Response({'ok': True, 'user': UserSerializer(user).data}, status=201)


@api_view(['POST'])
@permission_classes([AllowAny])
def login_view(request):
    user_or_email = (request.data.get('userOrEmail') or '').strip().lower()
    password = request.data.get('password') or ''

    if not user_or_email or not password:
        return Response({'error': 'Ingresa usuario/email y contraseña.'}, status=400)

    user = User.objects.filter(Q(username=user_or_email) | Q(email=user_or_email)).first()
    if not user or not user.check_password(password):
        return Response({'error': 'Credenciales invalidas'}, status=401)

    if not user.is_active:
        # Reenvía verificación si el usuario intenta loguear sin activar
        Thread(target=_send_verification_email, args=(user,), daemon=True).start()
        return Response({'error': 'Email no verificado', 'code': 'email_not_verified'}, status=403)

    token = _jwt_for_user(user)
    return Response({'token': token, 'user': UserSerializer(user).data})


def _send_verification_email(user):
    """Envía el correo de verificación. Lanza excepción si algo falla."""
    uid = urlsafe_base64_encode(force_bytes(user.pk))
    token = default_token_generator.make_token(user)
    base = getattr(settings, 'FRONTEND_URL', 'http://localhost:5173').rstrip('/')
    verify_url = f"{base}/verify?uid={uid}&token={urllib.parse.quote(token)}"

    subject = 'Confirma tu cuenta en Fixly'
    txt = (
        f"Hola {user.username},\n\n"
        f"Confirma tu cuenta haciendo clic en el siguiente enlace:\n{verify_url}\n\n"
        f"Si no fuiste tú, ignora este mensaje."
    )
    html = f""" <div style="font-family:system-ui,-apple-system,Segoe UI,Roboto,Ubuntu,'Helvetica Neue',Arial,sans-serif;background:#f8fafc;padding:24px;color:#0f172a">
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width:560px;margin:0 auto;background:#ffffff;border-radius:12px;box-shadow:0 10px 30px rgba(2,6,23,.06);overflow:hidden">
    <tr>
      <td style="padding:24px 24px 8px 24px; text-align:center">
        <div style="font-size:20px;font-weight:700;color:#0f172a">Fixly</div>
      </td>
    </tr>
    <tr>
      <td style="padding:8px 24px 0 24px;">
        <p style="font-size:16px; margin:0 0 12px 0">Hola <strong>{user.username}</strong>,</p>
        <p style="font-size:14px; margin:0 0 16px 0; color:#334155">Confirma tu cuenta haciendo clic en el botón:</p>
        <p style="margin:16px 0">
          <a href="{verify_url}" style="display:inline-block;padding:12px 18px;background:#0ea5e9;color:#fff;border-radius:10px;text-decoration:none;font-weight:600">Confirmar mi cuenta</a>
        </p>
        <p style="font-size:12px; color:#64748b">
          Si el botón no funciona, copia y pega este enlace en tu navegador:<br/>
          <a href="{verify_url}" style="color:#0ea5e9;text-decoration:none">{verify_url}</a>
        </p>
        <p style="font-size:12px; color:#94a3b8">Si no fuiste tú, ignora este mensaje.</p>
      </td>
    </tr>
  </table>
</div>"""

    logger.error("Enviando verificación a %s vía %s", user.email, settings.EMAIL_HOST)
    send_mail(
        subject,
        txt,
        getattr(settings, 'DEFAULT_FROM_EMAIL', 'no-reply@fixly.test'),
        [user.email],
        html_message=html,
        fail_silently=True,
    )
    logger.error("Verificación enviada a %s (send_mail no lanzó error)", user.email)


def _send_password_reset_email(user):
    """Envía el correo de reseteo de contraseña. Lanza excepción si algo falla."""
    uid = urlsafe_base64_encode(force_bytes(user.pk))
    token = default_token_generator.make_token(user)
    base = getattr(settings, 'FRONTEND_URL', 'http://localhost:5173').rstrip('/')
    reset_url = f"{base}/reset-password?uid={uid}&token={urllib.parse.quote(token)}"

    subject = 'Restablece tu contraseña en Fixly'
    txt = (
        f"Hola {user.username},\n\n"
        f"Restablece tu contraseña haciendo clic en este enlace:\n{reset_url}\n\n"
        f"Si no solicitaste esto, ignora el mensaje."
    )
    html = f"""<div style="font-family:system-ui,-apple-system,Segoe UI,Roboto,Ubuntu,'Helvetica Neue',Arial,sans-serif;background:#f8fafc;padding:24px;color:#0f172a">
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width:560px;margin:0 auto;background:#ffffff;border-radius:12px;box-shadow:0 10px 30px rgba(2,6,23,.06);overflow:hidden">
    <tr>
      <td style="padding:24px 24px 8px 24px; text-align:center">
        <div style="font-size:20px;font-weight:700;color:#0f172a">Fixly</div>
      </td>
    </tr>
    <tr>
      <td style="padding:8px 24px 0 24px;">
        <p style="font-size:16px; margin:0 0 12px 0">Hola <strong>{user.username}</strong>,</p>
        <p style="font-size:14px; margin:0 0 16px 0; color:#334155">
          Solicitaste restablecer tu contraseña. Haz clic en el botón:
        </p>
        <p style="margin:16px 0">
          <a href="{reset_url}" style="display:inline-block;padding:12px 18px;background:#0ea5e9;color:#fff;border-radius:10px;text-decoration:none;font-weight:600">Restablecer contraseña</a>
        </p>
        <p style="font-size:12px; color:#64748b">
          Si el botón no funciona, copia este enlace:<br/>
          <a href="{reset_url}" style="color:#0ea5e9;text-decoration:none">{reset_url}</a>
        </p>
        <p style="font-size:12px; color:#94a3b8">
          Si no solicitaste un cambio, ignora este mensaje.
        </p>
      </td>
    </tr>
  </table>
</div>"""

    logger.error("Enviando reset a %s vía %s", user.email, settings.EMAIL_HOST)
    send_mail(
        subject,
        txt,
        getattr(settings, 'DEFAULT_FROM_EMAIL', 'no-reply@fixly.test'),
        [user.email],
        html_message=html,
        fail_silently=True,
    )
    logger.error("Reset enviado a %s (send_mail no lanzó error)", user.email)


@api_view(['POST'])
@permission_classes([AllowAny])
def send_verification_email(request):
    # Usa usuario autenticado si existe; si no, intenta por email/usuario
    u = request.user if getattr(request, 'user', None) and request.user.is_authenticated else None
    if not u:
        idv = (request.data.get('userOrEmail') or '').strip().lower()
        if not idv:
            return Response({'error': 'Falta usuario o email'}, status=400)
        u = User.objects.filter(Q(username=idv) | Q(email=idv)).first()
        if not u:
            return Response({'error': 'No existe usuario'}, status=404)

    # Rate limit simple: 1 solicitud cada 60s por usuario/email
    key = (u.email or str(u.id) or '').lower()
    store = getattr(send_verification_email, '_last', {})
    now = time.time()
    last = store.get(key, 0)
    if now - last < 60:
        return Response(
            {'error': 'Espera antes de reenviar', 'retry_in': int(60 - (now - last))},
            status=429,
        )

    Thread(target=_send_verification_email, args=(u,), daemon=True).start()
    store[key] = now
    setattr(send_verification_email, '_last', store)
    return Response({'ok': True})

@api_view(['POST'])
@permission_classes([AllowAny])
def password_reset_request(request):
    email = (request.data.get('email') or '').strip().lower()
    if not email:
        return Response({'ok': True})

    user = User.objects.filter(email=email).first()
    if user:
        Thread(target=_send_password_reset_email, args=(user,), daemon=True).start()

    # No revelamos si existe o no
    return Response({'ok': True})

    user = User.objects.filter(email=email).first()
    if user:
        try:
            _send_password_reset_email(user)
        except Exception as e:
            # Por seguridad seguimos devolviendo ok, pero lo registramos en logs
            logger.exception("Error enviando correo de reset a %s: %s", user.email, e)

    # No revelamos si existe o no
    return Response({'ok': True})


@api_view(['POST'])
@permission_classes([AllowAny])
def password_reset_confirm(request):
    uidb64 = request.data.get('uid')
    token = request.data.get('token')
    password = (request.data.get('password') or '').strip()
    if not uidb64 or not token or not password:
        return Response({'error': 'Datos faltantes'}, status=400)
    if not _is_strong_password(password):
        return Response({'error': 'La contraseña debe tener al menos 6 caracteres e incluir mayúsculas, minúsculas y números.'}, status=400)
    try:
        uid = force_str(urlsafe_base64_decode(uidb64))
        user = User.objects.get(pk=uid)
    except Exception:
        return Response({'error': 'Token inválido'}, status=400)
    if not default_token_generator.check_token(user, token):
        return Response({'error': 'Token inválido o expirado'}, status=400)
    user.set_password(password)
    user.save(update_fields=['password'])
    return Response({'ok': True})


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def password_change(request):
    old = (request.data.get('oldPassword') or request.data.get('old_password') or '').strip()
    new = (request.data.get('newPassword') or request.data.get('new_password') or '').strip()
    if not old or not new:
        return Response({'error': 'Faltan campos'}, status=400)
    user = request.user
    if not user.check_password(old):
        return Response({'error': 'La contraseña actual no es correcta'}, status=400)
    if not _is_strong_password(new):
        return Response({'error': 'La nueva contraseña debe tener al menos 6 caracteres e incluir mayúsculas, minúsculas y números.'}, status=400)
    user.set_password(new)
    user.save(update_fields=['password'])
    return Response({'ok': True})

@api_view(['GET'])
@permission_classes([AllowAny])
def verify_email(request):
    uidb64 = request.GET.get('uid') or request.query_params.get('uid')
    token = request.GET.get('token') or request.query_params.get('token')
    if not uidb64 or not token:
        return Response({'error': 'Parámetros faltantes'}, status=400)
    try:
        uid = urlsafe_base64_decode(uidb64).decode()
        user = User.objects.get(pk=uid)
    except Exception:
        return Response({'error': 'Token inválido'}, status=400)
    if not default_token_generator.check_token(user, token):
        return Response({'error': 'Token inválido o expirado'}, status=400)
    user.is_active = True
    user.save(update_fields=["is_active"])
    tok = _jwt_for_user(user)
    return Response({'verified': True, 'token': tok, 'user': UserSerializer(user).data})


@api_view(['GET', 'PUT'])
def profile_view(request):
    if request.method == 'GET':
        u = request.user
        prof, _ = Profile.objects.get_or_create(user=u)
        return Response({'id': str(u.id), 'username': u.username, 'email': u.email, 'profile': ProfileSerializer(prof).data})
    # PUT
    prof, _ = Profile.objects.get_or_create(user=request.user)
    ser = ProfileSerializer(prof, data=request.data, partial=True)
    if ser.is_valid():
        ser.save()
        return Response(ser.data)
    return Response({'error': 'Datos invalidos', 'issues': ser.errors}, status=400)


@api_view(['GET', 'POST'])
def requests_view(request):
    if request.method == 'GET':
        qs = Request.objects.all().order_by('-created_at').prefetch_related('offers')
        data = RequestSerializer(qs, many=True).data
        return Response(data)
    # POST
    if not request.user.is_authenticated:
        return Response({'error': 'Autenticación requerida'}, status=401)
    if _role_of(request.user) != 'client':
        return Response({'error': 'Solo clientes pueden crear solicitudes'}, status=403)
    # Validación rápida de presupuesto no negativo
    try:
        b = request.data.get('budget', None)
        if b not in (None, "", "null"):
            if float(b) < 0:
                return Response({'error': 'El presupuesto no puede ser negativo'}, status=400)
    except Exception:
        return Response({'error': 'Presupuesto inválido'}, status=400)
    ser = RequestSerializer(data=request.data)
    if ser.is_valid():
        obj = Request.objects.create(owner=request.user, **{k: v for k, v in ser.validated_data.items() if k != 'owner'})
        return Response(RequestSerializer(obj).data, status=201)
    return Response({'error': 'Datos invalidos', 'issues': ser.errors}, status=400)


@api_view(['GET', 'PUT', 'DELETE'])
def request_view(request, request_id):
    try:
        obj = Request.objects.prefetch_related('offers').get(id=request_id)
    except Request.DoesNotExist:
        return Response({'error': 'No encontrado'}, status=404)
    if request.method == 'GET':
        return Response(RequestSerializer(obj).data)
    if request.method == 'PUT':
        if obj.owner != request.user:
            return Response({'error': 'Prohibido'}, status=403)
        if _role_of(request.user) != 'client':
            return Response({'error': 'Solo clientes pueden editar sus solicitudes'}, status=403)
        ser = RequestSerializer(obj, data=request.data, partial=True)
        if ser.is_valid():
            ser.save()
            return Response(RequestSerializer(obj).data)
        return Response({'error': 'Datos invalidos', 'issues': ser.errors}, status=400)
    # DELETE
    if obj.owner != request.user:
        return Response({'error': 'Prohibido'}, status=403)
    if _role_of(request.user) != 'client':
        return Response({'error': 'Solo clientes pueden eliminar sus solicitudes'}, status=403)
    obj.delete()
    return Response({'ok': True})


@api_view(['GET', 'POST'])
def offers_view(request, request_id):
    try:
        req = Request.objects.get(id=request_id)
    except Request.DoesNotExist:
        return Response({'error': 'Solicitud no existe'}, status=404)
    if request.method == 'GET':
        return Response(OfferSerializer(req.offers.order_by('-created_at'), many=True).data)
    # POST upsert my offer
    me = request.user
    if not me.is_authenticated:
        return Response({'error': 'Autenticación requerida'}, status=401)
    if _role_of(me) != 'provider':
        return Response({'error': 'Solo proveedores pueden enviar ofertas'}, status=403)
    if req.owner_id == me.id:
        return Response({'error': 'No puedes ofertar a tu propia solicitud'}, status=400)
    # Validación de precio no negativo
    try:
        p = request.data.get('price', 0)
        if float(p) < 0:
            return Response({'error': 'El precio no puede ser negativo'}, status=400)
    except Exception:
        return Response({'error': 'Precio inválido'}, status=400)
    off = req.offers.filter(provider=me).first()
    if off:
        off.message = request.data.get('message', off.message)
        off.price = request.data.get('price', off.price) or 0
        off.status = 'accepted' if off.status == 'accepted' else 'pending'
        off.save()
        return Response(OfferSerializer(off).data)
    off = Offer.objects.create(request=req, provider=me, message=request.data.get('message', ''), price=request.data.get('price', 0))
    return Response(OfferSerializer(off).data, status=201)


@api_view(['POST'])
def offer_accept(request, request_id, offer_id):
    try:
        req = Request.objects.prefetch_related('offers').get(id=request_id)
    except Request.DoesNotExist:
        return Response({'error': 'Solicitud no existe'}, status=404)
    if req.owner != request.user:
        return Response({'error': 'Prohibido'}, status=403)
    if not req.offers.filter(id=offer_id).exists():
        return Response({'error': 'Oferta no existe'}, status=404)
    req.offers.update(status='rejected')
    req.offers.filter(id=offer_id).update(status='accepted')
    if req.status == 'pendiente':
        req.status = 'en_progreso'
        req.save()
    return Response({'ok': True})


@api_view(['POST'])
def offer_reject(request, request_id, offer_id):
    try:
        req = Request.objects.get(id=request_id)
    except Request.DoesNotExist:
        return Response({'error': 'Solicitud no existe'}, status=404)
    if req.owner != request.user:
        return Response({'error': 'Prohibido'}, status=403)
    try:
        off = Offer.objects.get(id=offer_id, request=req)
    except Offer.DoesNotExist:
        return Response({'error': 'Oferta no existe'}, status=404)
    off.status = 'rejected'
    off.save()
    return Response({'ok': True})


@api_view(['GET', 'POST'])
def services_view(request):
    if request.method == 'GET':
        return Response(ServiceSerializer(Service.objects.all().order_by('-created_at'), many=True).data)
    if not request.user.is_authenticated:
        return Response({'error': 'Autenticación requerida'}, status=401)
    if _role_of(request.user) != 'provider':
        return Response({'error': 'Solo proveedores pueden crear servicios'}, status=403)
    ser = ServiceSerializer(data=request.data)
    if ser.is_valid():
        obj = Service.objects.create(owner=request.user, **{k: v for k, v in ser.validated_data.items() if k != 'owner'})
        return Response(ServiceSerializer(obj).data, status=201)
    return Response({'error': 'Datos invalidos', 'issues': ser.errors}, status=400)


@api_view(['GET', 'PUT', 'DELETE'])
def service_view(request, service_id):
    try:
        s = Service.objects.get(id=service_id)
    except Service.DoesNotExist:
        return Response({'error': 'No encontrado'}, status=404)
    if request.method == 'GET':
        return Response(ServiceSerializer(s).data)
    if s.owner != request.user:
        return Response({'error': 'Prohibido'}, status=403)
    if _role_of(request.user) != 'provider':
        return Response({'error': 'Solo proveedores pueden editar/eliminar sus servicios'}, status=403)
    if request.method == 'PUT':
        ser = ServiceSerializer(s, data=request.data, partial=True)
        if ser.is_valid():
            ser.save()
            return Response(ServiceSerializer(s).data)
        return Response({'error': 'Datos invalidos', 'issues': ser.errors}, status=400)
    s.delete()
    return Response({'ok': True})


@api_view(['GET'])
def my_services(request):
    return Response(ServiceSerializer(Service.objects.filter(owner=request.user).order_by('-created_at'), many=True).data)


@api_view(['POST'])
def lead_create(request, service_id):
    try:
        s = Service.objects.get(id=service_id)
    except Service.DoesNotExist:
        return Response({'error': 'Servicio no existe'}, status=404)
    if not request.user.is_authenticated:
        return Response({'error': 'Autenticación requerida'}, status=401)
    if _role_of(request.user) != 'client':
        return Response({'error': 'Solo clientes pueden contactar a un proveedor'}, status=403)
    lead = Lead.objects.create(service=s, provider=s.owner, client=request.user,
                               message=request.data.get('message', ''), contact=request.data.get('contact', ''))
    return Response(LeadSerializer(lead).data, status=201)


@api_view(['GET'])
def my_leads(request):
    return Response(LeadSerializer(Lead.objects.filter(provider=request.user).order_by('-created_at'), many=True).data)


@api_view(['GET', 'POST'])
@permission_classes([IsAuthenticated])
def chat_view(request, request_id):
    try:
        req = Request.objects.prefetch_related('offers').get(id=request_id)
    except Request.DoesNotExist:
        return Response({'error': 'Solicitud no existe'}, status=404)
    # authorize
    winner = req.offers.filter(status='accepted').first()
    if not winner:
        return Response({'error': 'No hay oferta aceptada para esta solicitud.'}, status=400)
    # ComparaciÃ³n robusta por IDs para evitar problemas de identidad
    uid = str(request.user.id)
    owner_id = str(req.owner_id)
    provider_id = str(winner.provider_id)
    allowed_ids = {owner_id, provider_id}
    # Fallback adicional por username (por si el front no refrescÃ³ el id todavÃ­a)
    owner_username = (req.owner.username or '').lower()
    me_username = (request.user.username or '').lower()
    if uid not in allowed_ids and me_username != owner_username:
        return Response({'error': 'No autorizado.', 'who': uid, 'owner': owner_id, 'provider': provider_id, 'me_username': me_username, 'owner_username': owner_username}, status=403)
    if request.method == 'GET':
        return Response(ChatMessageSerializer(ChatMessage.objects.filter(request=req).order_by('ts'), many=True).data)
    # POST
    # Normaliza saltos de lÃ­nea y elimina secuencias literales "\\n"
    raw = request.data.get('text') or ''
    try:
        text = str(raw)
    except Exception:
        text = f"{raw}"
    text = text.replace('\r\n', '\n').replace('\r', '\n').replace('\\n', '\n').strip()
    if not text:
        return Response({'error': 'Texto vacio'}, status=400)
    recipient = winner.provider if request.user == req.owner else req.owner
    msg = ChatMessage.objects.create(request=req, sender=request.user, recipient=recipient, text=text)
    return Response(ChatMessageSerializer(msg).data, status=201)


@api_view(['POST'])
def review_create(request):
    # Validar rating 1..5
    try:
        r = int(request.data.get('rating'))
        if r < 1 or r > 5:
            return Response({'error': 'El rating debe estar entre 1 y 5'}, status=400)
    except Exception:
        return Response({'error': 'Rating inválido'}, status=400)
    ser = ReviewSerializer(data=request.data)
    if ser.is_valid():
        obj = Review.objects.create(
            request_id=ser.validated_data['request'].id,
            to_user_id=ser.validated_data['to_user'].id,
            from_user=request.user,
            rating=ser.validated_data['rating'],
            comment=ser.validated_data.get('comment', ''),
        )
        return Response(ReviewSerializer(obj).data, status=201)
    return Response({'error': 'Datos invalidos', 'issues': ser.errors}, status=400)


@api_view(['GET'])
@permission_classes([AllowAny])
def user_reviews(request, user_id):
    return Response(ReviewSerializer(Review.objects.filter(to_user_id=user_id).order_by('-created_at'), many=True).data)


@api_view(['GET'])
@permission_classes([AllowAny])
def user_rating(request, user_id):
    agg = Review.objects.filter(to_user_id=user_id).aggregate(count=Count('id'), avg=Avg('rating'))
    return Response({'count': agg['count'] or 0, 'avg': float(agg['avg'] or 0)})


@api_view(['GET'])
@permission_classes([AllowAny])
def user_detail(request, user_id):
    try:
        u = User.objects.get(id=user_id)
        prof, _ = Profile.objects.get_or_create(user=u)
        return Response({
            'id': str(u.id),
            'username': u.username,
            'email': u.email,
            'profile': ProfileSerializer(prof).data,
        })
    except User.DoesNotExist:
        return Response({'error': 'Usuario no encontrado'}, status=404)


# ===== Assistant (Ollama local) =====

def _load_faq_entries():
    try:
        base = getattr(settings, 'BASE_DIR', Path(__file__).resolve().parent.parent)
        p = Path(base) / 'assistant' / 'faq.json'
        with open(p, 'r', encoding='utf-8') as f:
            return json.load(f)
    except Exception:
        return []


def _pick_relevant_faq(message, k=5):
    msg = (message or '').lower()
    if not msg:
        return []
    words = [w for w in slugify(msg).split('-') if len(w) > 2]
    if not words:
        words = msg.split()
    entries = _load_faq_entries()
    def score(item):
        t = (item.get('q','') + ' ' + item.get('a','')).lower()
        return sum(1 for w in words if w and w in t)
    ranked = sorted(entries, key=score, reverse=True)
    return ranked[:k]


def _ollama_chat(messages, model=None, base_url=None, temperature=0.2):
    model = model or os.getenv('OLLAMA_MODEL', 'phi3.5:3.8b')
    base_url = base_url or os.getenv('OLLAMA_BASE_URL', 'http://127.0.0.1:11434')
    url = f"{base_url.rstrip('/')}/api/chat"
    payload = {
        'model': model,
        'messages': messages,
        'stream': False,  # devolver JSON Ãºnico (no NDJSON)
        'keep_alive': os.getenv('OLLAMA_KEEP_ALIVE', '30m'),
        'options': { 'temperature': temperature, 'num_predict': int(os.getenv('OLLAMA_NUM_PREDICT','256')), 'num_thread': int(os.getenv('OLLAMA_THREADS','4')) }
    }
    data = json.dumps(payload).encode('utf-8')
    headers = { 'Content-Type': 'application/json' }
    try:
        if _requests is not None:
            r = _requests.post(url, json=payload, timeout=60)
            r.raise_for_status()
            return r.json().get('message', {}).get('content', '')
        # urllib fallback
        req = _urlreq.Request(url, data=data, headers=headers)
        with _urlreq.urlopen(req, timeout=60) as resp:
            js = json.loads(resp.read().decode('utf-8'))
            return js.get('message', {}).get('content', '')
    except Exception as e:
        raise RuntimeError(f"Ollama error: {e}")


def _embed_ollama(text, base_url=None, model=None):
    """Obtiene un embedding desde Ollama para el texto dado."""
    base_url = base_url or os.getenv('OLLAMA_BASE_URL', 'http://127.0.0.1:11434')
    model = model or os.getenv('OLLAMA_EMBED_MODEL', 'nomic-embed-text')
    url = f"{base_url.rstrip('/')}/api/embeddings"
    payload = {'model': model, 'input': text}
    data = json.dumps(payload).encode('utf-8')
    headers = {'Content-Type': 'application/json'}
    if _requests is not None:
        r = _requests.post(url, json=payload, timeout=120)
        r.raise_for_status()
        return r.json().get('embedding', [])
    req = _urlreq.Request(url, data=data, headers=headers)
    with _urlreq.urlopen(req, timeout=120) as resp:
        js = json.loads(resp.read().decode('utf-8'))
        return js.get('embedding', [])


@api_view(['POST'])
@permission_classes([AllowAny])
def assistant_chat(request):
    """Chat simple con modelo local (Ollama).
    Body esperado: { message: str, history?: [{role, content}] }
    """
    message = (request.data.get('message') or '').strip()
    history = request.data.get('history') or []
    if not message:
        return Response({'error': 'Falta message'}, status=400)

    # Contexto FAQ bÃ¡sico (MVP)
    top = _pick_relevant_faq(message, k=5)
    ctx = "\n\n".join([f"Q: {x.get('q','')}\nA: {x.get('a','')}" for x in top])
    system = (
        "Eres un asistente de Fixly en espaÃ±ol. Responde conciso y Ãºtil basÃ¡ndote en el contexto. "
        "Si algo no estÃ¡ en el contexto, dilo y sugiere pasos prÃ¡cticos.\n\n"
        f"Contexto:\n{ctx or '- (sin entradas relevantes)'}"
    )

    # Override con RAG + FAQ si hay Ã­ndice disponible
    try:
        base = getattr(settings, 'BASE_DIR', Path(__file__).resolve().parent.parent)
        idx = (Path(base) / 'assistant' / 'index.json')
        faq_items = _pick_relevant_faq(message, k=3)
        faq_ctx = "\n\n".join([f"Q: {x.get('q','')}\nA: {x.get('a','')}" for x in faq_items])
        rag_ctx = ''
        if idx.exists():
            js = json.loads(idx.read_text(encoding='utf-8'))
            items = js.get('items', [])
            qv = _embed_ollama(message)
            def cos(a, b):
                try:
                    num = sum(x*y for x, y in zip(a, b))
                    da = sum(x*x for x in a) ** 0.5
                    db = sum(y*y for y in b) ** 0.5
                    return num / (da*db + 1e-8)
                except Exception:
                    return 0.0
            ranked = sorted(items, key=lambda it: cos(qv, it.get('vector') or []), reverse=True)
            k = int(os.getenv('ASSISTANT_RAG_K', '3'))
            topk = ranked[:k]
            rag_ctx = "\n\n".join([f"[Fuente: {t.get('path')}#{t.get('chunk')}]\n{t.get('text','')}" for t in topk])
        system = (
            "Eres un asistente de Fixly en espaÃ±ol. Responde conciso y Ãºtil basÃ¡ndote en el contexto. "
            "Si algo no estÃ¡ en el contexto, dilo y sugiere pasos prÃ¡cticos.\n\n"
            f"Contexto (RAG):\n{rag_ctx or '-'}\n\n"
            f"Contexto (FAQ):\n{faq_ctx or '-'}"
        )
    except Exception:
        pass
    msgs = [{'role': 'system', 'content': system}]
    # Sanear history (mÃ¡ximo 8 turnos)
    try:
        for h in (history or [])[-4:]:
            r = (h.get('role') or '').lower()
            c = (h.get('content') or '').strip()
            if r in ('user','assistant') and c:
                msgs.append({'role': r, 'content': c})
    except Exception:
        pass
    msgs.append({'role': 'user', 'content': message})

    try:
        reply = _ollama_chat(msgs)
        reply = reply.strip() or 'Lo siento, no pude generar una respuesta.'
        return Response({'reply': reply})
    except RuntimeError as e:
        return Response({'error': str(e)}, status=503)




