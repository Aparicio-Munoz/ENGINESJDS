# SGTM — Base de control SaaS

Esta carpeta contiene la base de control de la plataforma multi-taller.

## Qué guarda

- `tenants`: un registro por taller.
- `platform_accounts`: identidades de los usuarios del taller para resolverlo durante el login.
- `subscriptions`: plan y estado comercial.
- `provisioning_jobs`: seguimiento de la creación de la base de cada taller.

No guarda clientes, motocicletas, órdenes, inventario ni demás información operativa. Esos datos vivirán en una base independiente por taller.

## Instalación

Ejecutar únicamente contra un servidor/base de pruebas o contra la base separada de plataforma:

```bash
mysql -h HOST -u USUARIO -p < database/platform/01_platform_schema.sql
```

No ejecutar este archivo usando `engines_jds` como base seleccionada.

## Flujo implementado

Con `SAAS_ENABLED=true`, el backend usa estas tablas para:

1. registrar el taller y su administrador;
2. crear una base `engines_tenant_<identificador>` vacía con el esquema de `database/`;
3. crear únicamente los roles, la configuración inicial y el usuario administrador elegido durante el registro; no se copian clientes, motos, órdenes, inventario ni semillas históricas;
4. resolver el taller en cada login mediante el correo global;
5. bloquear el acceso cuando el período de prueba o la suscripción dejan de estar activos.

La base histórica `engines_jds` continúa funcionando como instalación legacy y no se modifica durante el registro SaaS.

## Configuración del backend

Copiar `backend/.env.example` a `backend/.env` y configurar las credenciales. La cuenta usada por `PROVISIONER_DB_*` necesita permisos para crear bases de datos; la cuenta `DB_*` necesita leer y escribir las bases tenant. `TENANT_DB_CONNECTION_LIMIT` controla cuántas conexiones puede abrir cada taller para que el número de talleres no multiplique innecesariamente las conexiones del servidor. Activar el flujo sólo después de crear esta base:

```bash
mysql -h HOST -u USUARIO -p < database/platform/01_platform_schema.sql
```

Para conservar el comportamiento actual, dejar `SAAS_ENABLED=false`. El plan `trial` se crea con los días definidos en `SAAS_TRIAL_DAYS` (14 por defecto).

En el frontend, activar también `VITE_SAAS_ENABLED=true` para mostrar el enlace de registro y el módulo de suscripción. Si una de las dos banderas queda en `false`, el comportamiento visible seguirá siendo el de la instalación legacy.

El formulario público `POST /api/onboarding/register` solicita `businessName`, `username`, `email`, `password` y `confirmPassword`. El usuario elegido será el administrador inicial del nuevo taller.

## Cobro mensual con Stripe

El backend ya incluye:

- `POST /api/billing/checkout`, protegido para el administrador del taller;
- `GET /api/billing/status`, para mostrar el estado en el panel;
- `POST /api/billing/webhook`, que valida la firma y sincroniza los eventos de suscripción.

Configura un precio recurrente mensual en Stripe y copia sus valores a las variables `STRIPE_*`. En el Dashboard de Stripe registra como endpoint de webhook la URL pública `/api/billing/webhook` y suscribe los eventos `checkout.session.completed`, `customer.subscription.created`, `customer.subscription.updated`, `customer.subscription.deleted`, `invoice.paid` e `invoice.payment_failed`.
