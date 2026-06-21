-- ============================================================
-- ENGINES JDS — Migración: Token de seguimiento público
-- Agrega tracking_token a orders para consulta sin autenticación
-- ============================================================

USE engines_jds;

-- ────────────────────────────────────────────────────────────
-- 1. Agregar columna tracking_token
-- ────────────────────────────────────────────────────────────
ALTER TABLE orders
  ADD COLUMN tracking_token CHAR(36) NULL AFTER order_number;

ALTER TABLE orders
  ADD UNIQUE KEY uq_orders_tracking_token (tracking_token);

-- ────────────────────────────────────────────────────────────
-- 2. Generar tokens para órdenes existentes
-- ────────────────────────────────────────────────────────────
UPDATE orders
SET tracking_token = (SELECT UUID())
WHERE tracking_token IS NULL;

-- ────────────────────────────────────────────────────────────
-- 3. Trigger: generar token automáticamente al crear orden
-- ────────────────────────────────────────────────────────────
DROP TRIGGER IF EXISTS trg_orders_tracking_token;

DELIMITER //
CREATE TRIGGER trg_orders_tracking_token
  BEFORE INSERT ON orders
  FOR EACH ROW
BEGIN
  IF NEW.tracking_token IS NULL OR NEW.tracking_token = '' THEN
    SET NEW.tracking_token = UUID();
  END IF;
END //
DELIMITER ;
