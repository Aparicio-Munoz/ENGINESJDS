-- ============================================================
-- ENGINES JDS — Limpieza de datos demo para producción
--
-- Elimina TODOS los registros de prueba.
-- Conserva: estructura, vistas, triggers, roles, settings.
-- Deja un único usuario Administrador.
--
-- Contraseña del admin: Admin123*
-- ============================================================

USE engines_jds;

SET FOREIGN_KEY_CHECKS = 0;

-- ── 1. Tablas dependientes (hijas primero) ──────────────────
TRUNCATE TABLE appointment_reschedules;
TRUNCATE TABLE order_services;
TRUNCATE TABLE order_items;
TRUNCATE TABLE order_status_history;
TRUNCATE TABLE sales;
TRUNCATE TABLE invoices;
TRUNCATE TABLE customer_reminders;
TRUNCATE TABLE inventory_movements;
TRUNCATE TABLE deletion_logs;
TRUNCATE TABLE audit_logs;
TRUNCATE TABLE backups;
TRUNCATE TABLE login_attempts;
TRUNCATE TABLE refresh_tokens;
TRUNCATE TABLE notifications;
TRUNCATE TABLE tecnomecanica;

-- ── 2. Tablas principales ───────────────────────────────────
TRUNCATE TABLE orders;
TRUNCATE TABLE appointments;
TRUNCATE TABLE motorcycles;
TRUNCATE TABLE clients;
TRUNCATE TABLE employees;
TRUNCATE TABLE inventory;
TRUNCATE TABLE brands;
TRUNCATE TABLE service_catalog;

-- ── 3. Eliminar usuarios de prueba ──────────────────────────
DELETE FROM users WHERE 1=1;

-- ── 4. Crear usuario administrador de producción ────────────
-- Contraseña: Admin123* (bcrypt 12 rounds)
-- IMPORTANTE: Regenerar el hash si cambias la contraseña:
--   node -e "console.log(require('bcryptjs').hashSync('TU_CONTRASEÑA', 12))"
INSERT INTO users (id, role_id, username, email, password_hash, status)
VALUES (
  1,
  (SELECT id FROM roles WHERE name = 'Administrador'),
  'Administrador',
  'admin@enginesjds.com',
  -- Hash generado para: Admin123*
  '$2a$12$w4aYUt/PMIJ1wJ1Q4aR6B.msi6rRTL6wRJ1RfFw1fVuJceZ3/5lKS',
  'Activo'
);

-- ── 5. Reiniciar AUTO_INCREMENT ─────────────────────────────
ALTER TABLE appointment_reschedules AUTO_INCREMENT = 1;
ALTER TABLE appointments AUTO_INCREMENT = 1;
ALTER TABLE audit_logs AUTO_INCREMENT = 1;
ALTER TABLE backups AUTO_INCREMENT = 1;
ALTER TABLE brands AUTO_INCREMENT = 1;
ALTER TABLE clients AUTO_INCREMENT = 1;
ALTER TABLE customer_reminders AUTO_INCREMENT = 1;
ALTER TABLE deletion_logs AUTO_INCREMENT = 1;
ALTER TABLE employees AUTO_INCREMENT = 1;
ALTER TABLE inventory AUTO_INCREMENT = 1;
ALTER TABLE inventory_movements AUTO_INCREMENT = 1;
ALTER TABLE invoices AUTO_INCREMENT = 1;
ALTER TABLE login_attempts AUTO_INCREMENT = 1;
ALTER TABLE motorcycles AUTO_INCREMENT = 1;
ALTER TABLE order_items AUTO_INCREMENT = 1;
ALTER TABLE order_services AUTO_INCREMENT = 1;
ALTER TABLE order_status_history AUTO_INCREMENT = 1;
ALTER TABLE orders AUTO_INCREMENT = 1;
ALTER TABLE refresh_tokens AUTO_INCREMENT = 1;
ALTER TABLE sales AUTO_INCREMENT = 1;
ALTER TABLE service_catalog AUTO_INCREMENT = 1;
ALTER TABLE tecnomecanica AUTO_INCREMENT = 1;
ALTER TABLE users AUTO_INCREMENT = 2;

SET FOREIGN_KEY_CHECKS = 1;
