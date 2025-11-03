from django.contrib.auth import authenticate
from django.db.models import Q, Avg, Count
from django.views.decorators.csrf import csrf_exempt
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.response import Response
from rest_framework import status
from rest_framework_simplejwt.tokens import RefreshToken

from .models import User, Profile, Request, Offer, Service, Lead, ChatMessage, Review
from .serializers import (
    UserSerializer, ProfileSerializer, RequestSerializer, OfferSerializer,
    ServiceSerializer, LeadSerializer, ChatMessageSerializer, ReviewSerializer
)


@api_view(['GET'])
@permission_classes([AllowAny])
def health(request):
    return Response({'ok': True, 'ts': request._request.META.get('REQUEST_TIME', '')})


def _jwt_for_user(user):
    token = RefreshToken.for_user(user)
    return str(token.access_token)


@api_view(['POST'])
@permission_classes([AllowAny])
def register(request):
    username = (request.data.get('username') or '').strip().lower()
    email = (request.data.get('email') or '').strip().lower()
    password = request.data.get('password') or ''
    if not username or not email or not password:
        return Response({'error': 'Datos invalidos'}, status=400)
    if User.objects.filter(Q(username=username) | Q(email=email)).exists():
        return Response({'error': 'Usuario o email ya registrados'}, status=409)
    user = User.objects.create_user(username=username, email=email, password=password)
    Profile.objects.get_or_create(user=user)
    token = _jwt_for_user(user)
    return Response({'token': token, 'user': UserSerializer(user).data}, status=201)


@api_view(['POST'])
@permission_classes([AllowAny])
def login_view(request):
    user_or_email = (request.data.get('userOrEmail') or '').strip().lower()
    password = request.data.get('password') or ''
    user = User.objects.filter(Q(username=user_or_email) | Q(email=user_or_email)).first()
    if not user or not user.check_password(password):
        return Response({'error': 'Credenciales invalidas'}, status=401)
    token = _jwt_for_user(user)
    return Response({'token': token, 'user': UserSerializer(user).data})


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
        ser = RequestSerializer(obj, data=request.data, partial=True)
        if ser.is_valid():
            ser.save()
            return Response(RequestSerializer(obj).data)
        return Response({'error': 'Datos invalidos', 'issues': ser.errors}, status=400)
    # DELETE
    if obj.owner != request.user:
        return Response({'error': 'Prohibido'}, status=403)
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
    lead = Lead.objects.create(service=s, provider=s.owner, client=request.user, message=request.data.get('message', ''), contact=request.data.get('contact', ''))
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
    # Comparación robusta por IDs para evitar problemas de identidad
    uid = str(request.user.id)
    owner_id = str(req.owner_id)
    provider_id = str(winner.provider_id)
    allowed_ids = {owner_id, provider_id}
    # Fallback adicional por username (por si el front no refrescó el id todavía)
    owner_username = (req.owner.username or '').lower()
    me_username = (request.user.username or '').lower()
    if uid not in allowed_ids and me_username != owner_username:
        return Response({'error': 'No autorizado.', 'who': uid, 'owner': owner_id, 'provider': provider_id, 'me_username': me_username, 'owner_username': owner_username}, status=403)
    if request.method == 'GET':
        return Response(ChatMessageSerializer(ChatMessage.objects.filter(request=req).order_by('ts'), many=True).data)
    # POST
    # Normaliza saltos de línea y elimina secuencias literales "\\n"
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
