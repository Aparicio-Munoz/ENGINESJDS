-- ============================================================
-- ENGINES JDS — Trabajos rápidos
-- Trabajo suelto (sin orden completa, sin cliente ni motocicleta):
-- descripción, precio y quién lo hizo. El precio se abona 100% al
-- empleado (sin aplicar commission_percent — a diferencia de las
-- órdenes normales, un trabajo rápido no tiene repuestos/mano de obra
-- por separado, es un monto único que el técnico se gana completo).
-- ============================================================

USE engines_jds;

CREATE TABLE quick_jobs (
  id           INT UNSIGNED  NOT NULL AUTO_INCREMENT,
  description  VARCHAR(200)  NOT NULL,
  price        DECIMAL(10,2) NOT NULL,
  employee_id  INT UNSIGNED  NOT NULL,
  created_by   INT UNSIGNED  NULL,
  created_at   TIMESTAMP     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  deleted_at   DATETIME      NULL,
  PRIMARY KEY (id),
  KEY idx_quick_jobs_employee    (employee_id),
  KEY idx_quick_jobs_created_at  (created_at),
  KEY idx_quick_jobs_deleted     (deleted_at),
  CONSTRAINT chk_quick_jobs_price CHECK (price >= 0),
  CONSTRAINT fk_quick_jobs_employee
    FOREIGN KEY (employee_id) REFERENCES employees(id),
  CONSTRAINT fk_quick_jobs_created_by
    FOREIGN KEY (created_by) REFERENCES users(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  COMMENT='Trabajos sueltos sin orden completa — precio se abona 100% al empleado';
