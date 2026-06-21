-- ============================================================
-- ENGINES JDS — Migración: Panel Técnico
-- Agrega estados granulares a órdenes y tabla de solicitud de repuestos
-- ============================================================

USE engines_jds;

-- ────────────────────────────────────────────────────────────
-- 1. Ampliar ENUM de status en orders
--    Nuevos: 'En reparación', 'Esperando repuesto', 'Lista para entrega'
-- ────────────────────────────────────────────────────────────
ALTER TABLE orders
  MODIFY COLUMN status
    ENUM('Pendiente','En proceso','En reparación','Esperando repuesto','Listo','Lista para entrega','Entregada')
    NOT NULL DEFAULT 'Pendiente';

-- ────────────────────────────────────────────────────────────
-- 2. PART_REQUESTS — Solicitudes de repuestos del técnico
--    El técnico solicita; el administrador aprueba y despacha
-- ────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS part_requests (
  id              INT UNSIGNED    NOT NULL AUTO_INCREMENT,
  order_id        INT UNSIGNED    NOT NULL,
  employee_id     INT UNSIGNED    NOT NULL COMMENT 'Técnico que solicita',
  part_name       VARCHAR(200)    NOT NULL COMMENT 'Nombre/descripción del repuesto',
  quantity        INT UNSIGNED    NOT NULL DEFAULT 1,
  urgency         ENUM('Normal','Urgente') NOT NULL DEFAULT 'Normal',
  notes           TEXT            NULL,
  status          ENUM('Pendiente','Aprobada','Rechazada','Entregada') NOT NULL DEFAULT 'Pendiente',
  responded_by    INT UNSIGNED    NULL COMMENT 'Admin que respondió',
  response_notes  TEXT            NULL,
  created_at      TIMESTAMP       NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at      TIMESTAMP       NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY idx_part_requests_order    (order_id),
  KEY idx_part_requests_employee (employee_id),
  KEY idx_part_requests_status   (status),
  CONSTRAINT fk_part_requests_order
    FOREIGN KEY (order_id)     REFERENCES orders(id)    ON DELETE CASCADE,
  CONSTRAINT fk_part_requests_employee
    FOREIGN KEY (employee_id)  REFERENCES employees(id) ON DELETE CASCADE,
  CONSTRAINT fk_part_requests_responder
    FOREIGN KEY (responded_by) REFERENCES users(id)     ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  COMMENT='Solicitudes de repuestos creadas por técnicos';
