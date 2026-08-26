-- ============================================================
-- ENGINES JDS — Migración: simplificar inventory.category a 5 categorías
-- Categorías finales: 'Transmisión', 'Eléctrico', 'Rodaje y Suspensión',
--                      'Motor', 'Frenos y Dirección'
-- Se eliminan: 'Aceites', 'Filtros', 'Llantas', 'Frenos', 'Eléctricos', 'Accesorios'
--
-- Remapeo de datos existentes (antes de estrechar el ENUM):
--   'Aceites'     -> 'Motor'                 (lubricantes de motor)
--   'Filtros'     -> 'Motor'                 (filtros de aceite/aire del motor)
--   'Llantas'     -> 'Rodaje y Suspensión'   (rodaje)
--   'Frenos'      -> 'Frenos y Dirección'    (equivalente directo)
--   'Eléctricos'  -> 'Eléctrico'             (mismo concepto, singular)
--   'Transmisión' -> 'Transmisión'           (sin cambio)
--   'Accesorios'  -> revisado ítem por ítem (guayas de acelerador/clutch, etc.)
-- ============================================================

USE engines_jds;

-- Bajo sql_mode estricto (ej. Aiven: ANSI global) MySQL rechaza un UPDATE
-- que asigne un valor todavía no admitido por el ENUM ("Data truncated for
-- column 'category'"), así que primero se amplía el ENUM para aceptar
-- tanto los valores viejos como los nuevos, se migran los datos, y solo
-- al final se angosta al set definitivo de 5.
ALTER TABLE inventory
  MODIFY category ENUM(
    'Aceites','Filtros','Llantas','Frenos','Transmisión','Eléctricos','Accesorios',
    'Motor','Rodaje y Suspensión','Frenos y Dirección','Eléctrico'
  ) NOT NULL;

UPDATE inventory SET category = 'Motor'                 WHERE category = 'Aceites';
UPDATE inventory SET category = 'Motor'                 WHERE category = 'Filtros';
UPDATE inventory SET category = 'Rodaje y Suspensión'   WHERE category = 'Llantas';
UPDATE inventory SET category = 'Frenos y Dirección'    WHERE category = 'Frenos';
UPDATE inventory SET category = 'Eléctrico'             WHERE category = 'Eléctricos';

-- 'Accesorios' remanente sin código específico -> Motor (categoría genérica de repuestos varios)
UPDATE inventory SET category = 'Transmisión' WHERE category = 'Accesorios' AND code = 'DY161201'; -- guaya de clutch (embrague/transmisión)
UPDATE inventory SET category = 'Motor'       WHERE category = 'Accesorios';                       -- resto (guaya de acelerador, etc.)

ALTER TABLE inventory
  MODIFY category ENUM('Transmisión','Eléctrico','Rodaje y Suspensión','Motor','Frenos y Dirección') NOT NULL;
