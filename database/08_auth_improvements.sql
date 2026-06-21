-- Mejoras al sistema de autenticación: códigos de recuperación + auditoría
USE engines_jds;

-- Limpia tabla temporal de intentos (reemplazada por express-rate-limit)
DROP TABLE IF EXISTS login_attempts;

-- ── Recuperación de contraseña por código numérico ──────────────────────────
CREATE TABLE IF NOT EXISTS password_resets (
  id          INT          AUTO_INCREMENT PRIMARY KEY,
  user_id     INT          NOT NULL,
  code        CHAR(64)     NOT NULL COMMENT 'SHA-256 del código de 6 dígitos',
  expires_at  DATETIME     NOT NULL,
  used        TINYINT(1)   NOT NULL DEFAULT 0,
  created_at  DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  KEY idx_pr_user    (user_id),
  KEY idx_pr_expires (expires_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ── Auditoría de eventos de autenticación ────────────────────────────────────
CREATE TABLE IF NOT EXISTS audit_logs (
  id         BIGINT AUTO_INCREMENT PRIMARY KEY,
  user_id    INT          NULL,
  action     ENUM(
    'LOGIN_EXITOSO',
    'LOGIN_FALLIDO',
    'RECUPERACION_CONTRASENA',
    'CAMBIO_CONTRASENA'
  ) NOT NULL,
  ip         VARCHAR(45)  NULL,
  details    JSON         NULL,
  created_at DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  KEY idx_audit_user    (user_id),
  KEY idx_audit_action  (action),
  KEY idx_audit_created (created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
