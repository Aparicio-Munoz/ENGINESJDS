-- Ampliar estados de empleados
USE engines_jds;

ALTER TABLE employees
  MODIFY COLUMN status
    ENUM('Activo','Inactivo','Vacaciones','Incapacidad','Suspendido','Retirado')
    NOT NULL DEFAULT 'Activo';
