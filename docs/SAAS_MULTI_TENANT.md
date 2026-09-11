# SaaS multi-taller

## Garantía de compatibilidad

La base histórica `engines_jds` no se migra, no se copia y no se modifica por el flujo SaaS. Con `SAAS_ENABLED=false` (valor por defecto), login, recuperación de contraseña, tracking y todos los módulos usan exactamente la base configurada en `DB_NAME`, como antes.

No ejecutes los comandos de esta guía contra producción sin sustituirlos por un host local de pruebas. El backend no debe iniciarse con credenciales productivas para probar este flujo.

## Preparar localmente

1. Copia `backend/.env.example` a `backend/.env` y usa un servidor MySQL local de pruebas. Mantén `DB_NAME=engines_jds` para la instalación legacy local y define `PLATFORM_DB_*` para el control plane.
2. Crea la base central manualmente, usando el script aislado:

   ```bash
   mysql -h 127.0.0.1 -u USUARIO -p < database/platform/01_platform_schema.sql
   ```

3. Activa `SAAS_ENABLED=true`, elige `SAAS_TRIAL_DAYS` y configura un usuario `PROVISIONER_DB_*` con permiso `CREATE DATABASE` sólo en el servidor de pruebas. Para el frontend, copia `frontend/.env.example` a `frontend/.env` y establece `VITE_SAAS_ENABLED=true`.

El usuario normal de `DB_*` debe tener acceso a las bases `engines_tenant_*`; el usuario de aprovisionamiento es el único que necesita crear bases. Ninguna contraseña se escribe en código ni en los comandos anteriores.

## Registro y aislamiento

Inicia backend y frontend, abre `http://localhost:5173/register` y registra, por ejemplo, `Taller Prueba`, usuario `taller.prueba`, correo `prueba@example.test` y una contraseña válida. Al finalizar se redirige a `/login`.

Para comprobar manualmente el resultado en MySQL local:

```sql
USE engines_platform;
SELECT id, slug, database_name, status, trial_ends_at FROM tenants;
SELECT table_name, table_rows
FROM information_schema.tables
WHERE table_schema = 'engines_tenant_IDENTIFICADOR'
ORDER BY table_name;
SELECT COUNT(*) AS clientes FROM engines_tenant_IDENTIFICADOR.clients;
SELECT COUNT(*) AS ordenes FROM engines_tenant_IDENTIFICADOR.orders;
SELECT COUNT(*) AS inventario FROM engines_tenant_IDENTIFICADOR.inventory;
```

Las tres últimas cuentas deben ser cero para un taller recién creado. Sólo se crean estructura, roles, la fila de configuración y el administrador inicial. El JWT SaaS contiene el identificador y la base del tenant; cada petición autenticada vuelve a validar ambos valores contra `engines_platform` antes de seleccionar su pool. Un token cuyo tenant o base no coincidan se rechaza. Los enlaces de tracking SaaS usan `/tracking/:slug/:token` para resolver la misma base sin mezclar órdenes públicas.

Los respaldos también se almacenan por base de tenant y nunca se dirigen a `engines_jds` durante una sesión SaaS. Las restauraciones rechazan scripts que seleccionen, creen o eliminen otra base.

## Stripe

Stripe sólo es necesario para cobrar después de la prueba. Define en el backend:

```text
STRIPE_SECRET_KEY=
STRIPE_PRICE_ID=
STRIPE_WEBHOOK_SECRET=
BILLING_SUCCESS_URL=
BILLING_CANCEL_URL=
```

Crea en Stripe un precio mensual recurrente, registra `/api/billing/webhook` y suscribe `checkout.session.completed`, `customer.subscription.created`, `customer.subscription.updated`, `customer.subscription.deleted`, `invoice.paid` e `invoice.payment_failed`. Sin esas claves, el panel de Suscripción lo indica y no inicia checkout. No se puede probar un checkout real ni la entrega de webhooks de Stripe sin claves y una URL pública reales; la prueba automatizada sólo comprueba la firma HMAC localmente.
