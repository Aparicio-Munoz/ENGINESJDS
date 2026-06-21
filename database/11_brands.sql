-- ============================================================
-- ENGINES JDS — Migración: Gestión de marcas de repuestos
-- Tabla brands (con precio) + seed por categoría
-- ============================================================

USE engines_jds;

-- ────────────────────────────────────────────────────────────
-- 1. BRANDS — Marcas de repuestos por categoría
-- ────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS brands (
  id          INT UNSIGNED    NOT NULL AUTO_INCREMENT,
  name        VARCHAR(100)    NOT NULL,
  category    ENUM('Aceites','Filtros','Llantas','Baterías',
                   'Pastillas','Accesorios','Lubricantes','Eléctricos') NOT NULL,
  price       DECIMAL(10,2)   NOT NULL DEFAULT 0.00 COMMENT 'Precio de referencia en COP',
  status      ENUM('Activo','Inactivo') NOT NULL DEFAULT 'Activo',
  created_at  TIMESTAMP       NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at  TIMESTAMP       NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uq_brands_name_category (name, category),
  KEY idx_brands_category (category),
  KEY idx_brands_status   (status)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  COMMENT='Marcas de repuestos agrupadas por categoría con precio de referencia';

-- ────────────────────────────────────────────────────────────
-- 2. Seed inicial de marcas con precios
-- ────────────────────────────────────────────────────────────
INSERT INTO brands (name, category, price) VALUES
  -- Aceites
  ('Castrol Power 1',   'Aceites', 85000),
  ('Motul 7100',        'Aceites', 92000),
  ('Yamalube 4T',       'Aceites', 48000),
  ('Repsol Moto',       'Aceites', 65000),
  -- Filtros
  ('Champion',          'Filtros', 18000),
  ('K&N',              'Filtros', 45000),
  ('Mann Filter',       'Filtros', 22000),
  ('Hiflofiltro',       'Filtros', 15000),
  -- Llantas
  ('Pirelli Diablo',    'Llantas', 320000),
  ('Michelin Pilot',    'Llantas', 380000),
  ('Maxxis Supermaxx',  'Llantas', 190000),
  ('IRC Road Winner',   'Llantas', 145000),
  -- Baterías
  ('Yuasa YTX',         'Baterías', 180000),
  ('Bosch M6',          'Baterías', 160000),
  ('Moura MA',          'Baterías', 95000),
  ('MAC Gold',          'Baterías', 120000),
  -- Pastillas
  ('Brembo Sintered',   'Pastillas', 85000),
  ('EBC Double-H',      'Pastillas', 72000),
  ('Galfer FD',         'Pastillas', 55000),
  ('Ferodo Platinum',   'Pastillas', 48000),
  -- Accesorios
  ('Pro Taper',         'Accesorios', 120000),
  ('Renthal',           'Accesorios', 95000),
  ('Rizoma',            'Accesorios', 280000),
  ('SW-Motech',         'Accesorios', 350000),
  -- Lubricantes
  ('WD-40 Specialist',  'Lubricantes', 32000),
  ('Bel-Ray Chain',     'Lubricantes', 45000),
  ('Maxima Chain Wax',  'Lubricantes', 38000),
  -- Eléctricos
  ('NGK Iridium',       'Eléctricos', 35000),
  ('Bosch Platinum',    'Eléctricos', 28000),
  ('Denso Iridium',     'Eléctricos', 42000)
ON DUPLICATE KEY UPDATE price = VALUES(price);
