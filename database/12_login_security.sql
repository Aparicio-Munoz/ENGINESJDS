-- ============================================================
-- ENGINES JDS — Migración: Seguridad de login
-- Bloqueo de IP por intentos fallidos + refresh tokens
-- ============================================================

USE engines_jds;

-- ────────────────────────────────────────────────────────────
-- 1. LOGIN_ATTEMPTS — Control de intentos fallidos por IP
--    Una fila por IP que acumula intentos; bloqueo temporal.
--    Registra: IP, último usuario intentado, intentos, fecha, bloqueo.
-- ────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS login_attempts (
  id              INT AUTO_INCREMENT PRIMARY KEY,
  ip              VARCHAR(45)  NOT NULL,
  email           VARCHAR(120) NULL COMMENT 'Último usuario que intentó desde esta IP',
  attempts        INT          NOT NULL DEFAULT 0,
  last_attempt_at DATETIME     NULL,
  blocked_until   DATETIME     NULL COMMENT 'NULL = sin bloqueo; futuro = bloqueada',
  created_at      DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at      DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY uq_login_attempts_ip (ip),
  KEY idx_login_attempts_blocked (blocked_until)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  COMMENT='Intentos de login fallidos y bloqueo temporal por IP';

-- ────────────────────────────────────────────────────────────
-- 2. REFRESH_TOKENS — Tokens de refresco (invalidables al logout)
--    Se almacena el hash SHA-256, nunca el token en claro.
-- ────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS refresh_tokens (
  id          INT AUTO_INCREMENT PRIMARY KEY,
  user_id     INT UNSIGNED NOT NULL,
  token_hash  CHAR(64)     NOT NULL COMMENT 'SHA-256 del refresh token',
  expires_at  DATETIME     NOT NULL,
  revoked     TINYINT(1)   NOT NULL DEFAULT 0,
  ip          VARCHAR(45)  NULL,
  created_at  DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE KEY uq_refresh_token_hash (token_hash),
  KEY idx_rt_user    (user_id),
  KEY idx_rt_expires (expires_at),
  CONSTRAINT fk_rt_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  COMMENT='Refresh tokens activos — revocados al cerrar sesión';

-- ────────────────────────────────────────────────────────────
-- 3. Extender auditoría con eventos de seguridad
-- ────────────────────────────────────────────────────────────
ALTER TABLE audit_logs
  MODIFY COLUMN action ENUM(
    'LOGIN_EXITOSO',
    'LOGIN_FALLIDO',
    'RECUPERACION_CONTRASENA',
    'CAMBIO_CONTRASENA',
    'LOGOUT',
    'IP_BLOQUEADA'
  ) NOT NULL;
