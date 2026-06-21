# ENGINES JDS — Base de datos MySQL 8

## Archivos

| Archivo | Descripción |
|---------|-------------|
| `01_schema.sql` | DDL completo: 18 tablas, FKs, índices, columnas generadas, triggers |
| `02_views.sql`  | 8 vistas para reportes, dashboard y alertas |
| `03_seed.sql`   | Datos iniciales: roles, admin, servicios, clientes y órdenes demo |

## Ejecutar (orden obligatorio)

```bash
mysql -u root -p < database/01_schema.sql
mysql -u root -p engines_jds < database/02_views.sql
mysql -u root -p engines_jds < database/03_seed.sql
```

## Tablas

```
roles                   Roles del sistema (Administrador, Técnico, Recepcionista)
users                   Cuentas de acceso al panel
clients                 Clientes con soft delete
employees               Técnicos con daily_rate para cálculo de ganancias
service_catalog         Servicios estándar del taller
motorcycles             Motos vinculadas a clientes con soft delete
tecnomecanica           Historial RTM por moto
appointments            Citas (anónimas o vinculadas)
appointment_reschedules Historial de reprogramaciones con motivo
orders                  Órdenes de trabajo — entidad central
order_services          Servicios N:M por orden con snapshot de precio
inventory               Repuestos con status GENERATED (Disponible/Stock bajo/Agotado)
order_items             Repuestos N:M por orden con snapshot de precio
inventory_movements     Trazabilidad de cada movimiento de stock
order_status_history    Historial de cambios de estado por orden
sales                   Registro financiero — se crea auto al marcar orden Entregada
deletion_logs           Auditoría de eliminaciones con motivo obligatorio (JSON snapshot)
notifications           Alertas de sistema (broadcast o por usuario)
```

## Vistas

```
v_daily_sales_summary       Ventas agrupadas por día
v_revenue_by_period         Ingresos con semana/mes/quincena para filtros
v_employee_performance      Órdenes, servicios e ingresos por técnico
v_motorcycle_service_history Historial completo de servicios por moto
v_inventory_alerts          Repuestos en stock bajo o agotados
v_tecnomecanica_status      RTM activa por moto con días restantes
v_active_orders             Panel operacional de órdenes en curso
v_todays_appointments       Citas del día pendientes o confirmadas
```

## Credenciales seed (CAMBIAR EN PRODUCCIÓN)

| Usuario | Contraseña | Rol |
|---------|------------|-----|
| admin | Admin2024! | Administrador |
| recepcion | Admin2024! | Recepcionista |
| tecnico1 | Admin2024! | Técnico |
