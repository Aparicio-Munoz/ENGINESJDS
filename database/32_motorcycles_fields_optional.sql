-- ============================================================
-- ENGINES JDS — Migración: motorcycles.plate / brand / model / year opcionales
-- El formulario "Nueva motocicleta" deja de exigir estos datos: se puede
-- registrar una moto con información parcial y completarla después.
-- client_id ya es nullable desde 26_motorcycle_owner_optional.sql.
-- chk_motorcycles_year no necesita cambios: un CHECK constraint pasa
-- cuando la expresión evalúa a NULL/UNKNOWN (estándar SQL), así que
-- year = NULL no lo viola.
-- ============================================================

USE engines_jds;

ALTER TABLE motorcycles
  MODIFY plate VARCHAR(10)     NULL COMMENT 'Placa colombiana: ABC123 o ABC12D',
  MODIFY brand VARCHAR(60)     NULL,
  MODIFY model VARCHAR(80)     NULL,
  MODIFY year  SMALLINT UNSIGNED NULL;

-- Las siguientes vistas usan CONCAT() para mostrar marca/modelo/año y
-- nombre/apellido del cliente. CONCAT() devuelve NULL completo si
-- cualquier argumento es NULL; se reemplaza por CONCAT_WS() para que un
-- dato faltante no borre toda la columna.

CREATE OR REPLACE VIEW v_revenue_by_period AS
SELECT
  s.id, s.order_id, s.sale_date,
  YEARWEEK(s.sale_date, 1)                          AS year_week,
  DATE_FORMAT(s.sale_date, '%Y-%m')                 AS `year_month`,
  IF(DAY(s.sale_date) <= 15, 'primera', 'segunda')  AS fortnight,
  s.total, s.parts_subtotal, s.labor_subtotal, s.discount,
  s.payment_method, s.payment_status,
  o.order_number,
  CONCAT_WS(' ', c.name, c.last_name)               AS client_name,
  m.plate                                            AS motorcycle_plate,
  CONCAT_WS(' ', m.brand, m.model)                  AS motorcycle_info
FROM sales s
JOIN orders      o ON o.id = s.order_id
JOIN clients     c ON c.id = o.client_id
JOIN motorcycles m ON m.id = o.motorcycle_id;

CREATE OR REPLACE VIEW v_motorcycle_service_history AS
SELECT
  m.id                                          AS motorcycle_id,
  m.plate,
  CONCAT_WS(' ', m.brand, m.model, m.year)      AS motorcycle_info,
  CONCAT_WS(' ', c.name, c.last_name)           AS owner_name,
  c.phone                                       AS owner_phone,
  o.id                                          AS order_id,
  o.order_number,
  o.status                                      AS order_status,
  o.entry_date,
  o.actual_delivery_date,
  o.final_price,
  o.work_notes,
  GROUP_CONCAT(
    os.service_name
    ORDER BY os.id
    SEPARATOR ' | '
  )                                             AS services_performed,
  GROUP_CONCAT(
    DISTINCT CONCAT(oi.part_name, ' x', oi.quantity)
    ORDER BY oi.id
    SEPARATOR ' | '
  )                                             AS parts_used,
  (
    SELECT t.expiry_date
    FROM tecnomecanica t
    WHERE t.motorcycle_id = m.id
    ORDER BY t.inspection_date DESC
    LIMIT 1
  )                                             AS latest_rtm_expiry
FROM motorcycles m
LEFT  JOIN clients       c  ON c.id = m.client_id
LEFT  JOIN orders        o  ON o.motorcycle_id = m.id
LEFT  JOIN order_services os ON os.order_id = o.id
LEFT  JOIN order_items   oi ON oi.order_id = o.id
WHERE m.deleted_at IS NULL
GROUP BY m.id, m.plate, m.brand, m.model, m.year,
         c.name, c.last_name, c.phone,
         o.id, o.order_number, o.status, o.entry_date,
         o.actual_delivery_date, o.final_price, o.work_notes
ORDER BY m.plate, o.entry_date DESC;

CREATE OR REPLACE VIEW v_tecnomecanica_status AS
SELECT
  m.id                                         AS motorcycle_id,
  m.plate,
  CONCAT_WS(' ', m.brand, m.model, m.year)     AS motorcycle_info,
  CONCAT_WS(' ', c.name, c.last_name)          AS owner_name,
  c.phone                                      AS owner_phone,
  t.id                                         AS tecno_id,
  t.inspection_date,
  t.expiry_date,
  t.rtm_number,
  t.status                                     AS rtm_status,
  DATEDIFF(t.expiry_date, CURDATE())           AS days_remaining
FROM motorcycles m
LEFT  JOIN clients c ON c.id = m.client_id
JOIN tecnomecanica t ON t.motorcycle_id = m.id
  AND t.inspection_date = (
    SELECT MAX(t2.inspection_date)
    FROM tecnomecanica t2
    WHERE t2.motorcycle_id = m.id
  )
WHERE m.deleted_at IS NULL
ORDER BY days_remaining ASC;

CREATE OR REPLACE VIEW v_active_orders AS
SELECT
  o.id, o.order_number, o.status, o.entry_date, o.estimated_delivery_date,
  DATEDIFF(NOW(), o.entry_date)               AS days_in_workshop,
  m.plate,
  CONCAT_WS(' ', m.brand, m.model)            AS motorcycle_info,
  CONCAT_WS(' ', c.name, c.last_name)         AS client_name,
  c.phone                                     AS client_phone,
  CONCAT_WS(' ', e.name, e.last_name)         AS assigned_employee,
  o.labor_cost, o.parts_cost, o.final_price,
  COUNT(os.id)                                                    AS services_count,
  SUM(CASE WHEN os.status = 'Completado' THEN 1 ELSE 0 END)       AS services_completed
FROM orders o
JOIN motorcycles m ON m.id = o.motorcycle_id
JOIN clients     c ON c.id = o.client_id
LEFT JOIN employees      e  ON e.id = o.assigned_employee_id
LEFT JOIN order_services os ON os.order_id = o.id
WHERE o.status IN ('Pendiente', 'En proceso', 'Listo')
GROUP BY o.id, o.order_number, o.status, o.entry_date, o.estimated_delivery_date,
         m.plate, m.brand, m.model, c.name, c.last_name, c.phone,
         e.name, e.last_name, o.labor_cost, o.parts_cost, o.final_price
ORDER BY o.entry_date;
