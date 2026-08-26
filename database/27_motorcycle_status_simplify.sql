-- ============================================================
-- ENGINES JDS — Migración: simplificar motorcycles.status a 4 estados
-- Estados finales: 'En servicio', 'En reparación', 'Lista para entrega', 'Entregada'
-- Se eliminan: 'Disponible', 'Esperando repuesto'
--
-- Remapeo de datos existentes (antes de estrechar el ENUM):
--   'Disponible'         -> 'En servicio'      (moto en el taller sin estado específico)
--   'Esperando repuesto' -> 'En reparación'    (sigue siendo un trabajo activo detenido)
--
-- No afecta orders.status (tiene su propio ENUM independiente, que sí
-- conserva 'Esperando repuesto' como parte del flujo de la orden de trabajo).
-- ============================================================

USE engines_jds;

UPDATE motorcycles SET status = 'En servicio'   WHERE status = 'Disponible';
UPDATE motorcycles SET status = 'En reparación' WHERE status = 'Esperando repuesto';

ALTER TABLE motorcycles
  MODIFY status ENUM('En servicio','En reparación','Lista para entrega','Entregada')
  NOT NULL DEFAULT 'En servicio';
