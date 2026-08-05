-- ============================================================
-- ENGINES JDS — Migración: clients.document nullable
-- El documento volvió a capturarse en el formulario (obligatorio a
-- nivel de aplicación), pero la columna queda NULL-able para tolerar
-- clientes históricos registrados sin documento.
-- Los campos email y address se conservan en la tabla pero ya no se
-- capturan ni se muestran en la aplicación.
-- ============================================================

USE engines_jds;

ALTER TABLE clients
  MODIFY document VARCHAR(20) NULL;

-- La unicidad se conserva: MySQL permite múltiples NULL en un índice
-- UNIQUE, así que los clientes históricos sin documento no chocan.
