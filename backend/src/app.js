import 'dotenv/config'
import express from 'express'
import cors from 'cors'
import helmet from 'helmet'
import morgan from 'morgan'

import { validateEnv } from './config/env.js'
import { apiRouter } from './routes/index.js'
import { errorHandler } from './middlewares/error.middleware.js'
import { apiLimiter } from './middlewares/rateLimit.middleware.js'

validateEnv()

const app = express()

app.set('trust proxy', 1)

// ── Seguridad ─────────────────────────────────────────────
app.use(helmet())

// CORS: acepta el FRONTEND_URL configurado + cualquier IP local en desarrollo
const allowedOrigins = (process.env.FRONTEND_URL ?? 'http://localhost:5173').split(',').map((s) => s.trim())
app.use(cors({
  origin(origin, callback) {
    if (!origin) return callback(null, true)
    if (allowedOrigins.includes(origin)) return callback(null, true)
    if (process.env.NODE_ENV !== 'production' && (origin.includes('://192.168.') || origin.includes('://10.') || origin.includes('://172.') || origin.includes('://localhost'))) {
      return callback(null, true)
    }
    callback(null, false)
  },
  credentials: true,
}))

// ── Parseo de body ────────────────────────────────────────
app.use(express.json())
app.use(express.urlencoded({ extended: false }))

// ── Logging HTTP ──────────────────────────────────────────
app.use(morgan(process.env.NODE_ENV === 'production' ? 'combined' : 'dev'))

// ── Rutas API ─────────────────────────────────────────────
app.use('/api', apiLimiter, apiRouter)

// ── Health check ──────────────────────────────────────────
app.get('/health', (_req, res) => {
  res.json({
    status:    'ok',
    service:   'ENGINES JDS API',
    version:   '1.0.0',
    timestamp: new Date().toISOString(),
  })
})

// Health check con ping a la base de datos: mantiene actividad en Aiven
// (el plan Free se apaga automáticamente sin conexiones) y sirve de
// monitoreo real del sistema completo.
app.get('/health/db', async (_req, res) => {
  try {
    const { getPool } = await import('./config/database.js')
    await getPool().query('SELECT 1')
    res.json({ status: 'ok', database: 'ok', timestamp: new Date().toISOString() })
  } catch {
    res.status(503).json({ status: 'error', database: 'unreachable', timestamp: new Date().toISOString() })
  }
})

// ── 404 ───────────────────────────────────────────────────
app.use((_req, res) => {
  res.status(404).json({ success: false, message: 'Ruta no encontrada' })
})

// ── Errores globales ──────────────────────────────────────
app.use(errorHandler)

export default app
