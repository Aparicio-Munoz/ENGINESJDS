import { Router } from 'express'
import authRoutes        from './auth.routes.js'
import clientRoutes      from './clients.routes.js'
import motorcycleRoutes  from './motorcycles.routes.js'
import appointmentRoutes from './appointments.routes.js'
import orderRoutes       from './orders.routes.js'
import inventoryRoutes   from './inventory.routes.js'
import employeeRoutes    from './employees.routes.js'
import userRoutes        from './users.routes.js'
import reportRoutes      from './reports.routes.js'
import technicianRoutes  from './technician.routes.js'
import brandRoutes       from './brands.routes.js'
import backupRoutes      from './backups.routes.js'
import invoiceRoutes     from './invoices.routes.js'
import historyRoutes     from './history.routes.js'
import reminderRoutes    from './reminders.routes.js'
import settingsRoutes    from './settings.routes.js'
import publicRoutes      from './public.routes.js'
import quickJobsRoutes   from './quickJobs.routes.js'
import { sendTestEmail } from '../services/email.service.js'

export const apiRouter = Router()

// ── Rutas públicas (sin JWT) ──────────────────────────
apiRouter.use('/public', publicRoutes)

// ── Autenticación (pública) ───────────────────────────
apiRouter.use('/auth', authRoutes)

// ── Módulos administrativos (requieren JWT) ───────────
apiRouter.use('/clients',      clientRoutes)
apiRouter.use('/motorcycles',  motorcycleRoutes)
apiRouter.use('/appointments', appointmentRoutes)
apiRouter.use('/orders',       orderRoutes)
apiRouter.use('/inventory',    inventoryRoutes)
apiRouter.use('/brands',       brandRoutes)
apiRouter.use('/employees',    employeeRoutes)
apiRouter.use('/users',        userRoutes)
apiRouter.use('/reports',      reportRoutes)
apiRouter.use('/backups',      backupRoutes)
apiRouter.use('/invoices',     invoiceRoutes)
apiRouter.use('/history',      historyRoutes)
apiRouter.use('/reminders',    reminderRoutes)
apiRouter.use('/settings',     settingsRoutes)
apiRouter.use('/quick-jobs',   quickJobsRoutes)

// ── Panel Técnico (requiere rol Técnico) ──────────────
apiRouter.use('/technician',   technicianRoutes)

// ── Diagnóstico SMTP (solo desarrollo) ────────────────
apiRouter.get('/test-email', async (_req, res) => {
  try {
    const info = await sendTestEmail()
    res.json({ success: true, message: 'Correo de prueba enviado', messageId: info.messageId })
  } catch (err) {
    res.status(500).json({ success: false, message: err.message })
  }
})
