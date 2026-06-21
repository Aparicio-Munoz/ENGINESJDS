-- ============================================================
-- ENGINES JDS — Schema de base de datos
-- Motor:   MySQL 8.0+
-- Charset: utf8mb4 / utf8mb4_unicode_ci
-- ============================================================

CREATE DATABASE IF NOT EXISTS engines_jds
  CHARACTER SET utf8mb4
  COLLATE utf8mb4_unicode_ci;

USE engines_jds;

SET FOREIGN_KEY_CHECKS = 0;
SET sql_mode = 'STRICT_TRANS_TABLES,NO_ZERO_IN_DATE,ERROR_FOR_DIVISION_BY_ZERO,NO_ENGINE_SUBSTITUTION';

-- ────────────────────────────────────────────────────────────
-- 1. ROLES
-- ────────────────────────────────────────────────────────────
CREATE TABLE roles (
  id          INT UNSIGNED  NOT NULL AUTO_INCREMENT,
  name        VARCHAR(50)   NOT NULL,
  description VARCHAR(200)  NULL,
  created_at  TIMESTAMP     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uq_roles_name (name)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  COMMENT='Roles de acceso al panel administrativo';

-- ────────────────────────────────────────────────────────────
-- 2. USERS
-- Relación: roles 1:N users
-- ────────────────────────────────────────────────────────────
CREATE TABLE users (
  id            INT UNSIGNED  NOT NULL AUTO_INCREMENT,
  role_id       INT UNSIGNED  NOT NULL,
  username      VARCHAR(60)   NOT NULL,
  email         VARCHAR(120)  NOT NULL,
  password_hash VARCHAR(255)  NOT NULL,
  status        ENUM('Activo','Inactivo') NOT NULL DEFAULT 'Activo',
  last_login    DATETIME      NULL,
  created_at    TIMESTAMP     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at    TIMESTAMP     NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uq_users_email    (email),
  UNIQUE KEY uq_users_username (username),
  KEY idx_users_role   (role_id),
  KEY idx_users_status (status),
  CONSTRAINT fk_users_role FOREIGN KEY (role_id) REFERENCES roles(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  COMMENT='Cuentas de acceso al sistema';

-- ────────────────────────────────────────────────────────────
-- 3. CLIENTS
-- Soft delete via deleted_at
-- ────────────────────────────────────────────────────────────
CREATE TABLE clients (
  id            INT UNSIGNED  NOT NULL AUTO_INCREMENT,
  document_type ENUM('CC','CE','NIT','Pasaporte') NOT NULL DEFAULT 'CC',
  document      VARCHAR(20)   NOT NULL,
  name          VARCHAR(100)  NOT NULL,
  last_name     VARCHAR(100)  NOT NULL,
  phone         VARCHAR(20)   NOT NULL,
  email         VARCHAR(120)  NULL,
  address       VARCHAR(200)  NULL,
  city          VARCHAR(80)   NULL DEFAULT 'Bogotá',
  status        ENUM('Activo','Inactivo') NOT NULL DEFAULT 'Activo',
  notes         TEXT          NULL,
  created_at    TIMESTAMP     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at    TIMESTAMP     NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  deleted_at    DATETIME      NULL,
  PRIMARY KEY (id),
  UNIQUE KEY uq_clients_document (document),
  KEY idx_clients_fullname (name, last_name),
  KEY idx_clients_phone    (phone),
  KEY idx_clients_email    (email),
  KEY idx_clients_status   (status),
  KEY idx_clients_deleted  (deleted_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  COMMENT='Clientes del taller';

-- ────────────────────────────────────────────────────────────
-- 4. EMPLOYEES
-- Relación: users 0..1:1 employees (un empleado puede tener cuenta)
-- Soft delete via deleted_at
-- ────────────────────────────────────────────────────────────
CREATE TABLE employees (
  id            INT UNSIGNED    NOT NULL AUTO_INCREMENT,
  user_id       INT UNSIGNED    NULL COMMENT 'Cuenta de sistema (opcional)',
  document_type ENUM('CC','CE','Pasaporte') NOT NULL DEFAULT 'CC',
  document      VARCHAR(20)     NOT NULL,
  name          VARCHAR(100)    NOT NULL,
  last_name     VARCHAR(100)    NOT NULL,
  specialty     VARCHAR(80)     NOT NULL COMMENT 'Motor, Eléctrico, Frenos, General…',
  phone         VARCHAR(20)     NOT NULL,
  email         VARCHAR(120)    NULL,
  daily_rate    DECIMAL(10,2)   NOT NULL DEFAULT 0.00 COMMENT 'Salario diario en COP',
  status        ENUM('Activo','Inactivo','Vacaciones') NOT NULL DEFAULT 'Activo',
  hire_date     DATE            NOT NULL,
  notes         TEXT            NULL,
  created_at    TIMESTAMP       NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at    TIMESTAMP       NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  deleted_at    DATETIME        NULL,
  PRIMARY KEY (id),
  UNIQUE KEY uq_employees_document (document),
  KEY idx_employees_status  (status),
  KEY idx_employees_deleted (deleted_at),
  KEY idx_employees_user    (user_id),
  CONSTRAINT fk_employees_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  COMMENT='Personal del taller con tasa diaria para cálculo de ganancias';

-- ────────────────────────────────────────────────────────────
-- 5. SERVICE_CATALOG
-- Catálogo de servicios estándar del taller
-- ────────────────────────────────────────────────────────────
CREATE TABLE service_catalog (
  id                 INT UNSIGNED  NOT NULL AUTO_INCREMENT,
  name               VARCHAR(120)  NOT NULL,
  description        TEXT          NULL,
  category           VARCHAR(60)   NOT NULL COMMENT 'Mantenimiento, Reparación, Diagnóstico…',
  base_price         DECIMAL(10,2) NOT NULL DEFAULT 0.00,
  estimated_minutes  SMALLINT UNSIGNED NOT NULL DEFAULT 60,
  is_active          TINYINT(1)    NOT NULL DEFAULT 1,
  created_at         TIMESTAMP     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at         TIMESTAMP     NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY idx_catalog_category (category),
  KEY idx_catalog_active   (is_active)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  COMMENT='Catálogo de servicios ofrecidos por el taller';

-- ────────────────────────────────────────────────────────────
-- 6. MOTORCYCLES
-- Relación: clients 1:N motorcycles
-- Soft delete via deleted_at
-- ────────────────────────────────────────────────────────────
CREATE TABLE motorcycles (
  id          INT UNSIGNED    NOT NULL AUTO_INCREMENT,
  client_id   INT UNSIGNED    NOT NULL,
  plate       VARCHAR(10)     NOT NULL COMMENT 'Placa colombiana: ABC123 o ABC12D',
  brand       VARCHAR(60)     NOT NULL,
  model       VARCHAR(80)     NOT NULL,
  year        SMALLINT UNSIGNED NOT NULL,
  color       VARCHAR(40)     NULL,
  engine_cc   SMALLINT UNSIGNED NULL COMMENT 'Cilindrada en cc',
  vin         VARCHAR(17)     NULL COMMENT 'Número de chasis VIN (17 caracteres)',
  status      ENUM('En servicio','Disponible','Lista para entrega') NOT NULL DEFAULT 'Disponible',
  notes       TEXT            NULL,
  created_at  TIMESTAMP       NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at  TIMESTAMP       NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  deleted_at  DATETIME        NULL,
  PRIMARY KEY (id),
  UNIQUE KEY uq_motorcycles_plate (plate),
  UNIQUE KEY uq_motorcycles_vin   (vin),
  KEY idx_motorcycles_client  (client_id),
  KEY idx_motorcycles_status  (status),
  KEY idx_motorcycles_brand   (brand),
  KEY idx_motorcycles_deleted (deleted_at),
  CONSTRAINT fk_motorcycles_client
    FOREIGN KEY (client_id) REFERENCES clients(id),
  CONSTRAINT chk_motorcycles_year
    CHECK (year BETWEEN 1970 AND 2100)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  COMMENT='Motocicletas registradas por cliente';

-- ────────────────────────────────────────────────────────────
-- 7. TECNOMECANICA
-- Relación: motorcycles 1:N tecnomecanica (historial de RTM)
-- ────────────────────────────────────────────────────────────
CREATE TABLE tecnomecanica (
  id              INT UNSIGNED  NOT NULL AUTO_INCREMENT,
  motorcycle_id   INT UNSIGNED  NOT NULL,
  inspection_date DATE          NOT NULL,
  expiry_date     DATE          NOT NULL,
  rtm_number      VARCHAR(30)   NULL COMMENT 'Número de certificado RTM/CDA',
  status          ENUM('Vigente','Próxima a vencer','Vencida') NOT NULL DEFAULT 'Vigente',
  document_url    VARCHAR(500)  NULL,
  notes           TEXT          NULL,
  created_at      TIMESTAMP     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY idx_tecno_motorcycle (motorcycle_id),
  KEY idx_tecno_expiry     (expiry_date),
  KEY idx_tecno_status     (status),
  CONSTRAINT fk_tecno_motorcycle
    FOREIGN KEY (motorcycle_id) REFERENCES motorcycles(id) ON DELETE CASCADE,
  CONSTRAINT chk_tecno_dates
    CHECK (expiry_date > inspection_date)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  COMMENT='Historial de revisión tecnomecánica por motocicleta';

-- ────────────────────────────────────────────────────────────
-- 8. APPOINTMENTS
-- Acepta clientes no registrados (formulario público)
-- order_id FK se añade al final para resolver circular con orders
-- ────────────────────────────────────────────────────────────
CREATE TABLE appointments (
  id                   INT UNSIGNED  NOT NULL AUTO_INCREMENT,
  -- Datos del formulario público (no requieren cuenta)
  client_name          VARCHAR(120)  NOT NULL,
  client_phone         VARCHAR(20)   NOT NULL,
  client_email         VARCHAR(120)  NULL,
  motorcycle_plate     VARCHAR(10)   NOT NULL,
  service_type         VARCHAR(120)  NOT NULL,
  requested_date       DATE          NOT NULL,
  requested_time       TIME          NOT NULL,
  notes                TEXT          NULL,
  -- Vínculos al sistema (NULL si el cliente no está registrado)
  client_id            INT UNSIGNED  NULL,
  motorcycle_id        INT UNSIGNED  NULL,
  assigned_employee_id INT UNSIGNED  NULL,
  -- Orden generada desde esta cita (FK circular → se añade al final)
  order_id             INT UNSIGNED  NULL,
  -- Control
  status               ENUM('Pendiente','Confirmada','Atendida','Cancelada','Reprogramada')
                       NOT NULL DEFAULT 'Pendiente',
  created_at           TIMESTAMP     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at           TIMESTAMP     NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY idx_appt_date       (requested_date),
  KEY idx_appt_status     (status),
  KEY idx_appt_client     (client_id),
  KEY idx_appt_motorcycle (motorcycle_id),
  KEY idx_appt_employee   (assigned_employee_id),
  CONSTRAINT fk_appt_client
    FOREIGN KEY (client_id)           REFERENCES clients(id)     ON DELETE SET NULL,
  CONSTRAINT fk_appt_motorcycle
    FOREIGN KEY (motorcycle_id)       REFERENCES motorcycles(id) ON DELETE SET NULL,
  CONSTRAINT fk_appt_employee
    FOREIGN KEY (assigned_employee_id) REFERENCES employees(id)  ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  COMMENT='Citas del taller — soporta clientes registrados y anónimos';

-- ────────────────────────────────────────────────────────────
-- 9. APPOINTMENT_RESCHEDULES
-- Historial completo de reprogramaciones con motivo
-- ────────────────────────────────────────────────────────────
CREATE TABLE appointment_reschedules (
  id              INT UNSIGNED  NOT NULL AUTO_INCREMENT,
  appointment_id  INT UNSIGNED  NOT NULL,
  original_date   DATE          NOT NULL,
  original_time   TIME          NOT NULL,
  new_date        DATE          NOT NULL,
  new_time        TIME          NOT NULL,
  reason          TEXT          NOT NULL,
  notes           TEXT          NULL,
  rescheduled_by  INT UNSIGNED  NULL,
  created_at      TIMESTAMP     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY idx_reschedule_appt (appointment_id),
  KEY idx_reschedule_date (created_at),
  CONSTRAINT fk_reschedule_appt
    FOREIGN KEY (appointment_id) REFERENCES appointments(id) ON DELETE CASCADE,
  CONSTRAINT fk_reschedule_user
    FOREIGN KEY (rescheduled_by) REFERENCES users(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  COMMENT='Historial de reprogramaciones con motivo de cada cambio';

-- ────────────────────────────────────────────────────────────
-- 10. ORDERS (Órdenes de trabajo)
-- Relaciones:
--   motorcycles 1:N orders
--   clients     1:N orders
--   employees   1:N orders (técnico asignado)
--   appointments 0..1:N orders
-- ────────────────────────────────────────────────────────────
CREATE TABLE orders (
  id                       INT UNSIGNED    NOT NULL AUTO_INCREMENT,
  order_number             VARCHAR(20)     NOT NULL COMMENT 'OT-YYYYMMDD-NNN (generado por trigger)',
  motorcycle_id            INT UNSIGNED    NOT NULL,
  client_id                INT UNSIGNED    NOT NULL,
  appointment_id           INT UNSIGNED    NULL,
  assigned_employee_id     INT UNSIGNED    NULL,
  status                   ENUM('Pendiente','En proceso','Listo','Entregada')
                           NOT NULL DEFAULT 'Pendiente',
  entry_date               DATETIME        NOT NULL DEFAULT CURRENT_TIMESTAMP,
  estimated_delivery_date  DATE            NULL,
  actual_delivery_date     DATETIME        NULL,
  diagnostic_notes         TEXT            NULL,
  work_notes               TEXT            NULL,
  labor_cost               DECIMAL(10,2)   NOT NULL DEFAULT 0.00,
  parts_cost               DECIMAL(10,2)   NOT NULL DEFAULT 0.00 COMMENT 'Actualizado por trigger en order_items',
  discount                 DECIMAL(10,2)   NOT NULL DEFAULT 0.00,
  -- Columnas calculadas
  subtotal     DECIMAL(10,2) GENERATED ALWAYS AS (labor_cost + parts_cost) STORED,
  final_price  DECIMAL(10,2) GENERATED ALWAYS AS (labor_cost + parts_cost - discount) STORED,
  -- Auditoría
  created_by   INT UNSIGNED  NULL,
  created_at   TIMESTAMP     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at   TIMESTAMP     NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uq_orders_number       (order_number),
  KEY idx_orders_motorcycle         (motorcycle_id),
  KEY idx_orders_client             (client_id),
  KEY idx_orders_employee           (assigned_employee_id),
  KEY idx_orders_appointment        (appointment_id),
  KEY idx_orders_status             (status),
  KEY idx_orders_entry_date         (entry_date),
  KEY idx_orders_delivery_date      (actual_delivery_date),
  KEY idx_orders_status_entry       (status, entry_date),
  CONSTRAINT fk_orders_motorcycle
    FOREIGN KEY (motorcycle_id)       REFERENCES motorcycles(id),
  CONSTRAINT fk_orders_client
    FOREIGN KEY (client_id)           REFERENCES clients(id),
  CONSTRAINT fk_orders_appointment
    FOREIGN KEY (appointment_id)      REFERENCES appointments(id) ON DELETE SET NULL,
  CONSTRAINT fk_orders_employee
    FOREIGN KEY (assigned_employee_id) REFERENCES employees(id)  ON DELETE SET NULL,
  CONSTRAINT fk_orders_creator
    FOREIGN KEY (created_by)          REFERENCES users(id)       ON DELETE SET NULL,
  CONSTRAINT chk_orders_discount
    CHECK (discount >= 0 AND discount <= (labor_cost + parts_cost))
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  COMMENT='Órdenes de trabajo — entidad central del sistema';

-- ────────────────────────────────────────────────────────────
-- 11. ORDER_SERVICES (Servicios ejecutados en una orden)
-- Relación N:M: orders ↔ service_catalog
-- Cada servicio puede ser ejecutado por un empleado distinto
-- ────────────────────────────────────────────────────────────
CREATE TABLE order_services (
  id                  INT UNSIGNED    NOT NULL AUTO_INCREMENT,
  order_id            INT UNSIGNED    NOT NULL,
  service_catalog_id  INT UNSIGNED    NULL COMMENT 'NULL si es servicio personalizado',
  employee_id         INT UNSIGNED    NULL COMMENT 'Técnico que ejecutó este servicio',
  service_name        VARCHAR(120)    NOT NULL COMMENT 'Snapshot del nombre al momento de crear',
  description         TEXT            NULL,
  quantity            TINYINT UNSIGNED NOT NULL DEFAULT 1,
  unit_price          DECIMAL(10,2)   NOT NULL DEFAULT 0.00,
  total_price         DECIMAL(10,2)   GENERATED ALWAYS AS (quantity * unit_price) STORED,
  status              ENUM('Pendiente','En proceso','Completado') NOT NULL DEFAULT 'Pendiente',
  notes               TEXT            NULL,
  created_at          TIMESTAMP       NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY idx_osvc_order    (order_id),
  KEY idx_osvc_catalog  (service_catalog_id),
  KEY idx_osvc_employee (employee_id),
  CONSTRAINT fk_osvc_order
    FOREIGN KEY (order_id)           REFERENCES orders(id)          ON DELETE CASCADE,
  CONSTRAINT fk_osvc_catalog
    FOREIGN KEY (service_catalog_id) REFERENCES service_catalog(id) ON DELETE SET NULL,
  CONSTRAINT fk_osvc_employee
    FOREIGN KEY (employee_id)        REFERENCES employees(id)       ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  COMMENT='Servicios realizados por orden de trabajo (N:M con snapshot de precio)';

-- ────────────────────────────────────────────────────────────
-- 12. INVENTORY (Repuestos y materiales)
-- status es GENERATED desde quantity vs min_stock
-- ────────────────────────────────────────────────────────────
CREATE TABLE inventory (
  id          INT UNSIGNED    NOT NULL AUTO_INCREMENT,
  code        VARCHAR(20)     NOT NULL,
  name        VARCHAR(120)    NOT NULL,
  brand       VARCHAR(60)     NOT NULL,
  category    ENUM('Aceites','Filtros','Llantas','Frenos','Transmisión','Eléctricos','Accesorios')
              NOT NULL,
  description TEXT            NULL,
  unit        VARCHAR(20)     NOT NULL DEFAULT 'unidad',
  quantity    INT UNSIGNED    NOT NULL DEFAULT 0,
  min_stock   SMALLINT UNSIGNED NOT NULL DEFAULT 5 COMMENT 'Umbral de alerta de stock bajo',
  unit_price  DECIMAL(10,2)   NOT NULL DEFAULT 0.00 COMMENT 'Precio de compra (costo)',
  sale_price  DECIMAL(10,2)   NOT NULL DEFAULT 0.00 COMMENT 'Precio de venta al cliente',
  supplier    VARCHAR(120)    NULL,
  image_url   VARCHAR(500)    NULL,
  sold_count  INT UNSIGNED    NOT NULL DEFAULT 0 COMMENT 'Contador acumulado de unidades vendidas',
  -- Estado calculado automáticamente
  status      VARCHAR(12)     GENERATED ALWAYS AS (
                IF(quantity = 0, 'Agotado',
                   IF(quantity <= min_stock, 'Stock bajo', 'Disponible'))
              ) STORED,
  created_at  TIMESTAMP       NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at  TIMESTAMP       NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uq_inventory_code (code),
  KEY idx_inventory_category (category),
  KEY idx_inventory_brand    (brand),
  KEY idx_inventory_status   (status),
  KEY idx_inventory_quantity (quantity),
  CONSTRAINT chk_inventory_prices
    CHECK (sale_price >= unit_price)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  COMMENT='Inventario de repuestos — status derivado automáticamente del stock';

-- ────────────────────────────────────────────────────────────
-- 13. ORDER_ITEMS (Repuestos consumidos en una orden)
-- Relación N:M: orders ↔ inventory
-- Snapshot de nombre y precio al momento de uso (integridad histórica)
-- ────────────────────────────────────────────────────────────
CREATE TABLE order_items (
  id            INT UNSIGNED    NOT NULL AUTO_INCREMENT,
  order_id      INT UNSIGNED    NOT NULL,
  inventory_id  INT UNSIGNED    NOT NULL,
  part_name     VARCHAR(120)    NOT NULL COMMENT 'Snapshot del nombre al momento de uso',
  quantity      SMALLINT UNSIGNED NOT NULL DEFAULT 1,
  unit_price    DECIMAL(10,2)   NOT NULL COMMENT 'Precio al momento de uso (snapshot)',
  total_price   DECIMAL(10,2)   GENERATED ALWAYS AS (quantity * unit_price) STORED,
  created_at    TIMESTAMP       NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY idx_oit_order     (order_id),
  KEY idx_oit_inventory (inventory_id),
  CONSTRAINT fk_oit_order
    FOREIGN KEY (order_id)     REFERENCES orders(id)     ON DELETE CASCADE,
  CONSTRAINT fk_oit_inventory
    FOREIGN KEY (inventory_id) REFERENCES inventory(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  COMMENT='Repuestos consumidos por orden — con snapshot de precio para integridad histórica';

-- ────────────────────────────────────────────────────────────
-- 14. INVENTORY_MOVEMENTS
-- Trazabilidad de cada movimiento de stock
-- ────────────────────────────────────────────────────────────
CREATE TABLE inventory_movements (
  id              INT UNSIGNED  NOT NULL AUTO_INCREMENT,
  inventory_id    INT UNSIGNED  NOT NULL,
  movement_type   ENUM('Entrada','Salida','Ajuste','Devolución') NOT NULL,
  quantity        INT           NOT NULL COMMENT 'Positivo=entrada, Negativo=salida/ajuste',
  quantity_before INT UNSIGNED  NOT NULL,
  quantity_after  INT UNSIGNED  NOT NULL,
  reference_type  VARCHAR(20)   NULL COMMENT 'order | purchase | adjustment | return',
  reference_id    INT UNSIGNED  NULL,
  notes           TEXT          NULL,
  created_by      INT UNSIGNED  NULL,
  created_at      TIMESTAMP     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY idx_invmov_inventory (inventory_id),
  KEY idx_invmov_type      (movement_type),
  KEY idx_invmov_date      (created_at),
  KEY idx_invmov_ref       (reference_type, reference_id),
  CONSTRAINT fk_invmov_inventory
    FOREIGN KEY (inventory_id) REFERENCES inventory(id),
  CONSTRAINT fk_invmov_user
    FOREIGN KEY (created_by)   REFERENCES users(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  COMMENT='Todos los movimientos de stock con trazabilidad completa';

-- ────────────────────────────────────────────────────────────
-- 15. ORDER_STATUS_HISTORY
-- Historial de cambios de estado de cada orden
-- ────────────────────────────────────────────────────────────
CREATE TABLE order_status_history (
  id               INT UNSIGNED  NOT NULL AUTO_INCREMENT,
  order_id         INT UNSIGNED  NOT NULL,
  previous_status  VARCHAR(30)   NULL COMMENT 'NULL en la primera inserción',
  new_status       VARCHAR(30)   NOT NULL,
  notes            TEXT          NULL,
  changed_by       INT UNSIGNED  NULL,
  created_at       TIMESTAMP     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY idx_osh_order (order_id),
  KEY idx_osh_date  (created_at),
  CONSTRAINT fk_osh_order
    FOREIGN KEY (order_id)   REFERENCES orders(id) ON DELETE CASCADE,
  CONSTRAINT fk_osh_user
    FOREIGN KEY (changed_by) REFERENCES users(id)  ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  COMMENT='Auditoría de cada cambio de estado en las órdenes de trabajo';

-- ────────────────────────────────────────────────────────────
-- 16. SALES (Registro financiero de ventas)
-- Relación 1:1 con orders — se crea cuando la orden se marca Entregada
-- ────────────────────────────────────────────────────────────
CREATE TABLE sales (
  id              INT UNSIGNED  NOT NULL AUTO_INCREMENT,
  order_id        INT UNSIGNED  NOT NULL,
  sale_date       DATETIME      NOT NULL DEFAULT CURRENT_TIMESTAMP,
  parts_subtotal  DECIMAL(10,2) NOT NULL DEFAULT 0.00,
  labor_subtotal  DECIMAL(10,2) NOT NULL DEFAULT 0.00,
  discount        DECIMAL(10,2) NOT NULL DEFAULT 0.00,
  total           DECIMAL(10,2) NOT NULL DEFAULT 0.00,
  payment_method  ENUM('Efectivo','Transferencia','Tarjeta','Nequi','Daviplata','Otro')
                  NOT NULL DEFAULT 'Efectivo',
  payment_status  ENUM('Pagado','Pendiente','Parcial') NOT NULL DEFAULT 'Pendiente',
  notes           TEXT          NULL,
  created_by      INT UNSIGNED  NULL,
  created_at      TIMESTAMP     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uq_sales_order        (order_id),
  KEY idx_sales_date               (sale_date),
  KEY idx_sales_payment_status     (payment_status),
  KEY idx_sales_date_payment       (sale_date, payment_status),
  CONSTRAINT fk_sales_order
    FOREIGN KEY (order_id)   REFERENCES orders(id),
  CONSTRAINT fk_sales_creator
    FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  COMMENT='Registro financiero de ventas completadas — soporte para reportes';

-- ────────────────────────────────────────────────────────────
-- 17. DELETION_LOGS
-- Trazabilidad universal de eliminaciones con motivo obligatorio
-- ────────────────────────────────────────────────────────────
CREATE TABLE deletion_logs (
  id            INT UNSIGNED  NOT NULL AUTO_INCREMENT,
  entity_type   VARCHAR(40)   NOT NULL COMMENT 'clients | motorcycles | orders | employees | appointments | inventory',
  entity_id     INT UNSIGNED  NOT NULL,
  entity_label  VARCHAR(200)  NOT NULL COMMENT 'Nombre o código del elemento eliminado',
  entity_data   JSON          NOT NULL COMMENT 'Snapshot completo del registro antes de eliminar',
  reason        TEXT          NOT NULL COMMENT 'Motivo obligatorio de la eliminación',
  deleted_by    INT UNSIGNED  NULL,
  created_at    TIMESTAMP     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY idx_dellog_entity (entity_type, entity_id),
  KEY idx_dellog_date   (created_at),
  CONSTRAINT fk_dellog_user
    FOREIGN KEY (deleted_by) REFERENCES users(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  COMMENT='Auditoría de eliminaciones — motivo obligatorio para trazabilidad';

-- ────────────────────────────────────────────────────────────
-- 18. NOTIFICATIONS
-- Alertas del sistema: stock bajo, citas, RTM, órdenes listas
-- ────────────────────────────────────────────────────────────
CREATE TABLE notifications (
  id              INT UNSIGNED  NOT NULL AUTO_INCREMENT,
  type            ENUM(
                    'stock_alert',
                    'appointment_reminder',
                    'order_ready',
                    'tecnomecanica_expiry',
                    'general'
                  ) NOT NULL,
  title           VARCHAR(120)  NOT NULL,
  message         TEXT          NOT NULL,
  entity_type     VARCHAR(40)   NULL,
  entity_id       INT UNSIGNED  NULL,
  target_user_id  INT UNSIGNED  NULL COMMENT 'NULL = broadcast a todos los usuarios',
  is_read         TINYINT(1)    NOT NULL DEFAULT 0,
  read_at         DATETIME      NULL,
  created_at      TIMESTAMP     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY idx_notif_user   (target_user_id),
  KEY idx_notif_type   (type),
  KEY idx_notif_read   (is_read),
  KEY idx_notif_date   (created_at),
  KEY idx_notif_entity (entity_type, entity_id),
  CONSTRAINT fk_notif_user
    FOREIGN KEY (target_user_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  COMMENT='Notificaciones del sistema con soporte para broadcast y por usuario';

-- ────────────────────────────────────────────────────────────
-- RESOLVER REFERENCIA CIRCULAR: appointments.order_id → orders
-- Se añade la FK después de crear ambas tablas
-- ────────────────────────────────────────────────────────────
ALTER TABLE appointments
  ADD CONSTRAINT fk_appt_order
    FOREIGN KEY (order_id) REFERENCES orders(id) ON DELETE SET NULL;

SET FOREIGN_KEY_CHECKS = 1;

-- ============================================================
-- TRIGGERS
-- ============================================================

DELIMITER //

-- ── Generar order_number automático ────────────────────────
CREATE TRIGGER trg_orders_before_insert
BEFORE INSERT ON orders
FOR EACH ROW
BEGIN
  DECLARE seq INT DEFAULT 1;
  SELECT COALESCE(MAX(
    CAST(SUBSTRING_INDEX(order_number, '-', -1) AS UNSIGNED)
  ), 0) + 1 INTO seq
  FROM orders
  WHERE DATE(entry_date) = DATE(NOW());

  SET NEW.order_number = CONCAT(
    'OT-',
    DATE_FORMAT(NOW(), '%Y%m%d'),
    '-',
    LPAD(seq, 3, '0')
  );
END //

-- ── Registrar historial al crear una orden ─────────────────
CREATE TRIGGER trg_orders_after_insert
AFTER INSERT ON orders
FOR EACH ROW
BEGIN
  INSERT INTO order_status_history (order_id, previous_status, new_status)
  VALUES (NEW.id, NULL, NEW.status);
END //

-- ── Registrar cambios de estado en órdenes ─────────────────
CREATE TRIGGER trg_orders_after_update
AFTER UPDATE ON orders
FOR EACH ROW
BEGIN
  IF OLD.status != NEW.status THEN
    INSERT INTO order_status_history (order_id, previous_status, new_status)
    VALUES (NEW.id, OLD.status, NEW.status);

    -- Crear registro de venta al marcar como Entregada
    IF NEW.status = 'Entregada' AND OLD.status != 'Entregada' THEN
      INSERT INTO sales (
        order_id, sale_date, parts_subtotal, labor_subtotal,
        discount, total, payment_status
      ) VALUES (
        NEW.id,
        NOW(),
        NEW.parts_cost,
        NEW.labor_cost,
        NEW.discount,
        NEW.final_price,
        'Pendiente'
      )
      ON DUPLICATE KEY UPDATE
        sale_date      = NOW(),
        parts_subtotal = NEW.parts_cost,
        labor_subtotal = NEW.labor_cost,
        discount       = NEW.discount,
        total          = NEW.final_price;
    END IF;
  END IF;
END //

-- ── Actualizar parts_cost en orders cuando cambia order_items ─
CREATE TRIGGER trg_order_items_after_insert
AFTER INSERT ON order_items
FOR EACH ROW
BEGIN
  UPDATE orders
  SET parts_cost = (
    SELECT COALESCE(SUM(total_price), 0)
    FROM order_items
    WHERE order_id = NEW.order_id
  )
  WHERE id = NEW.order_id;

  -- Registrar salida de inventario
  INSERT INTO inventory_movements (
    inventory_id, movement_type, quantity,
    quantity_before, quantity_after,
    reference_type, reference_id
  )
  SELECT
    NEW.inventory_id,
    'Salida',
    -NEW.quantity,
    quantity,
    quantity - NEW.quantity,
    'order',
    NEW.order_id
  FROM inventory WHERE id = NEW.inventory_id;

  -- Descontar stock e incrementar sold_count
  UPDATE inventory
  SET
    quantity   = quantity - NEW.quantity,
    sold_count = sold_count + NEW.quantity
  WHERE id = NEW.inventory_id;
END //

CREATE TRIGGER trg_order_items_after_delete
AFTER DELETE ON order_items
FOR EACH ROW
BEGIN
  UPDATE orders
  SET parts_cost = (
    SELECT COALESCE(SUM(total_price), 0)
    FROM order_items
    WHERE order_id = OLD.order_id
  )
  WHERE id = OLD.order_id;

  -- Devolver stock
  UPDATE inventory
  SET
    quantity   = quantity + OLD.quantity,
    sold_count = GREATEST(sold_count - OLD.quantity, 0)
  WHERE id = OLD.inventory_id;

  -- Registrar devolución
  INSERT INTO inventory_movements (
    inventory_id, movement_type, quantity,
    quantity_before, quantity_after,
    reference_type, reference_id, notes
  )
  SELECT
    OLD.inventory_id,
    'Devolución',
    OLD.quantity,
    quantity - OLD.quantity,
    quantity,
    'order',
    OLD.order_id,
    'Repuesto eliminado de la orden'
  FROM inventory WHERE id = OLD.inventory_id;
END //

-- ── Actualizar status de tecnomecánica automáticamente ─────
CREATE TRIGGER trg_tecnomecanica_before_insert
BEFORE INSERT ON tecnomecanica
FOR EACH ROW
BEGIN
  SET NEW.status = CASE
    WHEN NEW.expiry_date < CURDATE()                      THEN 'Vencida'
    WHEN NEW.expiry_date < DATE_ADD(CURDATE(), INTERVAL 30 DAY) THEN 'Próxima a vencer'
    ELSE 'Vigente'
  END;
END //

CREATE TRIGGER trg_tecnomecanica_before_update
BEFORE UPDATE ON tecnomecanica
FOR EACH ROW
BEGIN
  SET NEW.status = CASE
    WHEN NEW.expiry_date < CURDATE()                      THEN 'Vencida'
    WHEN NEW.expiry_date < DATE_ADD(CURDATE(), INTERVAL 30 DAY) THEN 'Próxima a vencer'
    ELSE 'Vigente'
  END;
END //

DELIMITER ;
