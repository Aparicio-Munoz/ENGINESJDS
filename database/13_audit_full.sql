-- ============================================================
-- ENGINES JDS — Migración: Auditoría completa
-- Amplía audit_logs para registrar cambios de entidades
-- (table_name, record_id, old_values, new_values, ip_address)
-- manteniendo la auditoría de autenticación existente.
-- ============================================================

USE engines_jds;

-- 1. action pasa de ENUM a VARCHAR para admitir acciones de entidades
ALTER TABLE audit_logs
  MODIFY COLUMN action VARCHAR(60) NOT NULL;

-- 2. Nuevas columnas de auditoría de cambios
ALTER TABLE audit_logs
  ADD COLUMN table_name VARCHAR(64)  NULL AFTER action,
  ADD COLUMN record_id  INT UNSIGNED NULL AFTER table_name,
  ADD COLUMN old_values JSON         NULL AFTER record_id,
  ADD COLUMN new_values JSON         NULL AFTER old_values,
  ADD COLUMN ip_address VARCHAR(45)  NULL AFTER new_values;

-- 3. Migrar datos de auth existentes a las nuevas columnas
UPDATE audit_logs SET ip_address = ip       WHERE ip IS NOT NULL;
UPDATE audit_logs SET new_values = details  WHERE details IS NOT NULL;

-- 4. Eliminar columnas antiguas (reemplazadas)
ALTER TABLE audit_logs
  DROP COLUMN ip,
  DROP COLUMN details;

-- 5. Índices para filtros de la vista de auditoría
ALTER TABLE audit_logs
  ADD KEY idx_audit_table  (table_name),
  ADD KEY idx_audit_record (record_id);
