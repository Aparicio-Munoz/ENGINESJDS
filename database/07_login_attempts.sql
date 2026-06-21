-- Bloqueo de IP por intentos de login fallidos
USE engines_jds;

CREATE TABLE IF NOT EXISTS login_attempts (
  id             INT AUTO_INCREMENT PRIMARY KEY,
  ip             VARCHAR(45) NOT NULL,
  attempts       INT NOT NULL DEFAULT 0,
  blocked_until  DATETIME NULL,
  updated_at     DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY uq_login_attempts_ip (ip)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
