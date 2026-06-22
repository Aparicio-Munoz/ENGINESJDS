-- ============================================================
-- ENGINES JDS — Migración: Módulo de respaldos
-- ============================================================

USE engines_jds;

CREATE TABLE IF NOT EXISTS backups (
  id          INT UNSIGNED  NOT NULL AUTO_INCREMENT,
  filename    VARCHAR(200)  NOT NULL,
  size_kb     INT UNSIGNED  NOT NULL DEFAULT 0,
  created_by  INT UNSIGNED  NULL,
  status      ENUM('SUCCESS','FAILED') NOT NULL DEFAULT 'SUCCESS',
  notes       TEXT          NULL,
  created_at  TIMESTAMP     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY idx_backups_status     (status),
  KEY idx_backups_created_at (created_at),
  CONSTRAINT fk_backups_user FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  COMMENT='Historial de respaldos de base de datos';
