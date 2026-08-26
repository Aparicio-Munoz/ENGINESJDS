# ENGINES JDS

Sistema interno de gestión administrativa para un taller de motocicletas (Bogotá, Colombia). No es un sitio público: la raíz redirige siempre a `/login`. Roles: **Administrador**, **Recepcionista**, **Técnico**, cada uno con acceso restringido por ruta (ver `frontend/src/routes/AppRouter.jsx`).

> El `README.md` de la raíz describe un estado antiguo del proyecto (backend "pendiente", SQL Server, sin login, con landing pública). Eso ya no es así — el backend está completo, la base de datos es **MySQL** (Aiven), y la landing pública fue eliminada (commit `179f724`). Confía en este archivo y en el código actual, no en el README.

## Estructura

```
ENGINES-JDS/
├── frontend/   # React 19 + Vite 8, PWA, panel por rol
├── backend/    # Node.js + Express (ESM), API REST
├── database/   # Migraciones SQL numeradas secuencialmente
└── docs/
```

## Backend (`backend/`)

- Express + ESM (`"type": "module"`), entrypoint `src/server.js`, app en `src/app.js`.
- Capas: `routes/` → `controllers/` → `services/` → `models/`, más `validations/` y `middlewares/`.
- Auth: JWT access + refresh tokens, bcrypt, bloqueo de login por IP (`LOGIN_MAX_ATTEMPTS`), recuperación de contraseña por OTP vía SMTP.
- DB: MySQL vía `mysql2`, pool en `src/config/database.js`. En Vercel (serverless) bajar `DB_CONNECTION_LIMIT`.
- `src/config/env.js` valida en boot que existan `DB_HOST`, `DB_USER`, `DB_NAME`, `JWT_SECRET` — si falta alguna, el server no arranca.
- `GET /health/db` hace ping real a la base de datos (mantiene vivo el plan free de Aiven, que se apaga sin conexiones).
- Rutas API bajo `/api/*` (ver `src/routes/index.js`): `/auth`, `/public` son abiertas; el resto requiere JWT; `/technician` requiere rol Técnico.
- Deploy en Vercel (`backend/vercel.json`, carpeta `backend/api/index.js` como handler serverless).

Comandos:
```bash
cd backend
npm install
npm run dev     # nodemon, http://localhost:3000
npm run lint
```

## Frontend (`frontend/`)

- React 19 + Vite 8 + React Router v7, CSS Modules, Axios (`src/services/apiClient.js` con interceptor JWT + redirect a `/login` en 401).
- Socket.IO para notificaciones en tiempo real (`src/context/SocketContext.jsx`).
- PWA: service worker, manifest, `src/pwa.js`.
- Reportes con `chart.js`, export a PDF (`jspdf`) y Excel (`xlsx`).
- Control de acceso por rol vía `<RoleRoute allowedRoles={[...]}>` en `AppRouter.jsx` — al agregar una página nueva del panel, definir ahí qué roles la ven.
- Única ruta pública fuera de `/login`: `/tracking/:token` (seguimiento de orden sin autenticación).

Comandos:
```bash
cd frontend
npm install
npm run dev      # http://localhost:5173
npm run build
npm run lint
```

Variable de entorno: `VITE_API_BASE_URL` (ver `frontend/.env.example`).

## Base de datos (`database/`)

- MySQL. Migraciones **numeradas secuencialmente** (`01_schema.sql` … `31_...sql`) — al agregar una migración, seguir el siguiente número consecutivo y un nombre descriptivo en snake_case, y **no** editar migraciones ya aplicadas/commiteadas.
- `reset_users.sql` es un script de mantenimiento aparte (no forma parte de la secuencia numerada).

## Convenciones

- Nombres de servicios/controladores/rutas en inglés (`clients.service.js`, `orders.controller.js`); mensajes de usuario, comentarios y commits en español.
- Commits en español, estilo `tipo: descripción` (`feat:`, `fix:`, `refactor:`, `chore:`).
- No commitear `.env` (ya está en `.gitignore`); usar `.env.example` como referencia de variables requeridas.
- Antes de tocar auth, permisos por rol o el esquema de base de datos, revisar el modelo de roles en `AppRouter.jsx`/`RoleRoute` y las migraciones más recientes en `database/` para no romper compatibilidad.

## Estado del repo

Rama actual `backup-final-estable`, con cambios sin commitear en modelos/servicios/validaciones de backend y varias páginas admin del frontend, más migraciones `27`–`31` sin trackear. Antes de asumir que un módulo está "terminado", correr `git status` — puede haber trabajo en curso.
