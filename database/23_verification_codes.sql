-- ────────────────────────────────────────────────────────────
-- 23. VERIFICATION_CODES
-- Códigos temporales para recuperación de contraseña
-- y futuras verificaciones del sistema.
-- ────────────────────────────────────────────────────────────

USE engines_jds;

CREATE TABLE IF NOT EXISTS verification_codes (

    id INT UNSIGNED NOT NULL AUTO_INCREMENT,

    user_id INT UNSIGNED NOT NULL,

    type ENUM(
        'password_reset',
        'email_verification',
        'email_change',
        'two_factor_auth',
        'account_activation'
    ) NOT NULL,

    code_hash VARCHAR(255) NOT NULL,

    attempts TINYINT UNSIGNED NOT NULL DEFAULT 0,

    expires_at DATETIME NOT NULL,

    used_at DATETIME NULL,

    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,

    PRIMARY KEY (id),

    KEY idx_verification_lookup (user_id, type, used_at),
    KEY idx_verification_expires (expires_at),

    CONSTRAINT fk_verification_user
        FOREIGN KEY (user_id)
        REFERENCES users(id)
        ON UPDATE CASCADE
        ON DELETE CASCADE

) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  COMMENT='Códigos temporales de verificación para recuperación de contraseña y futuros procesos de autenticación';
