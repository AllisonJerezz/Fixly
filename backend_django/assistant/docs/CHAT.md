# Chat

- El chat se habilita solo cuando la solicitud tiene una oferta aceptada.
- Participantes: cliente (dueño) y proveedor ganador.
- Endpoint mensajes: `GET/POST /api/chats/{requestId}/messages`
- Reglas de autorización: solo esos dos usuarios pueden leer y enviar mensajes.

