# Fixly Front + Backend Django

Este repositorio contiene:
- Frontend: React + Vite (carpeta raíz, puerto 5173)
- Backend: Django + DRF + PostgreSQL (carpeta ackend_django/, puerto 8000)

## Frontend

Variables de entorno:

`
VITE_API_URL=http://localhost:8000/api
`

Ejecutar (desde la raíz):

`
npm install
npm run dev
`

La app usará el backend si está disponible; mientras migras, hay lógica local en src/api.js.

## Backend con Django (activo)

El backend Django/DRF está en ackend_django/ con endpoints compatibles.

Requisitos: Python 3.11+, pip, PostgreSQL.

1) Instalar dependencias:

`
cd backend_django
python -m venv .venv
.venv\Scripts\activate  # Windows
pip install -r requirements.txt
`

2) Configurar entorno:

`
copy .env.example .env
# Ajusta POSTGRES_* y DJANGO_ALLOWED_ORIGINS si corresponde
`

3) Migraciones + runserver:

`
python manage.py migrate
python manage.py runserver 0.0.0.0:8000
`

4) Endpoints expuestos

- GET /api/health
- POST /api/auth/register, POST /api/auth/login
- GET/PUT /api/profile
- GET/POST /api/requests, GET/PUT/DELETE /api/requests/<id>
- GET/POST /api/requests/<id>/offers, POST /api/requests/<id>/offers/<offerId>/accept|reject
- GET/POST /api/services, GET /api/services/me, GET/PUT/DELETE /api/services/<id>
- POST /api/services/<id>/contact, GET /api/me/leads
- GET/POST /api/chats/<requestId>/messages
- POST /api/reviews, GET /api/users/<userId>/reviews, GET /api/users/<userId>/rating

## Notas
- Docker es opcional y no se usa aquí por defecto. Si necesitas levantar PostgreSQL con Docker, puedo dejarte un docker-compose.yml específico para Postgres.
- Si vienes de la versión Node/Express anterior, ya no se requiere nada de Node en el backend.
