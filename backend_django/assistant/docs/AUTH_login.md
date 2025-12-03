# Inicio de sesión en Fixly

## Desde la interfaz (frontend)
- Abre la ruta `/login`.
- Escribe tu email o nombre de usuario y tu contraseña.
- Presiona “Entrar”. Si las credenciales son válidas, quedarás autenticado y podrás acceder a Home, Solicitudes/Servicios y al perfil.

## Detalles técnicos (backend)
- Endpoint: `POST /api/auth/login`
- Body JSON: `{ "userOrEmail": "usuario_o_email", "password": "***" }`
- Respuesta: `{ "token": "<JWT>", "user": { "id", "username", "email" } }`
- El frontend guarda el token en localStorage y luego llama a `GET /api/profile` para cachear el perfil (incluye `id` y `role`).

## Problemas comunes
- “Credenciales inválidas”: revisa usuario/email y contraseña.
- “Sin permisos en un chat”: solo el cliente dueño y el proveedor con oferta aceptada pueden chatear.
- Si cambiaste de cuenta y no ves tus datos, cierra sesión y entra nuevamente para actualizar el perfil cacheado.

