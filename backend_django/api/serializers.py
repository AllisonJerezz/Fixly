from rest_framework import serializers
from .models import User, Profile, Request, Offer, Service, Lead, ChatMessage, Review


class UserSerializer(serializers.ModelSerializer):
    class Meta:
        model = User
        fields = ('id', 'username', 'email')


class ProfileSerializer(serializers.ModelSerializer):
    class Meta:
        model = Profile
        fields = ('display_name', 'photo_url', 'role', 'location', 'bio')


class OfferSerializer(serializers.ModelSerializer):
    providerId = serializers.SerializerMethodField()
    providerName = serializers.SerializerMethodField()
    providerPhoto = serializers.SerializerMethodField()

    class Meta:
        model = Offer
        fields = (
            'id', 'request', 'provider',
            'providerId', 'providerName', 'providerPhoto',
            'message', 'price', 'status', 'created_at'
        )
        read_only_fields = ('provider', 'status', 'created_at')

    def get_providerId(self, obj):
        return str(obj.provider_id)

    def get_providerName(self, obj):
        try:
            prof = getattr(obj.provider, 'profile', None)
            name = (getattr(prof, 'display_name', '') or '').strip()
            return name or obj.provider.username
        except Exception:
            return obj.provider.username

    def get_providerPhoto(self, obj):
        try:
            prof = getattr(obj.provider, 'profile', None)
            return getattr(prof, 'photo_url', '') or ''
        except Exception:
            return ''


class RequestSerializer(serializers.ModelSerializer):
    _count = serializers.SerializerMethodField()
    ownerId = serializers.SerializerMethodField()
    acceptedOfferId = serializers.SerializerMethodField()
    acceptedPrice = serializers.SerializerMethodField()
    acceptedProviderId = serializers.SerializerMethodField()
    acceptedProviderName = serializers.SerializerMethodField()
    acceptedProviderPhoto = serializers.SerializerMethodField()
    offers = OfferSerializer(many=True, read_only=True)

    class Meta:
        model = Request
        fields = (
            'id', 'owner', 'title', 'category', 'location', 'urgency', 'description', 'status', 'budget', 'created_at',
            '_count', 'ownerId',
            'acceptedOfferId', 'acceptedPrice', 'acceptedProviderId', 'acceptedProviderName', 'acceptedProviderPhoto',
            'offers'
        )
        read_only_fields = ('owner', 'created_at', 'offers')

    def get__count(self, obj):
        return {'offers': obj.offers.count()}

    def get_ownerId(self, obj):
        return str(obj.owner_id)

    def _accepted(self, obj):
        return obj.offers.filter(status='accepted').first()

    def get_acceptedOfferId(self, obj):
        acc = self._accepted(obj)
        return str(acc.id) if acc else None

    def get_acceptedPrice(self, obj):
        acc = self._accepted(obj)
        return float(acc.price) if acc else None

    def get_acceptedProviderId(self, obj):
        acc = self._accepted(obj)
        return str(acc.provider_id) if acc else None

    def get_acceptedProviderName(self, obj):
        acc = self._accepted(obj)
        if not acc:
            return None
        try:
            prof = getattr(acc.provider, 'profile', None)
            name = (getattr(prof, 'display_name', '') or '').strip()
            return name or acc.provider.username
        except Exception:
            return acc.provider.username

    def get_acceptedProviderPhoto(self, obj):
        acc = self._accepted(obj)
        if not acc:
            return None
        try:
            prof = getattr(acc.provider, 'profile', None)
            return getattr(prof, 'photo_url', '') or ''
        except Exception:
            return ''


class ServiceSerializer(serializers.ModelSerializer):
    ownerId = serializers.SerializerMethodField()
    class Meta:
        model = Service
        fields = ('id', 'owner', 'ownerId', 'title', 'category', 'price_from', 'location', 'description', 'status', 'created_at')
        read_only_fields = ('owner', 'created_at')
        extra_kwargs = {
            'category': {'required': False, 'allow_blank': True},
        }

    def get_ownerId(self, obj):
        return str(obj.owner_id)


class LeadSerializer(serializers.ModelSerializer):
    class Meta:
        model = Lead
        fields = ('id', 'service', 'provider', 'client', 'message', 'contact', 'status', 'created_at')
        read_only_fields = ('provider', 'client', 'status', 'created_at')


class ChatMessageSerializer(serializers.ModelSerializer):
    class Meta:
        model = ChatMessage
        fields = ('id', 'request', 'sender', 'recipient', 'text', 'ts')
        read_only_fields = ('sender', 'recipient', 'ts')


class ReviewSerializer(serializers.ModelSerializer):
    class Meta:
        model = Review
        fields = ('id', 'request', 'to_user', 'from_user', 'rating', 'comment', 'created_at')
        read_only_fields = ('from_user', 'created_at')
