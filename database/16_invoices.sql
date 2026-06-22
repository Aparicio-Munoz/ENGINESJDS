-- ============================================================
-- ENGINES JDS — Migración: Facturación y caja
-- ============================================================

USE engines_jds;

CREATE TABLE IF NOT EXISTS invoices (
  id               INT UNSIGNED    NOT NULL AUTO_INCREMENT,
  invoice_number   VARCHAR(20)     NOT NULL COMMENT 'FAC-YYYYMMDD-NNN',
  order_id         INT UNSIGNED    NOT NULL,
  client_name      VARCHAR(200)    NOT NULL,
  client_document  VARCHAR(30)     NULL,
  subtotal         DECIMAL(10,2)   NOT NULL DEFAULT 0.00,
  discount         DECIMAL(10,2)   NOT NULL DEFAULT 0.00,
  tax              DECIMAL(10,2)   NOT NULL DEFAULT 0.00,
  total            DECIMAL(10,2)   NOT NULL DEFAULT 0.00,
  payment_method   ENUM('Efectivo','Transferencia','Nequi','Daviplata','Tarjeta')
                   NOT NULL DEFAULT 'Efectivo',
  status           ENUM('Pendiente','Pagada','Anulada')
                   NOT NULL DEFAULT 'Pendiente',
  notes            TEXT            NULL,
  created_by       INT UNSIGNED    NULL,
  paid_at          DATETIME        NULL,
  created_at       TIMESTAMP       NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at       TIMESTAMP       NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uq_invoices_number   (invoice_number),
  KEY idx_invoices_order          (order_id),
  KEY idx_invoices_status         (status),
  KEY idx_invoices_payment        (payment_method),
  KEY idx_invoices_created        (created_at),
  CONSTRAINT fk_invoices_order    FOREIGN KEY (order_id)    REFERENCES orders(id),
  CONSTRAINT fk_invoices_creator  FOREIGN KEY (created_by)  REFERENCES users(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  COMMENT='Facturas generadas a partir de órdenes de trabajo';

-- Trigger: generar invoice_number automáticamente
DROP TRIGGER IF EXISTS trg_invoices_number;
CREATE TRIGGER trg_invoices_number BEFORE INSERT ON invoices FOR EACH ROW
BEGIN
  DECLARE seq INT;
  SET seq = (SELECT COALESCE(MAX(
    CAST(SUBSTRING_INDEX(invoice_number, '-', -1) AS UNSIGNED)
  ), 0) + 1 FROM invoices WHERE DATE(created_at) = CURDATE());
  SET NEW.invoice_number = CONCAT('FAC-', DATE_FORMAT(NOW(), '%Y%m%d'), '-', LPAD(seq, 3, '0'));
END;
