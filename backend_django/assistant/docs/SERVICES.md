# Servicios (proveedor)

## ¿Cómo publico un servicio?
- UI: ve a `Servicios → Publicar servicio` (ruta `/services/new`).
- Completa: `title`, `category`, `priceFrom` (CLP), `location`, `description`.
- Guarda para publicarlo; luego podrás verlo en `Servicios` y gestionarlo.

## Endpoints relacionados
- `POST /api/services` (crear)
- `GET /api/services` (listar)
- `GET /api/services/me` (mis servicios)
- `GET/PUT/DELETE /api/services/{id}`

## Contacto a proveedor (leads)
- `POST /api/services/{id}/contact` crea un lead (contacto) hacia el proveedor.

