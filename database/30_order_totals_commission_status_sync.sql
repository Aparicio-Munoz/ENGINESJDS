-- ============================================================
-- ENGINES JDS — Corrección definitiva del módulo Órdenes de Trabajo
--
-- 1. TOTAL de la orden no incluía los servicios (order_services).
--    subtotal/final_price sólo sumaban labor_cost + parts_cost.
--    Se agrega orders.services_cost (mantenido por trigger, igual
--    que parts_cost) y se recalculan las columnas GENERATED:
--      subtotal    = labor_cost + parts_cost + services_cost
--      final_price = labor_cost + parts_cost + services_cost - discount
--
-- 2. sales.services_subtotal se agrega para que el desglose
--    (parts_subtotal + labor_subtotal + services_subtotal - discount)
--    siga sumando exactamente sales.total — evita que quede un
--    registro financiero inconsistente una vez el total real
--    incluye servicios.
--
-- No se toca orders.status (7 valores, panel técnico/tracking/PDF)
-- ni motorcycles.status (4 valores, migración 27) — sólo se agregan
-- columnas y triggers de sincronización de totales.
-- ============================================================

USE engines_jds;

-- ────────────────────────────────────────────────────────────
-- 1. orders.services_cost
-- ────────────────────────────────────────────────────────────
ALTER TABLE orders
  ADD COLUMN services_cost DECIMAL(10,2) NOT NULL DEFAULT 0.00
  COMMENT 'Suma de order_services.total_price — actualizado por trigger'
  AFTER parts_cost;

-- Backfill con los servicios ya registrados en órdenes existentes
UPDATE orders o
SET o.services_cost = (
  SELECT COALESCE(SUM(os.total_price), 0)
  FROM order_services os
  WHERE os.order_id = o.id
);

-- ── Recalcular columnas GENERATED para incluir services_cost ──
ALTER TABLE orders DROP CHECK chk_orders_discount;

ALTER TABLE orders
  MODIFY COLUMN subtotal    DECIMAL(10,2) GENERATED ALWAYS AS (labor_cost + parts_cost + services_cost) STORED,
  MODIFY COLUMN final_price DECIMAL(10,2) GENERATED ALWAYS AS (labor_cost + parts_cost + services_cost - discount) STORED;

ALTER TABLE orders
  ADD CONSTRAINT chk_orders_discount
    CHECK (discount >= 0 AND discount <= (labor_cost + parts_cost + services_cost));

-- ────────────────────────────────────────────────────────────
-- 2. Triggers: mantener orders.services_cost en order_services
--    (mismo patrón que trg_order_items_after_insert/delete)
-- ────────────────────────────────────────────────────────────
DROP TRIGGER IF EXISTS trg_order_services_after_insert;
DROP TRIGGER IF EXISTS trg_order_services_after_delete;

DELIMITER //

CREATE TRIGGER trg_order_services_after_insert
AFTER INSERT ON order_services
FOR EACH ROW
BEGIN
  UPDATE orders
  SET services_cost = (
    SELECT COALESCE(SUM(total_price), 0)
    FROM order_services
    WHERE order_id = NEW.order_id
  )
  WHERE id = NEW.order_id;
END //

CREATE TRIGGER trg_order_services_after_delete
AFTER DELETE ON order_services
FOR EACH ROW
BEGIN
  UPDATE orders
  SET services_cost = (
    SELECT COALESCE(SUM(total_price), 0)
    FROM order_services
    WHERE order_id = OLD.order_id
  )
  WHERE id = OLD.order_id;
END //

DELIMITER ;

-- ────────────────────────────────────────────────────────────
-- 3. sales.services_subtotal — desglose consistente con el total
-- ────────────────────────────────────────────────────────────
ALTER TABLE sales
  ADD COLUMN services_subtotal DECIMAL(10,2) NOT NULL DEFAULT 0.00
  AFTER labor_subtotal;

-- Resincronizar ventas ya registradas (órdenes ya entregadas)
-- con el desglose y total reales, ahora incluyendo servicios
UPDATE sales s
INNER JOIN orders o ON o.id = s.order_id
SET
  s.parts_subtotal    = o.parts_cost,
  s.labor_subtotal    = o.labor_cost,
  s.services_subtotal = o.services_cost,
  s.discount          = o.discount,
  s.total             = o.final_price;

-- ────────────────────────────────────────────────────────────
-- 4. Recrear trg_orders_after_update para poblar services_subtotal
--    al crear el registro de venta (idéntico al original + el
--    nuevo campo)
-- ────────────────────────────────────────────────────────────
DROP TRIGGER IF EXISTS trg_orders_after_update;

DELIMITER //

CREATE TRIGGER trg_orders_after_update
AFTER UPDATE ON orders
FOR EACH ROW
BEGIN
  IF OLD.status != NEW.status THEN
    INSERT INTO order_status_history (order_id, previous_status, new_status)
    VALUES (NEW.id, OLD.status, NEW.status);

    -- Crear registro de venta al marcar como Entregada
    IF NEW.status = 'Entregada' AND OLD.status != 'Entregada' THEN
      INSERT INTO sales (
        order_id, sale_date, parts_subtotal, labor_subtotal, services_subtotal,
        discount, total, payment_status
      ) VALUES (
        NEW.id,
        NOW(),
        NEW.parts_cost,
        NEW.labor_cost,
        NEW.services_cost,
        NEW.discount,
        NEW.final_price,
        'Pendiente'
      )
      ON DUPLICATE KEY UPDATE
        sale_date         = NOW(),
        parts_subtotal    = NEW.parts_cost,
        labor_subtotal    = NEW.labor_cost,
        services_subtotal = NEW.services_cost,
        discount          = NEW.discount,
        total             = NEW.final_price;
    END IF;
  END IF;
END //

DELIMITER ;
