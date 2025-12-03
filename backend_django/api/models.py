import uuid
from django.db import models
from django.core.validators import MinValueValidator, MaxValueValidator
from django.contrib.auth.models import AbstractUser


class User(AbstractUser):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    email = models.EmailField(unique=True)
    username = models.CharField(max_length=150, unique=True)


class Profile(models.Model):
    user = models.OneToOneField(User, on_delete=models.CASCADE, related_name='profile')
    display_name = models.CharField(max_length=120, blank=True)
    photo_url = models.URLField(blank=True)
    role = models.CharField(max_length=12, blank=True)  # 'client' | 'provider'
    location = models.CharField(max_length=160, blank=True)
    bio = models.TextField(blank=True)


class Request(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    owner = models.ForeignKey(User, on_delete=models.CASCADE, related_name='requests')
    title = models.CharField(max_length=200)
    category = models.CharField(max_length=120)
    location = models.CharField(max_length=200, blank=True)
    urgency = models.CharField(max_length=20, default='normal')
    description = models.TextField(blank=True)
    status = models.CharField(max_length=20, default='pendiente')
    budget = models.DecimalField(max_digits=12, decimal_places=2, null=True, blank=True,
                                 validators=[MinValueValidator(0)])
    created_at = models.DateTimeField(auto_now_add=True)


class Offer(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    request = models.ForeignKey(Request, on_delete=models.CASCADE, related_name='offers')
    provider = models.ForeignKey(User, on_delete=models.CASCADE, related_name='offers')
    message = models.TextField(blank=True)
    price = models.DecimalField(max_digits=12, decimal_places=2, default=0,
                                validators=[MinValueValidator(0)])
    status = models.CharField(max_length=20, default='pending')  # pending|accepted|rejected
    created_at = models.DateTimeField(auto_now_add=True)


class Service(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    owner = models.ForeignKey(User, on_delete=models.CASCADE, related_name='services')
    title = models.CharField(max_length=200)
    category = models.CharField(max_length=120)
    price_from = models.DecimalField(max_digits=12, decimal_places=2, default=0,
                                     validators=[MinValueValidator(0)])
    location = models.CharField(max_length=200, blank=True)
    description = models.TextField(blank=True)
    status = models.CharField(max_length=20, default='activo')
    created_at = models.DateTimeField(auto_now_add=True)


class Lead(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    service = models.ForeignKey(Service, on_delete=models.CASCADE, related_name='leads')
    provider = models.ForeignKey(User, on_delete=models.CASCADE, related_name='leads_received')
    client = models.ForeignKey(User, on_delete=models.CASCADE, related_name='leads_sent')
    message = models.TextField()
    contact = models.CharField(max_length=200, blank=True)
    status = models.CharField(max_length=20, default='nuevo')
    created_at = models.DateTimeField(auto_now_add=True)


class ChatMessage(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    request = models.ForeignKey(Request, on_delete=models.CASCADE, related_name='messages')
    sender = models.ForeignKey(User, on_delete=models.CASCADE, related_name='messages_sent')
    recipient = models.ForeignKey(User, on_delete=models.CASCADE, related_name='messages_recv')
    text = models.TextField()
    ts = models.DateTimeField(auto_now_add=True)


class Review(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    request = models.ForeignKey(Request, on_delete=models.CASCADE, related_name='reviews')
    to_user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='reviews_to')
    from_user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='reviews_from')
    rating = models.PositiveSmallIntegerField(validators=[MinValueValidator(1), MaxValueValidator(5)])
    comment = models.TextField(blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
