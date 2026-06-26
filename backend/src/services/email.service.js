import nodemailer from 'nodemailer'
import { logger } from '../utils/logger.js'

let transporter = null

export async function initialize() {
  const host = process.env.SMTP_HOST
  const user = process.env.SMTP_USER
  const pass = process.env.SMTP_PASS

  if (!host || !user || !pass) {
    logger.warn('SMTP no configurado — los correos no estarán disponibles (configura SMTP_HOST, SMTP_USER y SMTP_PASS)')
    return
  }

  const t = nodemailer.createTransport({
    host,
    port:   Number(process.env.SMTP_PORT ?? 587),
    secure: process.env.SMTP_SECURE === 'true',
    auth:   { user, pass },
    pool:   true,
    maxConnections:    3,
    connectionTimeout: 10_000,
    greetingTimeout:   10_000,
    socketTimeout:     30_000,
    tls: { rejectUnauthorized: process.env.NODE_ENV === 'production' },
  })

  await t.verify()
  transporter = t
  logger.info('SMTP conectado', { host, port: process.env.SMTP_PORT ?? 587, user })
}

export function getTransporter() {
  if (!transporter) {
    throw new Error('SMTP no configurado — no es posible enviar correos')
  }
  return transporter
}

export async function sendTestEmail() {
  const t = getTransporter()
  const to   = process.env.SMTP_USER ?? 'test@enginesjds.com'
  const from = process.env.SMTP_FROM ?? process.env.SMTP_USER ?? 'noreply@enginesjds.com'

  const info = await t.sendMail({
    from,
    to,
    subject: 'ENGINES JDS — Correo de prueba SMTP',
    html: `
      <div style="font-family:system-ui,sans-serif;max-width:480px;margin:auto;background:#ffffff;border-radius:12px;overflow:hidden;border:1px solid #e5e7eb">
        <div style="background:#0A0F1E;padding:28px 32px">
          <p style="margin:0;color:#F97316;font-size:0.75rem;font-weight:800;letter-spacing:0.1em;text-transform:uppercase">ENGINES JDS</p>
          <h1 style="margin:8px 0 0;color:#ffffff;font-size:1.5rem;font-weight:800">Prueba SMTP</h1>
        </div>
        <div style="padding:32px">
          <p style="margin:0;color:#374151;font-size:0.95rem;line-height:1.6">
            Si estás leyendo este correo, la configuración SMTP funciona correctamente.
          </p>
          <p style="margin:16px 0 0;color:#6b7280;font-size:0.85rem">
            Enviado: ${new Date().toLocaleString('es-CO', { timeZone: 'America/Bogota' })}
          </p>
        </div>
      </div>
    `,
  })

  logger.info('Correo de prueba enviado', { to, messageId: info.messageId })
  return info
}
