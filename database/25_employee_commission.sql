-- ============================================================
-- ENGINES JDS — Migración: comisión por empleado
-- Porcentaje editable por el administrador. Las ganancias del
-- empleado se calculan como:
--   SUM(orders.labor_cost) de sus órdenes asignadas × commission_percent / 100
-- ============================================================

USE engines_jds;

ALTER TABLE employees
  ADD COLUMN commission_percent DECIMAL(5,2) NOT NULL DEFAULT 0.00
  COMMENT 'Porcentaje de comisión sobre mano de obra (0-100)'
  AFTER daily_rate;
