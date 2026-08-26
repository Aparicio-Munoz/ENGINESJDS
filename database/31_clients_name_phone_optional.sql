-- ============================================================
-- ENGINES JDS — Migración: clients.name / last_name / phone opcionales
-- El formulario "Nuevo cliente" deja de exigir estos datos: se puede
-- registrar un cliente con información parcial y completarla después.
-- document_type conserva su DEFAULT 'CC' (ya cubre el caso de no
-- seleccionarlo explícitamente) y document ya es nullable desde
-- 24_clients_optional_fields.sql.
-- ============================================================

USE engines_jds;

ALTER TABLE clients
  MODIFY name      VARCHAR(100) NULL,
  MODIFY last_name VARCHAR(100) NULL,
  MODIFY phone     VARCHAR(20)  NULL;
