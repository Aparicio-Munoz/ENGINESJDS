import { ensureInitialized, getTransporter } from '../services/email.service.js'
import { logger } from './logger.js'

// ── Envío del correo con el código de recuperación de contraseña ─
// Reutiliza el transporter SMTP singleton (services/email.service.js) —
// evita duplicar configuración. Se inicializa de forma perezosa porque en
// serverless no hay un único arranque de proceso que lo dispare de antemano.
export async function sendPasswordResetCode(to, code, username = '') {
  await ensureInitialized()
  const transporter = getTransporter()
  const from = process.env.SMTP_FROM ?? process.env.SMTP_USER

  const info = await transporter.sendMail({
    from,
    to,
    subject: 'ENGINES JDS — Código de recuperación de contraseña',
    html: `
      <div style="font-family:system-ui,sans-serif;max-width:480px;margin:auto;background:#ffffff;border-radius:12px;overflow:hidden;border:1px solid #e5e7eb">
        <div style="background:#0A0F1E;padding:28px 32px">
          <p style="margin:0;color:#F97316;font-size:0.75rem;font-weight:800;letter-spacing:0.1em;text-transform:uppercase">ENGINES JDS</p>
          <h1 style="margin:8px 0 0;color:#ffffff;font-size:1.5rem;font-weight:800">Recuperación de contraseña</h1>
        </div>
        <div style="padding:32px">
          <p style="margin:0 0 20px;color:#374151;font-size:0.95rem;line-height:1.6">
            ${username ? `Hola ${username},` : 'Hola,'} recibimos una solicitud para restablecer tu contraseña.
            Usa el siguiente código para continuar:
          </p>
          <div style="text-align:center;padding:20px 0">
            <span style="display:inline-block;font-size:2rem;font-weight:800;letter-spacing:0.4em;color:#0A0F1E;background:#f3f4f6;padding:16px 24px;border-radius:10px">
              ${code}
            </span>
          </div>
          <p style="margin:20px 0 0;color:#6b7280;font-size:0.85rem;line-height:1.6">
            Este código expira en 10 minutos. Si no solicitaste este cambio, puedes ignorar este correo.
          </p>
        </div>
      </div>
    `,
  })

  logger.info('Correo de recuperación de contraseña enviado', { to, messageId: info.messageId })
  return info
}
