-- ============================================================
-- ENGINES JDS — Reset de usuarios
-- Limpia todos los usuarios y datos relacionados.
-- Crea un administrador por defecto.
-- ============================================================

USE engines_jds;

SET FOREIGN_KEY_CHECKS = 0;

-- Limpiar tablas relacionadas con autenticación
DELETE FROM password_resets;
DELETE FROM refresh_tokens;

-- Limpiar audit_logs de login (conservar estructura)
DELETE FROM audit_logs WHERE action IN (
  'LOGIN_EXITOSO', 'LOGIN_FALLIDO', 'LOGOUT',
  'CAMBIO_CONTRASENA', 'RECUPERACION_CONTRASENA',
  'IP_BLOQUEADA'
);

-- Limpiar intentos de login
DELETE FROM login_attempts;

-- Eliminar todos los usuarios
DELETE FROM users;

-- Reiniciar AUTO_INCREMENT
ALTER TABLE users AUTO_INCREMENT = 1;
ALTER TABLE password_resets AUTO_INCREMENT = 1;
ALTER TABLE refresh_tokens AUTO_INCREMENT = 1;

SET FOREIGN_KEY_CHECKS = 1;

-- Agregar columna de registro público en settings (si no existe)
SET @col_exists = (
  SELECT COUNT(*) FROM information_schema.COLUMNS
  WHERE TABLE_SCHEMA = 'engines_jds'
    AND TABLE_NAME = 'settings'
    AND COLUMN_NAME = 'allow_public_registration'
);
SET @sql = IF(@col_exists = 0,
  'ALTER TABLE settings ADD COLUMN allow_public_registration TINYINT(1) NOT NULL DEFAULT 0 COMMENT ''Permitir registro público de usuarios''',
  'SELECT 1'
);
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- Crear usuario administrador por defecto
-- Email: admin@enginesjds.com
-- Contraseña: Admin123*
-- Hash bcrypt (12 rounds): $2a$12$T6.mkaGu6gkCbUx8opN34e2KIF5F66aR3rdEgPiXy1x1VnM0CoV/C
INSERT INTO users (role_id, username, email, password_hash, status)
VALUES (
  (SELECT id FROM roles WHERE name = 'Administrador'),
  'Administrador',
  'admin@enginesjds.com',
  '$2a$12$T6.mkaGu6gkCbUx8opN34e2KIF5F66aR3rdEgPiXy1x1VnM0CoV/C',
  'Activo'
);

SELECT '✓ Usuarios limpiados' AS resultado;
SELECT '✓ Admin creado: admin@enginesjds.com / Admin123*' AS resultado;
