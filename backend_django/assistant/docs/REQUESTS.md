# Solicitudes (cliente)

## Crear una solicitud
- Ruta UI: `/requests/new`.
- Campos: `title` (obligatorio), `category`, `location`, `urgency` (baja|normal|alta), `budget` (CLP), `description`.
- Endpoint: `POST /api/requests`
  - Body JSON: `{ title, category, location, urgency, description, budget }`
  - Auth requerida: sí (cliente autenticado)

## Ver mis solicitudes
- Ruta UI: `/requests` (modo cliente muestra las propias).
- Endpoint: `GET /api/requests` (lista todas; el front filtra por dueño `ownerId`).

## Editar / cerrar
- `PUT /api/requests/{id}` — solo dueño.
- Cambios típicos: `status` → `en_progreso` | `completado`.

