-- ============================================================
-- ENGINES JDS — Fix Panel Técnico
-- 1. Expande ENUM de status en orders para incluir estados del técnico
-- 2. Crea tabla part_requests para solicitudes de repuestos
-- ============================================================

USE engines_jds;

-- ── 1. Expandir ENUM de status en orders ───────────────────────
-- Agrega: 'En reparación', 'Esperando repuesto', 'Lista para entrega'
-- Compatible con los valores existentes
ALTER TABLE orders MODIFY COLUMN status
  ENUM('Pendiente','En proceso','En reparación','Esperando repuesto','Listo','Lista para entrega','Entregada')
  NOT NULL DEFAULT 'Pendiente';

-- ── 2. Crear tabla part_requests ───────────────────────────────
CREATE TABLE IF NOT EXISTS part_requests (
  id              INT UNSIGNED    NOT NULL AUTO_INCREMENT,
  order_id        INT UNSIGNED    NOT NULL,
  employee_id     INT UNSIGNED    NOT NULL,
  part_name       VARCHAR(200)    NOT NULL,
  quantity        SMALLINT UNSIGNED NOT NULL DEFAULT 1,
  urgency         ENUM('Normal','Urgente') NOT NULL DEFAULT 'Normal',
  status          ENUM('Pendiente','Aprobada','Rechazada','Entregada') NOT NULL DEFAULT 'Pendiente',
  notes           TEXT            NULL,
  response_notes  TEXT            NULL,
  responded_by    INT UNSIGNED    NULL,
  responded_at    DATETIME        NULL,
  created_at      TIMESTAMP       NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at      TIMESTAMP       NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY idx_pr_order    (order_id),
  KEY idx_pr_employee (employee_id),
  KEY idx_pr_status   (status),
  CONSTRAINT fk_pr_order    FOREIGN KEY (order_id)    REFERENCES orders(id)    ON DELETE CASCADE,
  CONSTRAINT fk_pr_employee FOREIGN KEY (employee_id) REFERENCES employees(id) ON DELETE CASCADE,
  CONSTRAINT fk_pr_responder FOREIGN KEY (responded_by) REFERENCES users(id)   ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  COMMENT='Solicitudes de repuestos por técnicos';
