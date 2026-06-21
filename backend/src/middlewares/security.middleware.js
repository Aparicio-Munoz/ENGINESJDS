import * as LoginAttemptModel from '../models/loginAttempt.model.js'
import { ApiError } from '../utils/ApiError.js'
import { logAudit } from '../services/audit.service.js'

// ── checkBlockedIp ───────────────────────────────────────────
// Rechaza la petición si la IP está bloqueada por exceso de
// intentos fallidos. El desbloqueo es automático (lo gestiona
// getStatus al expirar blocked_until).
export async function checkBlockedIp(req, _res, next) {
  try {
    const ip = req.ip
    const status = await LoginAttemptModel.getStatus(ip)

    if (status.blocked) {
      const minutesLeft = Math.max(1, Math.ceil(status.secondsLeft / 60))

      await logAudit('IP_BLOQUEADA', {
        ip,
        details: { email: req.body?.email ?? null, minutesLeft },
      })

      return next(
        ApiError.tooManyRequests(
          `Demasiados intentos fallidos. IP bloqueada temporalmente. ` +
          `Intenta nuevamente en ${minutesLeft} minuto(s).`
        )
      )
    }

    next()
  } catch (err) {
    // Si falla la verificación de bloqueo, no dejamos pasar a ciegas:
    // se delega al error handler para no degradar la seguridad.
    next(err)
  }
}
