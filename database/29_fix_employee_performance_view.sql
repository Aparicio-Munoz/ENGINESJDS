-- ============================================================
-- ENGINES JDS — Migración: corregir v_employee_performance
--
-- Bugs corregidos (vista original en 02_views.sql):
-- 1. Fan-out: `orders` y `order_services` se unían AMBAS directamente a
--    `employees` como dos ramas independientes (una-a-muchas cada una),
--    provocando un producto cruzado — un empleado con 3 órdenes y 5
--    servicios producía 15 filas, e inflaba COUNT(os.id)/SUM(os.total_price)
--    por un factor igual a su cantidad de órdenes (total_orders/
--    completed_orders no se veían afectados por estar protegidos con
--    COUNT(DISTINCT ...)).
-- 2. Atribución incorrecta: tanto la vista como la query de ganancias
--    diaria/quincenal/mensual en report.model.js sumaban por
--    order_services.employee_id (campo opcional a nivel de línea de
--    servicio, casi nunca diligenciado en el uso real de la app) en vez
--    de orders.assigned_employee_id (el técnico realmente asignado a la
--    orden). Esto dejaba "ganancias"/"servicios" en cero para empleados
--    con órdenes reales pero sin servicios individuales etiquetados.
--
-- Se corrige agregando cada tabla de hechos por separado, a su propio
-- nivel de grano (órdenes por un lado, líneas de servicio por otro), y
-- usando final_price (mano de obra + repuestos − descuento) como base de
-- ingresos, igual que el resto del módulo de comisiones de empleados —
-- sin unir jamás order_services antes de sumar final_price, para no
-- reintroducir el mismo problema de fan-out a menor escala.
-- ============================================================

USE engines_jds;

CREATE OR REPLACE VIEW v_employee_performance AS
SELECT
  e.id                                   AS employee_id,
  CONCAT(e.name, ' ', e.last_name)       AS employee_name,
  e.specialty,
  e.daily_rate,
  e.status                               AS employee_status,
  COALESCE(ord.total_orders, 0)          AS total_orders,
  COALESCE(ord.completed_orders, 0)      AS completed_orders,
  COALESCE(svc.total_services, 0)        AS total_services,
  COALESCE(ord.revenue, 0)               AS services_revenue,
  COALESCE(ord.orders_last_30_days, 0)   AS orders_last_30_days,
  COALESCE(ord.revenue_last_30_days, 0)  AS revenue_last_30_days
FROM employees e
LEFT JOIN (
  SELECT
    assigned_employee_id AS employee_id,
    COUNT(*)                                                             AS total_orders,
    COUNT(CASE WHEN status = 'Entregada' THEN 1 END)                     AS completed_orders,
    COUNT(CASE WHEN entry_date >= DATE_SUB(NOW(), INTERVAL 30 DAY)
               THEN 1 END)                                               AS orders_last_30_days,
    COALESCE(SUM(final_price), 0)                                        AS revenue,
    COALESCE(SUM(CASE WHEN entry_date >= DATE_SUB(NOW(), INTERVAL 30 DAY)
                       THEN final_price ELSE 0 END), 0)                  AS revenue_last_30_days
  FROM orders
  WHERE assigned_employee_id IS NOT NULL
  GROUP BY assigned_employee_id
) ord ON ord.employee_id = e.id
LEFT JOIN (
  SELECT
    o.assigned_employee_id AS employee_id,
    COUNT(os.id)            AS total_services
  FROM orders o
  INNER JOIN order_services os ON os.order_id = o.id
  WHERE o.assigned_employee_id IS NOT NULL
  GROUP BY o.assigned_employee_id
) svc ON svc.employee_id = e.id
WHERE e.deleted_at IS NULL;
