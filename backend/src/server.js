import 'dotenv/config'
import http from 'http'
import os from 'os'

import app from './app.js'
import { testConnection, closePool } from './config/database.js'
import { logger } from './utils/logger.js'
import { initialize as initEmail } from './services/email.service.js'

const PORT = Number(process.env.PORT ?? 3000)
const HOST = process.env.HOST ?? '0.0.0.0'

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
