import 'dotenv/config'
import express from 'express'
import cors from 'cors'
import helmet from 'helmet'
import morgan from 'morgan'
import path from 'path'
import os from 'os'

import http from 'http'
import { initSocket } from './socket/index.js'
import { validateEnv } from './config/env.js'
import { testConnection, closePool } from './config/database.js'
import { apiRouter } from './routes/index.js'
import { errorHandler } from './middlewares/error.middleware.js'
import { logger } from './utils/logger.js'
import { initialize as initEmail } from './services/email.service.js'

validateEnv()

const app = express()
const PORT = Number(process.env.PORT ?? 3000)
const HOST = process.env.HOST ?? '0.0.0.0'

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

// ── Archivos estáticos (uploads) ──────────────────────────
app.use('/uploads', express.static(path.resolve(process.cwd(), 'storage', 'uploads')))

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

function getLocalIP() {
  const nets = os.networkInterfaces()
  for (const list of Object.values(nets)) {
    for (const net of list) {
      if (net.family === 'IPv4' && !net.internal) return net.address
    }
  }
  return null
}

// ── Arranque ──────────────────────────────────────────────
async function bootstrap() {
  try {
    await testConnection()
    await initEmail().catch((err) => logger.error('SMTP no disponible', { message: err.message }))
    const httpServer = http.createServer(app)
    initSocket(httpServer)
    httpServer.listen(PORT, HOST, () => {
      const localIP = getLocalIP()
      logger.info(`ENGINES JDS API`)
      logger.info(`  Local:   http://localhost:${PORT}`)
      if (localIP) logger.info(`  Network: http://${localIP}:${PORT}`)
    })

    // Graceful shutdown
    const shutdown = async (signal) => {
      logger.info(`Señal ${signal} recibida — cerrando servidor`)
      httpServer.close(async () => {
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
