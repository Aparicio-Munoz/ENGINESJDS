-- ============================================================
-- ENGINES JDS — Migración: inventory.code / name / brand / category opcionales
-- El formulario "Nuevo repuesto" deja de exigir estos datos: se puede
-- registrar un repuesto con información parcial y completarla después.
-- unit_price, sale_price, quantity, min_stock ya tienen DEFAULT en el
-- esquema (0, 0, 0, 5) y no necesitan volverse NULL: el backend los
-- completa con esos valores por defecto cuando el usuario no los envía.
-- uq_inventory_code sigue permitiendo múltiples NULL (comportamiento
-- estándar de UNIQUE KEY en MySQL), igual que uq_motorcycles_plate.
-- chk_inventory_prices no necesita cambios: un CHECK constraint pasa
-- cuando la expresión evalúa a NULL/UNKNOWN (estándar SQL).
-- ============================================================

USE engines_jds;

ALTER TABLE inventory
  MODIFY code     VARCHAR(20)  NULL,
  MODIFY name     VARCHAR(120) NULL,
  MODIFY brand    VARCHAR(60)  NULL,
  MODIFY category ENUM('Transmisión','Eléctrico','Rodaje y Suspensión','Motor','Frenos y Dirección') NULL;
