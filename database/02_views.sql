-- ============================================================
-- ENGINES JDS — Vistas para reportes y dashboards
-- Requiere: 01_schema.sql ejecutado previamente
-- ============================================================

USE engines_jds;

-- ────────────────────────────────────────────────────────────
-- V1. Resumen diario de ventas
-- Soporte para reporte diario del panel
-- ────────────────────────────────────────────────────────────
CREATE OR REPLACE VIEW v_daily_sales_summary AS
SELECT
  DATE(s.sale_date)                            AS sale_day,
  COUNT(s.id)                                  AS total_sales,
  SUM(s.total)                                 AS total_revenue,
  SUM(s.parts_subtotal)                        AS parts_revenue,
  SUM(s.labor_subtotal)                        AS labor_revenue,
  SUM(s.discount)                              AS total_discounts,
  SUM(CASE WHEN s.payment_status = 'Pagado'   THEN s.total ELSE 0 END) AS collected,
  SUM(CASE WHEN s.payment_status = 'Pendiente' THEN s.total ELSE 0 END) AS pending
FROM sales s
GROUP BY DATE(s.sale_date)
ORDER BY sale_day DESC;

-- ────────────────────────────────────────────────────────────
-- V2. Ingresos por período (semana / quincenal / mensual)
-- Permite filtrar por rango de fechas desde el backend
-- ────────────────────────────────────────────────────────────
CREATE OR REPLACE VIEW v_revenue_by_period AS
SELECT
  s.id,
  s.order_id,
  s.sale_date,
  YEARWEEK(s.sale_date, 1)                     AS year_week,
  DATE_FORMAT(s.sale_date, '%Y-%m')            AS `year_month`,
  IF(DAY(s.sale_date) <= 15, 'primera', 'segunda') AS fortnight,
  s.total,
  s.parts_subtotal,
  s.labor_subtotal,
  s.discount,
  s.payment_method,
  s.payment_status,
  o.order_number,
  CONCAT(c.name, ' ', c.last_name)             AS client_name,
  m.plate                                      AS motorcycle_plate,
  CONCAT(m.brand, ' ', m.model)                AS motorcycle_info
FROM sales s
INNER JOIN orders     o ON o.id = s.order_id
INNER JOIN clients    c ON c.id = o.client_id
INNER JOIN motorcycles m ON m.id = o.motorcycle_id;

-- ────────────────────────────────────────────────────────────
-- V3. Rendimiento por empleado
-- Órdenes completadas, ingresos generados, servicios realizados
-- ────────────────────────────────────────────────────────────
CREATE OR REPLACE VIEW v_employee_performance AS
SELECT
  e.id                                         AS employee_id,
  CONCAT(e.name, ' ', e.last_name)             AS employee_name,
  e.specialty,
  e.daily_rate,
  e.status                                     AS employee_status,
  -- Órdenes asignadas
  COUNT(DISTINCT o.id)                         AS total_orders,
  COUNT(DISTINCT CASE WHEN o.status = 'Entregada' THEN o.id END) AS completed_orders,
  -- Servicios ejecutados
  COUNT(os.id)                                 AS total_services,
  SUM(os.total_price)                          AS services_revenue,
  -- Período
  COUNT(DISTINCT CASE
    WHEN o.entry_date >= DATE_SUB(NOW(), INTERVAL 30 DAY)
    THEN o.id END)                             AS orders_last_30_days,
  SUM(CASE
    WHEN o.entry_date >= DATE_SUB(NOW(), INTERVAL 30 DAY)
    THEN os.total_price ELSE 0 END)            AS revenue_last_30_days
FROM employees e
LEFT JOIN orders        o  ON o.assigned_employee_id = e.id
LEFT JOIN order_services os ON os.employee_id = e.id
WHERE e.deleted_at IS NULL
GROUP BY e.id, e.name, e.last_name, e.specialty, e.daily_rate, e.status;

-- ────────────────────────────────────────────────────────────
-- V4. Historial de servicio por motocicleta
-- Todas las órdenes y servicios de cada moto
-- ────────────────────────────────────────────────────────────
CREATE OR REPLACE VIEW v_motorcycle_service_history AS
SELECT
  m.id                                         AS motorcycle_id,
  m.plate,
  CONCAT(m.brand, ' ', m.model, ' ', m.year)  AS motorcycle_info,
  CONCAT(c.name, ' ', c.last_name)             AS owner_name,
  c.phone                                      AS owner_phone,
  o.id                                         AS order_id,
  o.order_number,
  o.status                                     AS order_status,
  o.entry_date,
  o.actual_delivery_date,
  o.final_price,
  o.work_notes,
  -- Servicios de la orden
  GROUP_CONCAT(
    os.service_name
    ORDER BY os.id
    SEPARATOR ' | '
  )                                            AS services_performed,
  -- Repuestos usados
  GROUP_CONCAT(
    DISTINCT CONCAT(oi.part_name, ' x', oi.quantity)
    ORDER BY oi.id
    SEPARATOR ' | '
  )                                            AS parts_used,
  -- RTM activa
  (
    SELECT t.expiry_date
    FROM tecnomecanica t
    WHERE t.motorcycle_id = m.id
    ORDER BY t.inspection_date DESC
    LIMIT 1
  )                                            AS latest_rtm_expiry
FROM motorcycles m
INNER JOIN clients       c  ON c.id = m.client_id
LEFT  JOIN orders        o  ON o.motorcycle_id = m.id
LEFT  JOIN order_services os ON os.order_id = o.id
LEFT  JOIN order_items   oi ON oi.order_id = o.id
WHERE m.deleted_at IS NULL
GROUP BY m.id, m.plate, m.brand, m.model, m.year,
         c.name, c.last_name, c.phone,
         o.id, o.order_number, o.status, o.entry_date,
         o.actual_delivery_date, o.final_price, o.work_notes
ORDER BY m.plate, o.entry_date DESC;

-- ────────────────────────────────────────────────────────────
-- V5. Alertas de inventario
-- Repuestos en stock bajo o agotados
-- ────────────────────────────────────────────────────────────
CREATE OR REPLACE VIEW v_inventory_alerts AS
SELECT
  i.id,
  i.code,
  i.name,
  i.brand,
  i.category,
  i.quantity,
  i.min_stock,
  i.status,
  i.unit_price,
  i.supplier,
  (i.min_stock - i.quantity)                   AS units_needed,
  (i.min_stock - i.quantity) * i.unit_price    AS estimated_restock_cost
FROM inventory i
WHERE i.quantity <= i.min_stock
ORDER BY i.quantity ASC, i.name ASC;

-- ────────────────────────────────────────────────────────────
-- V6. Estado de tecnomecánica
-- RTM activa por moto con días restantes
-- ────────────────────────────────────────────────────────────
CREATE OR REPLACE VIEW v_tecnomecanica_status AS
SELECT
  m.id                                         AS motorcycle_id,
  m.plate,
  CONCAT(m.brand, ' ', m.model, ' ', m.year)  AS motorcycle_info,
  CONCAT(c.name, ' ', c.last_name)             AS owner_name,
  c.phone                                      AS owner_phone,
  t.id                                         AS tecno_id,
  t.inspection_date,
  t.expiry_date,
  t.rtm_number,
  t.status                                     AS rtm_status,
  DATEDIFF(t.expiry_date, CURDATE())           AS days_remaining
FROM motorcycles m
INNER JOIN clients c ON c.id = m.client_id
INNER JOIN tecnomecanica t ON t.motorcycle_id = m.id
  AND t.inspection_date = (
    SELECT MAX(t2.inspection_date)
    FROM tecnomecanica t2
    WHERE t2.motorcycle_id = m.id
  )
WHERE m.deleted_at IS NULL
ORDER BY days_remaining ASC;

-- ────────────────────────────────────────────────────────────
-- V7. Panel de órdenes activas
-- Vista operacional para el dashboard diario
-- ────────────────────────────────────────────────────────────
CREATE OR REPLACE VIEW v_active_orders AS
SELECT
  o.id,
  o.order_number,
  o.status,
  o.entry_date,
  o.estimated_delivery_date,
  DATEDIFF(NOW(), o.entry_date)                AS days_in_workshop,
  m.plate,
  CONCAT(m.brand, ' ', m.model)                AS motorcycle_info,
  CONCAT(c.name, ' ', c.last_name)             AS client_name,
  c.phone                                      AS client_phone,
  CONCAT(e.name, ' ', e.last_name)             AS assigned_employee,
  o.labor_cost,
  o.parts_cost,
  o.final_price,
  COUNT(os.id)                                 AS services_count,
  SUM(CASE WHEN os.status = 'Completado' THEN 1 ELSE 0 END) AS services_completed
FROM orders o
INNER JOIN motorcycles    m  ON m.id = o.motorcycle_id
INNER JOIN clients        c  ON c.id = o.client_id
LEFT  JOIN employees      e  ON e.id = o.assigned_employee_id
LEFT  JOIN order_services os ON os.order_id = o.id
WHERE o.status IN ('Pendiente', 'En proceso', 'Listo')
GROUP BY o.id, o.order_number, o.status, o.entry_date,
         o.estimated_delivery_date, m.plate, m.brand, m.model,
         c.name, c.last_name, c.phone,
         e.name, e.last_name, o.labor_cost, o.parts_cost, o.final_price
ORDER BY o.entry_date ASC;

-- ────────────────────────────────────────────────────────────
-- V8. Citas del día
-- Citas pendientes o confirmadas para hoy
-- ────────────────────────────────────────────────────────────
CREATE OR REPLACE VIEW v_todays_appointments AS
SELECT
  a.id,
  a.requested_time,
  a.client_name,
  a.client_phone,
  a.motorcycle_plate,
  a.service_type,
  a.status,
  a.notes,
  CONCAT(e.name, ' ', e.last_name)             AS assigned_employee
FROM appointments a
LEFT JOIN employees e ON e.id = a.assigned_employee_id
WHERE a.requested_date = CURDATE()
  AND a.status IN ('Pendiente', 'Confirmada')
ORDER BY a.requested_time ASC;
