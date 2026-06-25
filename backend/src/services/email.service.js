import nodemailer from 'nodemailer'
import { logger } from '../utils/logger.js'

let transporter = null

function getTransporter() {
  if (!transporter) {
    transporter = nodemailer.createTransport({
      host:   process.env.SMTP_HOST,
      port:   Number(process.env.SMTP_PORT ?? 587),
      secure: process.env.SMTP_SECURE === 'true',
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS,
      },
      pool: true,
      maxConnections: 3,
      connectionTimeout: 10000,
      greetingTimeout: 10000,
      socketTimeout: 30000,
      tls: { rejectUnauthorized: process.env.NODE_ENV === 'production' },
    })
    logger.info('SMTP transporter creado', {
      host: process.env.SMTP_HOST,
      port: process.env.SMTP_PORT,
      user: process.env.SMTP_USER,
    })
  }
  return transporter
}

export async function verifySmtp() {
  const t = getTransporter()
  try {
    await t.verify()
    logger.info('SMTP conectado — listo para enviar correos')
    return { ok: true }
  } catch (err) {
    logger.error('SMTP verificación fallida', {
      code: err.code,
      response: err.response,
      message: err.message,
    })
    return { ok: false, code: err.code, message: err.message }
  }
}

export async function sendPasswordResetCode(to, code) {
  const t = getTransporter()
  const from = process.env.SMTP_FROM ?? process.env.SMTP_USER
  const expiresMin = Number(process.env.PASSWORD_RESET_EXPIRES_MIN ?? 10)

  logger.info(`Enviando código de recuperación a ${to}`, { expiresMin })

  try {
    const info = await t.sendMail({
      from,
      to,
      subject: `${code} es tu código de recuperación — ENGINES JDS`,
      html: `
        <div style="font-family:system-ui,sans-serif;max-width:480px;margin:auto;background:#ffffff;border-radius:12px;overflow:hidden;border:1px solid #e5e7eb">
          <div style="background:#0A0F1E;padding:28px 32px">
            <p style="margin:0;color:#F97316;font-size:0.75rem;font-weight:800;letter-spacing:0.1em;text-transform:uppercase">ENGINES JDS</p>
            <h1 style="margin:8px 0 0;color:#ffffff;font-size:1.5rem;font-weight:800">Recuperar contraseña</h1>
          </div>
          <div style="padding:32px">
            <p style="margin:0 0 20px;color:#374151;font-size:0.95rem;line-height:1.6">
              Recibimos una solicitud para restablecer la contraseña de tu cuenta.<br>
              Usa el código a continuación. <strong>Expira en ${expiresMin} minutos.</strong>
            </p>
            <div style="background:#f9fafb;border:2px dashed #e5e7eb;border-radius:12px;padding:24px;text-align:center;margin:0 0 24px">
              <p style="margin:0 0 6px;font-size:0.75rem;font-weight:700;color:#9ca3af;letter-spacing:0.08em;text-transform:uppercase">Tu código</p>
              <p style="margin:0;font-size:2.8rem;font-weight:900;letter-spacing:0.25em;color:#0A0F1E;font-variant-numeric:tabular-nums">${code}</p>
            </div>
            <p style="margin:0 0 8px;color:#6b7280;font-size:0.85rem;line-height:1.5">
              Ingresa este código en la pantalla de recuperación. Si no solicitaste este cambio, puedes ignorar este correo de forma segura.
            </p>
          </div>
          <div style="background:#f9fafb;padding:16px 32px;border-top:1px solid #e5e7eb">
            <p style="margin:0;font-size:0.75rem;color:#9ca3af">ENGINES JDS — Sistema de gestión de taller de motocicletas</p>
          </div>
        </div>
      `,
    })

    logger.info(`Correo enviado a ${to}`, {
      messageId: info.messageId,
      response: info.response,
    })
    return info
  } catch (err) {
    logger.error(`Error SMTP enviando correo a ${to}`, {
      code: err.code,
      response: err.response,
      message: err.message,
    })
    throw err
  }
}

export async function sendTestEmail() {
  const to = process.env.SMTP_USER
  const t = getTransporter()
  const from = process.env.SMTP_FROM ?? process.env.SMTP_USER

  logger.info(`Enviando correo de prueba a ${to}`)

  try {
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

    logger.info(`Correo de prueba enviado a ${to}`, {
      messageId: info.messageId,
      response: info.response,
    })
    return info
  } catch (err) {
    logger.error('Error SMTP en correo de prueba', {
      code: err.code,
      response: err.response,
      message: err.message,
    })
    throw err
  }
}
