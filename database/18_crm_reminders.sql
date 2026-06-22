-- ============================================================
-- ENGINES JDS — Migración: CRM y Recordatorios
-- ============================================================

USE engines_jds;

CREATE TABLE IF NOT EXISTS customer_reminders (
  id              INT UNSIGNED    NOT NULL AUTO_INCREMENT,
  client_id       INT UNSIGNED    NOT NULL,
  motorcycle_id   INT UNSIGNED    NULL,
  type            ENUM('MANTENIMIENTO','SOAT','TECNOMECANICA','CAMBIO_ACEITE','CITA')
                  NOT NULL DEFAULT 'MANTENIMIENTO',
  message         TEXT            NOT NULL,
  scheduled_date  DATE            NOT NULL,
  status          ENUM('PENDIENTE','ENVIADO','CANCELADO') NOT NULL DEFAULT 'PENDIENTE',
  sent_at         DATETIME        NULL,
  created_by      INT UNSIGNED    NULL,
  created_at      TIMESTAMP       NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at      TIMESTAMP       NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY idx_reminders_client    (client_id),
  KEY idx_reminders_moto      (motorcycle_id),
  KEY idx_reminders_status    (status),
  KEY idx_reminders_scheduled (scheduled_date),
  KEY idx_reminders_type      (type),
  CONSTRAINT fk_reminders_client FOREIGN KEY (client_id)     REFERENCES clients(id),
  CONSTRAINT fk_reminders_moto   FOREIGN KEY (motorcycle_id) REFERENCES motorcycles(id) ON DELETE SET NULL,
  CONSTRAINT fk_reminders_user   FOREIGN KEY (created_by)    REFERENCES users(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  COMMENT='Recordatorios automáticos de CRM para clientes';
