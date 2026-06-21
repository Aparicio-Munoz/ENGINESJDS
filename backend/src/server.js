import 'dotenv/config'
import express from 'express'
import cors from 'cors'
import helmet from 'helmet'
import morgan from 'morgan'

import { validateEnv } from './config/env.js'
import { testConnection, closePool } from './config/database.js'
import { apiRouter } from './routes/index.js'
import { errorHandler } from './middlewares/error.middleware.js'
import { logger } from './utils/logger.js'

validateEnv()

const app = express()
const PORT = Number(process.env.PORT ?? 3000)

// Detrás de un proxy/balanceador (Nginx, etc.) confiamos en el primer salto
// para obtener la IP real del cliente (req.ip) — clave para el bloqueo por IP.
app.set('trust proxy', 1)

// ── Seguridad ─────────────────────────────────────────────
app.use(helmet())
app.use(cors({
  origin:      process.env.FRONTEND_URL ?? 'http://localhost:5173',
  credentials: true,
}))

// ── Parseo de body ────────────────────────────────────────
app.use(express.json())
app.use(express.urlencoded({ extended: false }))

// ── Logging HTTP ──────────────────────────────────────────
app.use(morgan(process.env.NODE_ENV === 'production' ? 'combined' : 'dev'))

// ── Rutas API ─────────────────────────────────────────────
app.use('/api', apiRouter)

// ── Health check ──────────────────────────────────────────
app.get('/health', (_req, res) => {
  res.json({
    status:    'ok',
    service:   'ENGINES JDS API',
    version:   '1.0.0',
    timestamp: new Date().toISOString(),
  })
})

// ── 404 ───────────────────────────────────────────────────
app.use((_req, res) => {
  res.status(404).json({ success: false, message: 'Ruta no encontrada' })
})

// ── Errores globales ──────────────────────────────────────
app.use(errorHandler)

// ── Arranque ──────────────────────────────────────────────
async function bootstrap() {
  try {
    await testConnection()
    const server = app.listen(PORT, () => {
      logger.info(`ENGINES JDS API → http://localhost:${PORT}`)
    })

    // Graceful shutdown
    const shutdown = async (signal) => {
      logger.info(`Señal ${signal} recibida — cerrando servidor`)
      server.close(async () => {
        await closePool()
        process.exit(0)
      })
    }
    process.on('SIGTERM', () => shutdown('SIGTERM'))
    process.on('SIGINT',  () => shutdown('SIGINT'))
  } catch (err) {
    logger.error('Error al iniciar el servidor', { message: err.message })
    process.exit(1)
  }
}

bootstrap()

export default app
