-- Eliminación de tablas de recuperación de contraseña
-- El módulo se reimplementará desde cero.
USE engines_jds;

DROP TABLE IF EXISTS password_reset_tokens;
DROP TABLE IF EXISTS password_resets;
