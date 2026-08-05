import { Router } from 'express'
import { verifyToken, requireRole } from '../middlewares/auth.middleware.js'
import { validate } from '../middlewares/validate.middleware.js'
import { createEmployeeRules, updateEmployeeRules } from '../validations/employee.validation.js'
import * as EmployeeController from '../controllers/employees.controller.js'

const router = Router()

// Todos los endpoints requieren sesión activa
router.use(verifyToken)

// GET  /api/employees
//   ?search=     busca en nombre, apellido, documento, especialidad, teléfono, email
//   ?status=     Activo | Inactivo | Vacaciones
//   ?specialty=  nombre exacto de la especialidad
//   ?sort=       name | created_at | hire_date  (default: created_at)
//   ?page=       número de página               (default: 1)
//   ?limit=      registros por página           (default: 20)
router.get('/', EmployeeController.getAll)

// GET  /api/employees/specialties   → Lista de especialidades únicas (para filtros)
// ⚠ Debe ir ANTES de /:id para no ser capturado como parámetro
router.get('/specialties', EmployeeController.getSpecialties)

// GET  /api/employees/:id
router.get('/:id', EmployeeController.getById)

// GET  /api/employees/:id/performance
//   Retorna: { employee, metrics: { totalOrders, completedOrders, activeOrders,
//              totalServices, totalRevenue, dailyEarnings, biweeklyEarnings,
//              monthlyEarnings, dailySalaryCost, biweeklySalaryCost, monthlySalaryCost } }
router.get('/:id/performance', EmployeeController.getPerformance)

// GET  /api/employees/:id/earnings?from=YYYY-MM-DD&to=YYYY-MM-DD
//   Mano de obra generada por órdenes asignadas en el rango (por fecha de ingreso)
//   Retorna: { employee, from, to, labor_total, orders_count, commission_amount, orders[] }
router.get('/:id/earnings', EmployeeController.getEarnings)

// POST   /api/employees        [Administrador]
router.post('/', requireRole('Administrador'), createEmployeeRules, validate, EmployeeController.create)

// PUT    /api/employees/:id    [Administrador]
router.put('/:id', requireRole('Administrador'), updateEmployeeRules, validate, EmployeeController.update)

// DELETE /api/employees/:id    [Administrador]   body: { reason }
router.delete('/:id', requireRole('Administrador'), EmployeeController.remove)

export default router
