-- ============================================================
-- SGTM — Plataforma SaaS / control plane
-- Motor: MySQL 8.0+
--
-- Esta base NO contiene clientes, motos ni órdenes de trabajo.
-- Su función es registrar talleres, cuentas propietarias,
-- suscripciones y el estado de aprovisionamiento de cada tenant.
--
-- IMPORTANTE: ejecutar en una base separada de `engines_jds`.
-- ============================================================

CREATE DATABASE IF NOT EXISTS engines_platform
  CHARACTER SET utf8mb4
  COLLATE utf8mb4_unicode_ci;

USE engines_platform;

CREATE TABLE IF NOT EXISTS tenants (
  id              BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  slug            VARCHAR(80)     NOT NULL,
  business_name   VARCHAR(150)    NOT NULL,
  owner_name      VARCHAR(120)    NOT NULL,
  database_name   VARCHAR(64)     NOT NULL,
  status          ENUM(
                    'PROVISIONING',
                    'TRIALING',
                    'ACTIVE',
                    'PAST_DUE',
                    'SUSPENDED',
                    'CANCELLED',
                    'FAILED'
                  ) NOT NULL DEFAULT 'PROVISIONING',
  plan_code       VARCHAR(50)     NOT NULL DEFAULT 'trial',
  trial_ends_at   DATETIME        NULL,
  created_at      TIMESTAMP       NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at      TIMESTAMP       NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uq_tenants_slug (slug),
  UNIQUE KEY uq_tenants_database_name (database_name),
  KEY idx_tenants_status (status)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  COMMENT='Talleres registrados en la plataforma';

CREATE TABLE IF NOT EXISTS platform_accounts (
  id              BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  tenant_id       BIGINT UNSIGNED NOT NULL,
  username        VARCHAR(60)     NOT NULL,
  email           VARCHAR(120)    NOT NULL,
  password_hash   VARCHAR(255)    NOT NULL,
  role            VARCHAR(50)     NOT NULL DEFAULT 'Administrador',
  status          ENUM('Activo', 'Inactivo') NOT NULL DEFAULT 'Activo',
  created_at      TIMESTAMP       NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at      TIMESTAMP       NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uq_platform_accounts_email (email),
  UNIQUE KEY uq_platform_accounts_tenant_username (tenant_id, username),
  KEY idx_platform_accounts_tenant (tenant_id),
  CONSTRAINT fk_platform_accounts_tenant
    FOREIGN KEY (tenant_id) REFERENCES tenants(id)
    ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  COMMENT='Identidad central para resolver el taller durante el login';

CREATE TABLE IF NOT EXISTS subscriptions (
  id                       BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  tenant_id                BIGINT UNSIGNED NOT NULL,
  plan_code                VARCHAR(50)     NOT NULL DEFAULT 'trial',
  status                   ENUM(
                             'TRIALING',
                             'ACTIVE',
                             'PAST_DUE',
                             'CANCELLED',
                             'SUSPENDED'
                           ) NOT NULL DEFAULT 'TRIALING',
  provider                 VARCHAR(40)     NULL,
  provider_customer_id     VARCHAR(150)    NULL,
  provider_subscription_id VARCHAR(150)    NULL,
  current_period_start    DATETIME        NULL,
  current_period_end      DATETIME        NULL,
  cancelled_at             DATETIME        NULL,
  created_at               TIMESTAMP       NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at               TIMESTAMP       NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uq_subscriptions_tenant (tenant_id),
  UNIQUE KEY uq_subscriptions_provider_subscription (provider_subscription_id),
  KEY idx_subscriptions_status (status),
  CONSTRAINT fk_subscriptions_tenant
    FOREIGN KEY (tenant_id) REFERENCES tenants(id)
    ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  COMMENT='Estado comercial y de acceso de cada taller';

CREATE TABLE IF NOT EXISTS provisioning_jobs (
  id              BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  tenant_id       BIGINT UNSIGNED NOT NULL,
  status          ENUM('PENDING', 'RUNNING', 'COMPLETED', 'FAILED') NOT NULL DEFAULT 'PENDING',
  attempt_count   SMALLINT UNSIGNED NOT NULL DEFAULT 0,
  error_message   TEXT            NULL,
  started_at      DATETIME        NULL,
  finished_at     DATETIME        NULL,
  created_at      TIMESTAMP       NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at      TIMESTAMP       NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY idx_provisioning_jobs_tenant (tenant_id),
  KEY idx_provisioning_jobs_status (status),
  CONSTRAINT fk_provisioning_jobs_tenant
    FOREIGN KEY (tenant_id) REFERENCES tenants(id)
    ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  COMMENT='Trazabilidad de creación y preparación de bases por taller';
