-- ============================================================
-- ENGINES JDS — Datos iniciales (seed)
-- Requiere: 01_schema.sql, 02_views.sql ejecutados previamente
-- ADVERTENCIA: Solo para entorno de desarrollo
-- ============================================================

USE engines_jds;

SET FOREIGN_KEY_CHECKS = 0;

-- ────────────────────────────────────────────────────────────
-- 1. Roles del sistema
-- ────────────────────────────────────────────────────────────
INSERT INTO roles (id, name, description) VALUES
  (1, 'Administrador',  'Acceso completo al panel'),
  (2, 'Técnico',        'Gestión de órdenes y servicios asignados'),
  (3, 'Recepcionista',  'Clientes, citas y registro de órdenes');

-- ────────────────────────────────────────────────────────────
-- 2. Usuario administrador por defecto
-- Contraseña: Admin2024! → bcrypt hash generado con saltRounds=12
-- CAMBIAR EN PRODUCCIÓN
-- ────────────────────────────────────────────────────────────
INSERT INTO users (id, role_id, username, email, password_hash, status) VALUES
  (1, 1, 'admin',        'admin@enginesjds.co',         '$2a$12$AB.ktkz05CzFPEXCI3E9dOIdrOt520itCPoZ/51Rry0GH5CGS3hdO', 'Activo'),
  (2, 3, 'recepcion',    'recepcion@enginesjds.co',     '$2a$12$AB.ktkz05CzFPEXCI3E9dOIdrOt520itCPoZ/51Rry0GH5CGS3hdO', 'Activo'),
  (3, 2, 'tecnico1',     'tecnico1@enginesjds.co',      '$2a$12$AB.ktkz05CzFPEXCI3E9dOIdrOt520itCPoZ/51Rry0GH5CGS3hdO', 'Activo');

-- ────────────────────────────────────────────────────────────
-- 3. Catálogo de servicios estándar
-- ────────────────────────────────────────────────────────────
INSERT INTO service_catalog (id, name, description, category, base_price, estimated_minutes) VALUES
  -- Mantenimiento preventivo
  (1,  'Cambio de aceite y filtro',       'Cambio de aceite de motor y filtro de aceite', 'Mantenimiento', 35000,  30),
  (2,  'Cambio de filtro de aire',        NULL,                                            'Mantenimiento', 15000,  20),
  (3,  'Cambio de bujías',                NULL,                                            'Mantenimiento', 20000,  30),
  (4,  'Revisión de frenos',              'Revisión y ajuste del sistema de frenos',       'Mantenimiento', 25000,  45),
  (5,  'Cambio de pastillas de freno',    NULL,                                            'Mantenimiento', 45000,  60),
  (6,  'Cambio de líquido de frenos',     NULL,                                            'Mantenimiento', 20000,  30),
  (7,  'Limpieza de carburador',          NULL,                                            'Mantenimiento', 40000,  60),
  (8,  'Ajuste de cadena',               NULL,                                            'Mantenimiento', 15000,  15),
  (9,  'Cambio de cadena y piñones',     NULL,                                            'Mantenimiento', 90000, 120),
  (10, 'Alineación y balanceo',           NULL,                                            'Mantenimiento', 50000,  60),
  -- Reparaciones
  (11, 'Reparación de motor',             'Diagnóstico y reparación de motor',             'Reparación',   250000, 480),
  (12, 'Reparación sistema eléctrico',    NULL,                                            'Reparación',    80000, 120),
  (13, 'Reparación de frenos hidráulicos',NULL,                                            'Reparación',    70000,  90),
  (14, 'Cambio de llanta',               'Solo mano de obra (llanta aparte)',             'Reparación',    25000,  30),
  (15, 'Pintura y carrocería',            NULL,                                            'Reparación',   150000, 300),
  -- Diagnóstico
  (16, 'Diagnóstico electrónico',         'Revisión con escáner OBD',                     'Diagnóstico',   50000,  60),
  (17, 'Revisión general',               'Inspección completa del vehículo',              'Diagnóstico',   30000,  45),
  -- Tecnomecánica
  (18, 'Preparación para RTM',            'Adecuación del vehículo para revisión',         'Tecnomecánica', 60000,  90);

-- ────────────────────────────────────────────────────────────
-- 4. Empleados de ejemplo
-- ────────────────────────────────────────────────────────────
INSERT INTO employees (id, user_id, document_type, document, name, last_name, specialty, phone, email, daily_rate, status, hire_date) VALUES
  (1, 3,    'CC', '1001234567', 'Carlos',   'Rodríguez', 'Motor y Transmisión',  '3001234567', 'carlos.r@enginesjds.co', 120000.00, 'Activo',    '2022-03-15'),
  (2, NULL, 'CC', '1007654321', 'Miguel',   'Torres',    'Eléctrico y Frenos',   '3107654321', 'miguel.t@enginesjds.co', 100000.00, 'Activo',    '2023-01-10'),
  (3, NULL, 'CC', '1009876543', 'Sebastián','García',    'General',              '3209876543', NULL,                     90000.00,  'Vacaciones','2021-08-20');

-- ────────────────────────────────────────────────────────────
-- 5. Clientes de ejemplo
-- ────────────────────────────────────────────────────────────
INSERT INTO clients (id, document_type, document, name, last_name, phone, email, address, city, status) VALUES
  (1, 'CC', '80123456', 'Andrés',   'Martínez', '3151234567', 'andres.m@gmail.com',   'Cra 15 #45-20',   'Bogotá',   'Activo'),
  (2, 'CC', '53456789', 'Daniela',  'López',    '3002345678', 'dani.lopez@gmail.com', 'Cll 72 #10-15',   'Bogotá',   'Activo'),
  (3, 'CC', '71234567', 'Roberto',  'Vargas',   '3103456789', NULL,                   'Av 68 #50-30',    'Bogotá',   'Activo'),
  (4, 'CC', '45678901', 'Patricia', 'Suárez',   '3204567890', 'pati.s@hotmail.com',   'Cll 100 #15-25',  'Chía',     'Activo');

-- ────────────────────────────────────────────────────────────
-- 6. Motocicletas de ejemplo
-- ────────────────────────────────────────────────────────────
INSERT INTO motorcycles (id, client_id, plate, brand, model, year, color, engine_cc, status) VALUES
  (1, 1, 'ABC123', 'Honda',    'CB190R',       2021, 'Roja',    190, 'Disponible'),
  (2, 1, 'DEF456', 'Yamaha',   'FZ25',         2020, 'Azul',    249, 'Disponible'),
  (3, 2, 'GHI789', 'Suzuki',   'GN125',        2019, 'Negra',   125, 'En servicio'),
  (4, 3, 'JKL012', 'KTM',      'Duke 200',     2022, 'Naranja', 200, 'Lista para entrega'),
  (5, 4, 'MNO345', 'Honda',    'CBR300R',      2023, 'Roja',    300, 'Disponible');

-- ────────────────────────────────────────────────────────────
-- 7. Inventario inicial
-- ────────────────────────────────────────────────────────────
INSERT INTO inventory (id, code, name, brand, category, description, unit, quantity, min_stock, unit_price, sale_price, supplier, sold_count) VALUES
  (1,  'ACE-001', 'Aceite Motor 4T SAE 10W-40 1L',  'Castrol',  'Aceites',       NULL,                                'litro',  24,  5,  18000, 24000, 'Distribuidora Lubricantes SA', 48),
  (2,  'FRE-001', 'Pastillas de freno trasero Honda', 'EBC',      'Frenos',        'Compatible CB190R/CGL125',           'par',    8,   3,  28000, 42000, 'MotoRepuestos del Norte',     31),
  (3,  'ELE-001', 'Bujía NGK CR8E',                  'NGK',      'Eléctricos',    'Estándar para 125-250cc',           'unidad', 15,  5,   5500,  9000, 'ElectroMoto Colombia',        22),
  (4,  'FIL-001', 'Filtro de aire Honda CB190R',      'Honda',    'Filtros',       NULL,                                'unidad', 6,   3,  15000, 22000, 'Honda Distribuciones',        15),
  (5,  'FIL-002', 'Filtro de aceite Yamaha FZ25',     'Yamaha',   'Filtros',       NULL,                                'unidad', 4,   3,  12000, 18000, 'Yamaha Parts',                10),
  (6,  'LLA-001', 'Llanta delantera 90/80-17',        'Pirelli',  'Llantas',       NULL,                                'unidad', 3,   2, 120000,185000, 'Importadora de Llantas',       8),
  (7,  'TRA-001', 'Kit cadena y piñones 520',         'DID',      'Transmisión',   'Kit completo 110 eslabones',         'kit',    5,   2,  85000,140000, 'Cadenas y Piñones SAS',       12),
  (8,  'ACE-002', 'Aceite horquilla SAE 10 500ml',   'Motul',    'Aceites',       NULL,                                'frasco', 10,  3,  22000, 35000, 'Distribuidora Lubricantes SA',  5),
  (9,  'ELE-002', 'Regulador de voltaje Honda CGL',   'Genérico', 'Eléctricos',    NULL,                                'unidad', 2,   2,  45000, 70000, 'ElectroMoto Colombia',          3),
  (10, 'ACC-001', 'Manillar deportivo universal',     'ProMoto',  'Accesorios',    'Diámetro 22mm',                     'unidad', 0,   2,  35000, 55000, 'AccesoMotos',                   6);

-- ────────────────────────────────────────────────────────────
-- 8. Citas de ejemplo
-- ────────────────────────────────────────────────────────────
INSERT INTO appointments (id, client_name, client_phone, motorcycle_plate, service_type, requested_date, requested_time, client_id, motorcycle_id, assigned_employee_id, status) VALUES
  (1, 'Andrés Martínez', '3151234567', 'ABC123', 'Cambio de aceite y filtro',  DATE_ADD(CURDATE(), INTERVAL 1 DAY), '09:00:00', 1, 1, 1, 'Confirmada'),
  (2, 'Daniela López',   '3002345678', 'GHI789', 'Revisión de frenos',          DATE_ADD(CURDATE(), INTERVAL 1 DAY), '11:00:00', 2, 3, 2, 'Pendiente'),
  (3, 'Juan Anónimo',    '3009999999', 'XYZ001', 'Diagnóstico general',         DATE_ADD(CURDATE(), INTERVAL 2 DAY), '10:00:00', NULL, NULL, NULL, 'Pendiente');

-- ────────────────────────────────────────────────────────────
-- 9. Orden de trabajo completada (para probar reportes)
-- ────────────────────────────────────────────────────────────
-- Se inserta la orden manualmente con order_number (el trigger actúa solo en INSERT normal)
INSERT INTO orders (id, order_number, motorcycle_id, client_id, assigned_employee_id, status, entry_date, actual_delivery_date, diagnostic_notes, work_notes, labor_cost, parts_cost, discount) VALUES
  (1, 'OT-20260610-001', 3, 2, 1, 'Entregada', '2026-06-10 08:30:00', '2026-06-11 16:00:00',
   'Moto con frenos traseros desgastados y aceite sucio',
   'Se realizó cambio de pastillas traseras y cambio de aceite completo',
   70000.00, 0.00, 5000.00);

-- Servicios de la orden 1
INSERT INTO order_services (order_id, service_catalog_id, employee_id, service_name, quantity, unit_price, status) VALUES
  (1, 1, 1, 'Cambio de aceite y filtro',    1, 35000, 'Completado'),
  (1, 5, 2, 'Cambio de pastillas de freno', 1, 45000, 'Completado');

-- Actualizar labor_cost de la orden 1 con la suma de servicios
UPDATE orders SET labor_cost = 80000 WHERE id = 1;

-- Repuestos usados en orden 1
INSERT INTO order_items (order_id, inventory_id, part_name, quantity, unit_price) VALUES
  (1, 1, 'Aceite Motor 4T SAE 10W-40 1L',   1, 24000),
  (1, 2, 'Pastillas de freno trasero Honda', 1, 42000);

-- El trigger habrá creado la venta cuando status = Entregada.
-- Como aquí hacemos INSERT directo la actualizamos manual:
UPDATE sales SET
  payment_method = 'Efectivo',
  payment_status = 'Pagado',
  parts_subtotal = 66000,
  labor_subtotal = 80000,
  total          = 141000
WHERE order_id = 1;

-- ────────────────────────────────────────────────────────────
-- 10. Tecnomecánica de ejemplo
-- ────────────────────────────────────────────────────────────
INSERT INTO tecnomecanica (motorcycle_id, inspection_date, expiry_date, rtm_number, status) VALUES
  (1, '2025-06-15', DATE_ADD(CURDATE(), INTERVAL 1 DAY), 'RTM-2025-001234', 'Próxima a vencer'),
  (2, '2025-01-10', '2026-01-10',                        'RTM-2025-005678', 'Vigente'),
  (3, '2024-03-22', '2025-03-22',                        'RTM-2024-002345', 'Vencida'),
  (5, '2026-01-05', '2027-01-05',                        'RTM-2026-009012', 'Vigente');

-- ────────────────────────────────────────────────────────────
-- 11. Notificaciones de sistema
-- ────────────────────────────────────────────────────────────
INSERT INTO notifications (type, title, message, entity_type, entity_id, target_user_id) VALUES
  ('stock_alert',           'Stock bajo: Bujía NGK CR8E',            'Quedan 15 unidades, mínimo 5.',                          'inventory',  3, NULL),
  ('tecnomecanica_expiry',  'RTM próxima a vencer: ABC123',          'La RTM de la moto ABC123 vence mañana.',                 'tecnomecanica', 1, 1),
  ('stock_alert',           'Agotado: Manillar deportivo universal', 'Sin stock disponible, reabastecer pronto.',             'inventory', 10, NULL),
  ('order_ready',           'Moto lista: GHI789 (OT-20260610-001)',  'La orden OT-20260610-001 está lista para entrega.',      'orders',     1, 2);

SET FOREIGN_KEY_CHECKS = 1;

-- ============================================================
-- Verificación rápida del seed
-- ============================================================
SELECT 'roles'           AS tabla, COUNT(*) AS registros FROM roles
UNION ALL SELECT 'users',           COUNT(*) FROM users
UNION ALL SELECT 'employees',       COUNT(*) FROM employees
UNION ALL SELECT 'service_catalog', COUNT(*) FROM service_catalog
UNION ALL SELECT 'clients',         COUNT(*) FROM clients
UNION ALL SELECT 'motorcycles',     COUNT(*) FROM motorcycles
UNION ALL SELECT 'inventory',       COUNT(*) FROM inventory
UNION ALL SELECT 'appointments',    COUNT(*) FROM appointments
UNION ALL SELECT 'orders',          COUNT(*) FROM orders
UNION ALL SELECT 'order_services',  COUNT(*) FROM order_services
UNION ALL SELECT 'order_items',     COUNT(*) FROM order_items
UNION ALL SELECT 'sales',           COUNT(*) FROM sales
UNION ALL SELECT 'tecnomecanica',   COUNT(*) FROM tecnomecanica
UNION ALL SELECT 'notifications',   COUNT(*) FROM notifications;
