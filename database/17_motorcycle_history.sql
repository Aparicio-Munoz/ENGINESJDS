-- ============================================================
-- ENGINES JDS — Migración: Historial clínico de motocicletas
-- Vista que consolida órdenes, servicios, repuestos y técnicos
-- ============================================================

USE engines_jds;

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
INNER JOIN clients c    ON c.id = m.client_id
INNER JOIN orders  o    ON o.motorcycle_id = m.id
LEFT  JOIN employees e  ON e.id = o.assigned_employee_id AND e.deleted_at IS NULL
WHERE m.deleted_at IS NULL
ORDER BY o.entry_date DESC;
