-- ============================================================
-- ENGINES JDS — Migración: Auditoría profesional
-- Agrega user_name, role, description a audit_logs
-- ============================================================

USE engines_jds;

ALTER TABLE audit_logs
  ADD COLUMN user_name   VARCHAR(60)  NULL AFTER user_id,
  ADD COLUMN role        VARCHAR(30)  NULL AFTER user_name,
  ADD COLUMN description TEXT         NULL AFTER new_values;

-- Backfill de registros existentes
UPDATE audit_logs a
LEFT JOIN users u ON u.id = a.user_id
LEFT JOIN roles r ON r.id = u.role_id
SET a.user_name = u.username, a.role = r.name
WHERE a.user_name IS NULL AND a.user_id IS NOT NULL;
