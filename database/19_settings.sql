-- ============================================================
-- ENGINES JDS — Migración: Configuración general del sistema
-- ============================================================

USE engines_jds;

CREATE TABLE IF NOT EXISTS settings (
  id                 INT UNSIGNED  NOT NULL AUTO_INCREMENT,
  business_name      VARCHAR(120)  NOT NULL DEFAULT 'ENGINES JDS',
  slogan             VARCHAR(200)  NULL DEFAULT 'Taller especializado en motocicletas',
  logo_url           VARCHAR(500)  NULL,
  address            VARCHAR(200)  NULL,
  phone              VARCHAR(30)   NULL,
  email              VARCHAR(120)  NULL,
  website            VARCHAR(200)  NULL DEFAULT 'www.enginesjds.com',
  facebook           VARCHAR(200)  NULL,
  instagram          VARCHAR(200)  NULL,
  whatsapp           VARCHAR(30)   NULL DEFAULT '573183531500',
  working_hours      JSON          NULL COMMENT '{"weekdays":"8:00-18:00","saturday":"8:00-13:00","sunday":"Cerrado"}',
  currency           VARCHAR(10)   NOT NULL DEFAULT 'COP',
  tax_percent        DECIMAL(5,2)  NOT NULL DEFAULT 0.00,
  primary_color      VARCHAR(10)   NOT NULL DEFAULT '#F97316',
  secondary_color    VARCHAR(10)   NOT NULL DEFAULT '#1E293B',
  footer_message     VARCHAR(500)  NULL DEFAULT 'Gracias por confiar en ENGINES JDS',
  signature_name     VARCHAR(100)  NULL,
  signature_position VARCHAR(100)  NULL,
  updated_at         TIMESTAMP     NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  COMMENT='Configuración general del sistema — fila única';

-- Seed: fila única de configuración
INSERT INTO settings (id, business_name, address, phone, whatsapp, working_hours)
VALUES (1, 'ENGINES JDS', 'Bogotá, Colombia', '3183531500', '573183531500',
  '{"weekdays":"8:00 AM - 6:00 PM","saturday":"8:00 AM - 1:00 PM","sunday":"Cerrado"}')
ON DUPLICATE KEY UPDATE id = id;
