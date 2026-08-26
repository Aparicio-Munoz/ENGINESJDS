-- ============================================================
-- ENGINES JDS — Cliente y motocicleta opcionales en órdenes
-- Permite crear una orden de trabajo sin cliente ni motocicleta
-- asignados todavía (ej. la moto entra al taller antes de tener
-- todos los datos del cliente registrados). No se exige llenarlos
-- para poder cerrar/entregar la orden — decisión explícita del
-- usuario: el registro de venta e historial pueden quedar sin
-- esos datos si nunca se completan.
-- ============================================================

USE engines_jds;

ALTER TABLE orders
  MODIFY COLUMN client_id     INT UNSIGNED NULL,
  MODIFY COLUMN motorcycle_id INT UNSIGNED NULL;
