-- ============================================================
-- ENGINES JDS — Base confiable para utilidad bruta
--
-- Conserva los costos que cambian con el tiempo en el momento en
-- que se agregan a la orden. Sin estos snapshots, cambiar el costo
-- de inventario o la comisión de un técnico reescribiría la
-- utilidad histórica en los reportes.
--
-- La utilidad bruta se define como:
-- venta de órdenes + trabajos rápidos
--   - costo de repuestos
--   - comisión de técnico sobre mano de obra
--   - pago completo de trabajos rápidos al técnico.
-- Nómina fija y gastos operativos no se registran aquí y no se
-- descuentan de la utilidad bruta.
-- ============================================================

USE engines_jds;

-- Costo de compra del repuesto al incorporarlo a una orden.
-- `unit_price` continúa siendo el precio de venta al cliente.
ALTER TABLE order_items
  ADD COLUMN unit_cost DECIMAL(10,2) NOT NULL DEFAULT 0.00
  COMMENT 'Costo de compra por unidad al agregar el repuesto a la orden'
  AFTER unit_price,
  ADD COLUMN cost_is_estimated TINYINT(1) NOT NULL DEFAULT 1
  COMMENT '1 cuando el costo fue reconstruido para una orden anterior'
  AFTER unit_cost;

-- Los registros anteriores no tenían el costo histórico. Se recupera el
-- costo vigente como mejor estimación y se conserva la marca para que el
-- reporte no presente esa utilidad como exacta.
UPDATE order_items oi
INNER JOIN inventory i ON i.id = oi.inventory_id
SET oi.unit_cost = i.unit_price,
    oi.cost_is_estimated = 1;

-- Comisión aplicable en la orden, separada del porcentaje que el empleado
-- pueda tener después. Una orden activa toma el porcentaje actual y queda
-- lista para cerrarse con un cálculo estable; las órdenes ya entregadas se
-- marcan como estimadas porque su porcentaje histórico no existía.
ALTER TABLE orders
  ADD COLUMN technician_commission_percent DECIMAL(5,2) NOT NULL DEFAULT 0.00
  COMMENT 'Porcentaje de comisión del técnico fijado para esta orden'
  AFTER assigned_employee_id,
  ADD COLUMN commission_is_estimated TINYINT(1) NOT NULL DEFAULT 0
  COMMENT '1 cuando la comisión se reconstruyó en una orden entregada'
  AFTER technician_commission_percent;

UPDATE orders o
LEFT JOIN employees e ON e.id = o.assigned_employee_id
SET o.technician_commission_percent = COALESCE(e.commission_percent, 0),
    o.commission_is_estimated = CASE
      WHEN o.status = 'Entregada' AND o.assigned_employee_id IS NOT NULL THEN 1
      ELSE 0
    END;
