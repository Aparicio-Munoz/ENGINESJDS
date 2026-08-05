-- ============================================================
-- ENGINES JDS — Migración: motorcycles.client_id opcional
-- El campo "Propietario" deja de ser obligatorio al registrar una
-- motocicleta nueva: puede guardarse sin cliente asignado y
-- vincularse después mediante edición.
-- Se redefinen las vistas que dependían de un cliente obligatorio
-- (INNER JOIN) para que no oculten motos sin propietario.
-- ============================================================

USE engines_jds;

ALTER TABLE motorcycles
  MODIFY client_id INT UNSIGNED NULL;

-- Vista: historial clínico de motocicleta (definida en 17_motorcycle_history.sql)
CREATE OR REPLACE VIEW vw_motorcycle_history AS
SELECT
  m.id             AS motorcycle_id,
  m.plate,
  m.brand          AS moto_brand,
  m.model          AS moto_model,
  m.year           AS moto_year,
  m.color,
  m.engine_cc,
  CONCAT(c.name, ' ', c.last_name) AS client_name,
  c.phone          AS client_phone,
  c.document       AS client_document,
  o.id             AS order_id,
  o.order_number,
  o.tracking_token,
  o.status         AS order_status,
  o.entry_date,
  o.actual_delivery_date,
  o.estimated_delivery_date,
  o.diagnostic_notes,
  o.work_notes,
  o.labor_cost,
  o.parts_cost,
  o.discount,
  o.final_price,
  CONCAT(e.name, ' ', e.last_name) AS technician_name,
  e.specialty      AS technician_specialty,
  o.created_at     AS order_created_at
FROM motorcycles m
LEFT  JOIN clients c    ON c.id = m.client_id
INNER JOIN orders  o    ON o.motorcycle_id = m.id
LEFT  JOIN employees e  ON e.id = o.assigned_employee_id AND e.deleted_at IS NULL
WHERE m.deleted_at IS NULL
ORDER BY o.entry_date DESC;

-- Vista: historial de servicio por motocicleta (definida en 02_views.sql V4)
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
  GROUP_CONCAT(
    os.service_name
    ORDER BY os.id
    SEPARATOR ' | '
  )                                            AS services_performed,
  GROUP_CONCAT(
    DISTINCT CONCAT(oi.part_name, ' x', oi.quantity)
    ORDER BY oi.id
    SEPARATOR ' | '
  )                                            AS parts_used,
  (
    SELECT t.expiry_date
    FROM tecnomecanica t
    WHERE t.motorcycle_id = m.id
    ORDER BY t.inspection_date DESC
    LIMIT 1
  )                                            AS latest_rtm_expiry
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

-- Vista: estado de tecnomecánica (definida en 02_views.sql V6)
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
LEFT  JOIN clients c ON c.id = m.client_id
INNER JOIN tecnomecanica t ON t.motorcycle_id = m.id
  AND t.inspection_date = (
    SELECT MAX(t2.inspection_date)
    FROM tecnomecanica t2
    WHERE t2.motorcycle_id = m.id
  )
WHERE m.deleted_at IS NULL
ORDER BY days_remaining ASC;
