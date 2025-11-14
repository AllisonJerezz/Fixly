# Ofertas (proveedor)

## Enviar o actualizar oferta
- UI: Detalle de una solicitud ? formulario de oferta.
- Endpoint: `POST /api/requests/{requestId}/offers`
  - Body JSON: `{ message, price }`
  - Si el proveedor ya tiene oferta previa, se actualiza (upsert simple).

## Ver ofertas de una solicitud
- `GET /api/requests/{requestId}/offers`

## Aceptar / rechazar (cliente dueño)
- Aceptar: `POST /api/requests/{requestId}/offers/{offerId}/accept`
- Rechazar: `POST /api/requests/{requestId}/offers/{offerId}/reject`
- Al aceptar, otras ofertas quedan en `rejected` y la solicitud pasa a `en_progreso`.
