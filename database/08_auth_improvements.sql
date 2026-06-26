-- Mejoras al sistema de autenticación: auditoría
USE engines_jds;

-- Limpia tabla temporal de intentos (reemplazada por express-rate-limit)
DROP TABLE IF EXISTS login_attempts;

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
