-- ============================================================
-- SGTM — Sesiones con expiración por inactividad
-- ============================================================

USE engines_jds;

ALTER TABLE refresh_tokens
  ADD COLUMN last_activity DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
  AFTER created_at;

CREATE INDEX idx_rt_last_activity ON refresh_tokens (last_activity);
