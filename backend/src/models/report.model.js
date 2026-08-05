import { getPool } from '../config/database.js'

// ── KPIs del dashboard ────────────────────────────────────────
export async function getSummaryData() {
  const pool = getPool()

  const [
    [activeRows],
    [todayApptRows],
    [lowStockRows],
    [inServiceRows],
    [completedRows],
    [revenueRows],
  ] = await Promise.all([
    // Órdenes activas (no entregadas)
    pool.query(
      `SELECT COUNT(*) AS cnt FROM orders WHERE status != 'Entregada'`
    ),
    // Citas de hoy (vista: Pendiente + Confirmada de hoy)
    pool.query(
      `SELECT COUNT(*) AS cnt FROM v_todays_appointments`
    ),
    // Repuestos con stock bajo o agotados
    pool.query(
      `SELECT COUNT(*) AS cnt FROM v_inventory_alerts`
    ),
    // Motos actualmente en el taller
    pool.query(
      `SELECT COUNT(*) AS cnt
       FROM motorcycles
       WHERE status = 'En servicio' AND deleted_at IS NULL`
    ),
    // Órdenes entregadas hoy
    pool.query(
      `SELECT COUNT(*) AS cnt
       FROM orders
       WHERE status = 'Entregada'
         AND DATE(actual_delivery_date) = CURDATE()`
    ),
    // Ingresos del día (ventas con actual_delivery_date hoy)
    pool.query(
      `SELECT COALESCE(SUM(total_revenue), 0) AS revenue
       FROM v_daily_sales_summary
       WHERE sale_day = CURDATE()`
    ),
  ])

  return {
    activeOrders:         Number(activeRows[0].cnt),
    appointmentsToday:    Number(todayApptRows[0].cnt),
    lowStockItems:        Number(lowStockRows[0].cnt),
    motorcyclesInService: Number(inServiceRows[0].cnt),
    completedToday:       Number(completedRows[0].cnt),
    dailyRevenue:         Number(revenueRows[0].revenue),
  }
}

// ── Ventas por período — usa v_revenue_by_period ──────────────
// period: 'daily' | 'weekly' | 'biweekly' | 'monthly'
export async function getOrdersByPeriod(period = 'monthly') {
  const pool = getPool()

  // Condición WHERE según período
  const periodConditions = {
    daily:     `DATE(sale_date) = CURDATE()`,
    weekly:    `YEARWEEK(sale_date, 1) = YEARWEEK(NOW(), 1)`,
    biweekly:  `year_month = DATE_FORMAT(NOW(), '%Y-%m')
                  AND fortnight = IF(DAY(NOW()) <= 15, 'primera', 'segunda')`,
    monthly:   `year_month = DATE_FORMAT(NOW(), '%Y-%m')`,
  }

  const condition = periodConditions[period] ?? periodConditions.monthly

  const [[summaryRow], [salesRows]] = await Promise.all([
    pool.query(
      `SELECT
         COUNT(*)                            AS total_sales,
         COALESCE(SUM(total), 0)            AS total_revenue,
         COALESCE(SUM(parts_subtotal), 0)   AS parts_revenue,
         COALESCE(SUM(labor_subtotal), 0)   AS labor_revenue,
         COALESCE(SUM(discount), 0)         AS total_discounts,
         COALESCE(SUM(CASE WHEN payment_status = 'Pagado'    THEN total ELSE 0 END), 0) AS collected,
         COALESCE(SUM(CASE WHEN payment_status = 'Pendiente' THEN total ELSE 0 END), 0) AS pending,
         COALESCE(SUM(CASE WHEN payment_status = 'Parcial'   THEN total ELSE 0 END), 0) AS partial
       FROM v_revenue_by_period
       WHERE ${condition}`
    ),
    pool.query(
      `SELECT
         id, order_id, order_number,
         sale_date, total, parts_subtotal, labor_subtotal, discount,
         payment_method, payment_status,
         client_name, motorcycle_plate, motorcycle_info
       FROM v_revenue_by_period
       WHERE ${condition}
       ORDER BY sale_date DESC`
    ),
  ])

  return {
    period,
    summary: {
      totalSales:     Number(summaryRow[0].total_sales),
      totalRevenue:   Number(summaryRow[0].total_revenue),
      partsRevenue:   Number(summaryRow[0].parts_revenue),
      laborRevenue:   Number(summaryRow[0].labor_revenue),
      totalDiscounts: Number(summaryRow[0].total_discounts),
      collected:      Number(summaryRow[0].collected),
      pending:        Number(summaryRow[0].pending),
      partial:        Number(summaryRow[0].partial),
    },
    sales: salesRows,
  }
}

// ── Top 10 repuestos más usados ───────────────────────────────
export async function getTopParts(limit = 10) {
  const [rows] = await getPool().query(
    `SELECT
       oi.part_name,
       i.code       AS part_code,
       i.brand      AS part_brand,
       i.category,
       SUM(oi.quantity)   AS total_sold,
       SUM(oi.total_price) AS total_revenue
     FROM order_items oi
     LEFT JOIN inventory i ON i.id = oi.inventory_id
     GROUP BY oi.inventory_id, oi.part_name, i.code, i.brand, i.category
     ORDER BY total_sold DESC
     LIMIT ?`,
    [Number(limit)]
  )
  return rows
}

// ── Rendimiento de empleados — usa v_employee_performance ─────
export async function getEmployeePerformance() {
  const pool = getPool()

  // Query principal: datos de la vista (totales históricos + últimos 30 días)
  const [[perfRows], [earningsRows]] = await Promise.all([
    pool.query(
      `SELECT
         employee_id, employee_name, specialty,
         daily_rate, employee_status,
         total_orders, completed_orders,
         total_services, services_revenue,
         orders_last_30_days, revenue_last_30_days
       FROM v_employee_performance
       ORDER BY completed_orders DESC`
    ),
    // Ganancias con granularidad diaria / quincenal / mensual
    pool.query(
      `SELECT
         e.id AS employee_id,
         COALESCE(SUM(
           CASE WHEN DATE(o.entry_date) = CURDATE()
           THEN os.total_price END), 0)                         AS daily_earnings,
         COALESCE(SUM(
           CASE WHEN o.entry_date >= DATE_SUB(CURDATE(), INTERVAL 14 DAY)
           THEN os.total_price END), 0)                         AS biweekly_earnings,
         COALESCE(SUM(
           CASE WHEN YEAR(o.entry_date)  = YEAR(CURDATE())
                AND  MONTH(o.entry_date) = MONTH(CURDATE())
           THEN os.total_price END), 0)                         AS monthly_earnings
       FROM employees e
       LEFT JOIN order_services os ON os.employee_id = e.id
       LEFT JOIN orders         o  ON o.id = os.order_id
       WHERE e.deleted_at IS NULL
       GROUP BY e.id`
    ),
  ])

  // Merge earnings into performance rows usando Map
  const earningsMap = new Map(
    earningsRows.map((r) => [r.employee_id, r])
  )

  return perfRows.map((emp) => {
    const earn = earningsMap.get(emp.employee_id) ?? {}
    return {
      ...emp,
      daily_earnings:    Number(earn.daily_earnings    ?? 0),
      biweekly_earnings: Number(earn.biweekly_earnings ?? 0),
      monthly_earnings:  Number(earn.monthly_earnings  ?? 0),
      daily_rate:        Number(emp.daily_rate),
      services_revenue:  Number(emp.services_revenue ?? 0),
      revenue_last_30_days: Number(emp.revenue_last_30_days ?? 0),
    }
  })
}

// ── Tecnomecánica — usa v_tecnomecanica_status ────────────────
export async function getTecnomecanicaStatus() {
  const pool = getPool()

  const [[summaryRows], [itemRows]] = await Promise.all([
    pool.query(
      `SELECT
         rtm_status,
         COUNT(*) AS count
       FROM v_tecnomecanica_status
       GROUP BY rtm_status`
    ),
    pool.query(
      `SELECT
         motorcycle_id, plate, motorcycle_info, owner_name, owner_phone,
         tecno_id, inspection_date, expiry_date, rtm_number,
         rtm_status, days_remaining
       FROM v_tecnomecanica_status
       ORDER BY days_remaining ASC`
    ),
  ])

  // Construir objeto de resumen indexado por estado
  const summary = { Vigente: 0, 'Próxima a vencer': 0, Vencida: 0 }
  for (const row of summaryRows) {
    summary[row.rtm_status] = Number(row.count)
  }

  return { summary, items: itemRows }
}

// ── Dashboard ejecutivo: KPIs extendidos ─────────────────────
export async function getExecutiveKPIs() {
  const pool = getPool()
  const [
    [clientsRow], [motosRow], [activeRow], [deliveredRow],
    [monthRevenueRow], [yearRevenueRow], [pendingApptsRow], [lowStockRow],
    [statusRows],
  ] = await Promise.all([
    pool.query('SELECT COUNT(*) AS cnt FROM clients WHERE deleted_at IS NULL'),
    pool.query('SELECT COUNT(*) AS cnt FROM motorcycles WHERE deleted_at IS NULL'),
    pool.query("SELECT COUNT(*) AS cnt FROM orders WHERE status != 'Entregada'"),
    pool.query("SELECT COUNT(*) AS cnt FROM orders WHERE status = 'Entregada'"),
    pool.query(`SELECT COALESCE(SUM(final_price), 0) AS revenue FROM orders
                WHERE status = 'Entregada' AND YEAR(actual_delivery_date) = YEAR(CURDATE())
                AND MONTH(actual_delivery_date) = MONTH(CURDATE())`),
    pool.query(`SELECT COALESCE(SUM(final_price), 0) AS revenue FROM orders
                WHERE status = 'Entregada' AND YEAR(actual_delivery_date) = YEAR(CURDATE())`),
    pool.query("SELECT COUNT(*) AS cnt FROM appointments WHERE status = 'Pendiente'"),
    pool.query('SELECT COUNT(*) AS cnt FROM inventory WHERE quantity <= min_stock'),
    pool.query(`SELECT status, COUNT(*) AS cnt FROM orders GROUP BY status`),
  ])

  const ordersByStatus = {}
  for (const r of statusRows) ordersByStatus[r.status] = Number(r.cnt)

  return {
    totalClients:     Number(clientsRow[0].cnt),
    totalMotorcycles: Number(motosRow[0].cnt),
    activeOrders:     Number(activeRow[0].cnt),
    deliveredOrders:  Number(deliveredRow[0].cnt),
    monthlyRevenue:   Number(monthRevenueRow[0].revenue),
    yearlyRevenue:    Number(yearRevenueRow[0].revenue),
    pendingAppts:     Number(pendingApptsRow[0].cnt),
    lowStockItems:    Number(lowStockRow[0].cnt),
    ordersByStatus,
  }
}

// ── Dashboard: alertas ───────────────────────────────────────
export async function getDashboardAlerts() {
  const pool = getPool()
  const [[lowStock], [upcomingAppts]] = await Promise.all([
    pool.query(`SELECT id, code, name, brand, quantity, min_stock
                FROM inventory WHERE quantity <= min_stock ORDER BY quantity ASC LIMIT 5`),
    pool.query(`SELECT id, client_name, service_type, requested_date
                FROM appointments WHERE status = 'Pendiente'
                AND requested_date <= DATE_ADD(CURDATE(), INTERVAL 3 DAY)
                ORDER BY requested_date ASC LIMIT 5`),
  ])
  return { lowStock, upcomingAppts }
}

// ── Chart data: ingresos mensuales (últimos 12 meses) ────────
export async function getMonthlyRevenue() {
  const [rows] = await getPool().query(
    `SELECT
       DATE_FORMAT(o.actual_delivery_date, '%Y-%m')    AS month,
       DATE_FORMAT(o.actual_delivery_date, '%b %Y')    AS label,
       COUNT(*)                                         AS orders_count,
       COALESCE(SUM(o.final_price), 0)                 AS revenue
     FROM orders o
     WHERE o.status = 'Entregada'
       AND o.actual_delivery_date >= DATE_SUB(CURDATE(), INTERVAL 12 MONTH)
     GROUP BY month, label
     ORDER BY month ASC`
  )
  return rows
}

// ── Chart data: servicios más vendidos ────────────────────────
export async function getTopServices(limit = 10) {
  const [rows] = await getPool().query(
    `SELECT
       os.service_name,
       COUNT(*)                        AS times_sold,
       COALESCE(SUM(os.total_price), 0) AS revenue
     FROM order_services os
     GROUP BY os.service_name
     ORDER BY times_sold DESC
     LIMIT ?`,
    [Number(limit)]
  )
  return rows
}

// ── Chart data: top clientes frecuentes ──────────────────────
export async function getTopClients(limit = 10) {
  const [rows] = await getPool().query(
    `SELECT
       CONCAT(c.name, ' ', c.last_name) AS client_name,
       c.phone,
       COUNT(o.id)                       AS orders_count,
       COALESCE(SUM(o.final_price), 0)  AS total_spent
     FROM orders o
     INNER JOIN clients c ON c.id = o.client_id
     WHERE c.deleted_at IS NULL
     GROUP BY c.id, c.name, c.last_name, c.phone
     ORDER BY orders_count DESC
     LIMIT ?`,
    [Number(limit)]
  )
  return rows
}

// ── Chart data: stock por categoría ──────────────────────────
export async function getStockByCategory() {
  const [rows] = await getPool().query(
    `SELECT
       category,
       COUNT(*)                      AS items_count,
       COALESCE(SUM(quantity), 0)    AS total_stock,
       COUNT(CASE WHEN quantity = 0 THEN 1 END)       AS out_of_stock,
       COUNT(CASE WHEN quantity <= min_stock AND quantity > 0 THEN 1 END) AS low_stock
     FROM inventory
     GROUP BY category
     ORDER BY category ASC`
  )
  return rows
}

// ── Chart data: órdenes por técnico ──────────────────────────
export async function getOrdersByTechnician() {
  const [rows] = await getPool().query(
    `SELECT
       CONCAT(e.name, ' ', e.last_name) AS employee_name,
       e.specialty,
       COUNT(o.id)                                         AS total_orders,
       COUNT(CASE WHEN o.status = 'Entregada' THEN 1 END) AS completed,
       COUNT(CASE WHEN o.status != 'Entregada' THEN 1 END) AS active
     FROM orders o
     INNER JOIN employees e ON e.id = o.assigned_employee_id AND e.deleted_at IS NULL
     GROUP BY e.id, e.name, e.last_name, e.specialty
     ORDER BY total_orders DESC`
  )
  return rows
}

// ── Chart data: citas atendidas por mes ──────────────────────
export async function getAppointmentsByMonth() {
  const [rows] = await getPool().query(
    `SELECT
       DATE_FORMAT(requested_date, '%Y-%m')  AS month,
       DATE_FORMAT(requested_date, '%b %Y')  AS label,
       COUNT(*)                               AS total,
       COUNT(CASE WHEN status = 'Atendida' THEN 1 END)   AS attended,
       COUNT(CASE WHEN status = 'Cancelada' THEN 1 END)  AS cancelled,
       COUNT(CASE WHEN status = 'Pendiente' THEN 1 END)  AS pending
     FROM appointments
     WHERE requested_date >= DATE_SUB(CURDATE(), INTERVAL 6 MONTH)
     GROUP BY month, label
     ORDER BY month ASC`
  )
  return rows
}

// ── Alertas de inventario — usa v_inventory_alerts ────────────
export async function getInventoryAlerts() {
  const pool = getPool()

  const [[statusRows], [itemRows]] = await Promise.all([
    pool.query(
      `SELECT
         status,
         COUNT(*)                        AS count,
         COALESCE(SUM(units_needed), 0)          AS total_units_needed,
         COALESCE(SUM(estimated_restock_cost), 0) AS total_restock_cost
       FROM v_inventory_alerts
       GROUP BY status`
    ),
    pool.query(
      `SELECT
         id, code, name, brand, category,
         quantity, min_stock, status,
         unit_price, supplier,
         units_needed, estimated_restock_cost
       FROM v_inventory_alerts
       ORDER BY quantity ASC, name ASC`
    ),
  ])

  // Construir summary con totales de reabastecimiento
  const summary = {
    'Stock bajo': { count: 0, totalUnitsNeeded: 0, totalRestockCost: 0 },
    'Agotado':    { count: 0, totalUnitsNeeded: 0, totalRestockCost: 0 },
  }
  let globalRestockCost = 0

  for (const row of statusRows) {
    if (summary[row.status]) {
      summary[row.status].count            = Number(row.count)
      summary[row.status].totalUnitsNeeded = Number(row.total_units_needed)
      summary[row.status].totalRestockCost = Number(row.total_restock_cost)
    }
    globalRestockCost += Number(row.total_restock_cost)
  }

  return {
    summary: {
      ...summary,
      totalRestockCost: globalRestockCost,
    },
    items: itemRows,
  }
}
