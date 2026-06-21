-- Ampliar estados de motocicletas
USE engines_jds;

ALTER TABLE motorcycles
  MODIFY COLUMN status
    ENUM('En servicio','Disponible','Lista para entrega','En reparación','Esperando repuesto','Entregada')
    NOT NULL DEFAULT 'Disponible';
