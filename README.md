
# ENGINES JDS

Sistema de gestión administrativa para taller de motocicletas. Plataforma web con landing pública, panel administrativo completo y catálogo de repuestos en línea.

---

## Descripción

ENGINES JDS centraliza los procesos operativos de un taller de motocicletas: clientes, motocicletas, órdenes de trabajo, inventario de repuestos, empleados, citas y reportes. El frontend está completamente desarrollado con React y listo para integrarse con un backend REST y base de datos SQL Server.

---

## Tecnologías

| Capa | Tecnología |
|------|-----------|
| Frontend | React 19 + Vite 8 |
| Routing | React Router v7 |
| Estilos | CSS Modules + design tokens globales |
| HTTP client | Axios (configurado con interceptores JWT) |
| Persistencia actual | localStorage (por entidad) |
| Persistencia futura | REST API + SQL Server |
| Autenticación | JWT Bearer tokens (mock → real) |
| Linting | ESLint + react-hooks plugin |

### Backend (pendiente de implementar)
- Node.js + Express
- JWT para autenticación

### Base de datos
- SQL Server

---

## Estructura del proyecto

```text
ENGINES-JDS/
├── frontend/    # Aplicación web React (COMPLETADA)
├── backend/     # API REST Node.js/Express (pendiente)
├── database/    # Scripts, migraciones y modelo SQL Server (pendiente)
├── docs/        # Documentación técnica y funcional
└── README.md
```

---

## Instalación

```bash
cd frontend
npm install
npm run dev       # http://localhost:5173
npm run build     # Compilar producción
npm run lint      # Verificar calidad de código
```

### Variables de entorno

Crea `frontend/.env`:

```env
VITE_API_BASE_URL=http://localhost:3000/api
```

---

## Estructura del frontend

```
frontend/src/
├── api/                    # Capa API — Promise-based, lista para backend
│   ├── index.js            # Barrel export
│   ├── clientsApi.js       # getAll · getById · create · update · remove
│   ├── motorcyclesApi.js
│   ├── ordersApi.js
│   ├── inventoryApi.js
│   ├── employeesApi.js
│   ├── usersApi.js
│   └── appointmentsApi.js
├── components/
│   ├── ConfirmModal/       # Modal de confirmación reutilizable
│   ├── GlobalSearch/       # Búsqueda global cross-entidad con dropdown
│   ├── Loader/             # Spinner (sm/md/lg, fullScreen)
│   ├── Navbar/             # Barra de navegación pública con menú móvil
│   ├── NotificationCenter/ # Alertas automáticas de stock y citas
│   ├── ProtectedRoute/     # HOC de autenticación
│   ├── Toast/              # Notificaciones (success/error/warning/info)
│   └── WhatsAppButton/     # FAB flotante con dos líneas WhatsApp
├── context/
│   ├── AuthContext.jsx     # Estado global de autenticación
│   └── ToastContext.jsx    # Estado global del sistema de toasts
├── hooks/
│   ├── useAuth.js          # Hook para contexto de auth
│   └── useToast.js         # Hook para disparar toasts
├── layouts/
│   ├── DashboardLayout/    # Sidebar + topBar + menú de perfil
│   └── MainLayout.jsx      # Navbar + WhatsAppFAB para páginas públicas
├── pages/
│   ├── AgendarCita/        # Formulario público de agendamiento
│   ├── DashboardAdmin/     # Panel con KPIs, últimas órdenes, citas, alertas stock
│   ├── Home/               # Landing con counters animados e imagen hero premium
│   ├── Login/              # Autenticación split-screen
│   ├── NotFound/           # Página 404 con diseño premium
│   ├── Register/           # Registro de usuarios
│   ├── Repuestos/          # Catálogo público con filtros y botones WhatsApp
│   └── admin/
│       ├── Citas/          # Gestión citas + conversión a orden de trabajo
│       ├── Clientes/       # CRUD clientes con búsqueda y confirmación
│       ├── Empleados/      # CRUD empleados
│       ├── Inventario/     # CRUD repuestos con imageUrl y stock automático
│       ├── Motocicletas/   # CRUD motocicletas vinculadas a clientes
│       ├── OrdenesTrabajo/ # CRUD órdenes con estados y asignación de empleados
│       ├── Reportes/       # KPIs, gráficas de barras, top 5, exportación CSV
│       └── Usuarios/       # CRUD usuarios del sistema
├── routes/
│   └── AppRouter.jsx       # createBrowserRouter con rutas públicas, admin y 404
├── services/
│   ├── apiClient.js        # Axios + interceptor JWT + manejo de 401
│   ├── authService.js      # Lógica de sesión (mock lista para reemplazar)
│   └── *Service.js         # Servicios localStorage por entidad
├── styles/
│   └── global.css          # Design tokens, reset, focus-visible, skip-link
└── utils/
    └── routes.js           # Constantes de todas las rutas
```

---

## Módulos y rutas

### Páginas públicas
| Ruta | Módulo |
|------|--------|
| `/` | Landing: hero, servicios, estadísticas animadas, contacto |
| `/repuestos` | Catálogo con búsqueda, filtro por estado, botón pedir por WhatsApp |
| `/agendar-cita` | Formulario de cita con validación y confirmación vía WhatsApp |
| `/login` | Login split-screen con validación |

### Panel administrativo (requiere autenticación)
| Ruta | Módulo |
|------|--------|
| `/admin` | Dashboard: 7 KPIs, órdenes recientes, últimas citas, alertas de stock |
| `/admin/clientes` | CRUD completo con búsqueda, filtros y modal de confirmación |
| `/admin/motocicletas` | CRUD motocicletas |
| `/admin/citas` | Gestión de citas con cambio de estado y conversión a OT |
| `/admin/ordenes` | Órdenes de trabajo con historial y asignación |
| `/admin/inventario` | Control de stock con estados automáticos e imagen por URL |
| `/admin/empleados` | Gestión del personal |
| `/admin/usuarios` | Administración de accesos |
| `/admin/reportes` | KPIs consolidados, barras por estado, top 5 clientes/empleados, CSV |

---

## Integración futura con backend

El frontend está diseñado para conectarse al backend reemplazando únicamente el cuerpo de los métodos en `src/api/`:

```js
// Hoy (localStorage):
getAll() {
  return Promise.resolve(getClients([]))
}

// Mañana (backend):
async getAll() {
  const { data } = await apiClient.get('/clients')
  return data
}
```

El `apiClient` (`src/services/apiClient.js`) ya incluye:
- `baseURL` desde `VITE_API_BASE_URL`
- Interceptor que adjunta `Authorization: Bearer <token>` en cada request
- Interceptor que redirige a `/login` cuando el servidor responde 401

---

## Integración futura con base de datos

Modelo de datos sugerido para SQL Server:

| Entidad | Tabla | Campos principales |
|---------|-------|--------------------|
| Clientes | `clients` | id, name, document, phone, email, address |
| Motocicletas | `motorcycles` | id, plate, brand, model, year, clientId |
| Órdenes | `orders` | id, orderNumber, clientName, motorcycle, status, entryDate |
| Inventario | `inventory` | id, code, name, brand, quantity, price, status, imageUrl |
| Empleados | `employees` | id, name, specialty, phone, status |
| Usuarios | `users` | id, username, email, role, passwordHash |
| Citas | `appointments` | id, name, phone, plate, service, date, time, status |

---

## Autores

- **Aparicio-Munoz** — Arquitectura y desarrollo full-stack

---

*ENGINES JDS — Taller especializado en motocicletas · Bogotá, Colombia*
