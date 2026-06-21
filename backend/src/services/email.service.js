import nodemailer from 'nodemailer'

function createTransport() {
  return nodemailer.createTransport({
    host:   process.env.SMTP_HOST,
    port:   Number(process.env.SMTP_PORT ?? 587),
    secure: process.env.SMTP_SECURE === 'true',
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS,
    },
  })
}

export async function sendPasswordResetCode(to, code) {
  const transport = createTransport()
  const from = process.env.SMTP_FROM ?? process.env.SMTP_USER

  await transport.sendMail({
    from,
    to,
    subject: `${code} es tu código de recuperación — ENGINES JDS`,
    html: `
      <div style="font-family:system-ui,sans-serif;max-width:480px;margin:auto;background:#ffffff;border-radius:12px;overflow:hidden;border:1px solid #e5e7eb">
        <!-- Header -->
        <div style="background:#0A0F1E;padding:28px 32px">
          <p style="margin:0;color:#F97316;font-size:0.75rem;font-weight:800;letter-spacing:0.1em;text-transform:uppercase">ENGINES JDS</p>
          <h1 style="margin:8px 0 0;color:#ffffff;font-size:1.5rem;font-weight:800">Recuperar contraseña</h1>
        </div>
        <!-- Body -->
        <div style="padding:32px">
          <p style="margin:0 0 20px;color:#374151;font-size:0.95rem;line-height:1.6">
            Recibimos una solicitud para restablecer la contraseña de tu cuenta.<br>
            Usa el código a continuación. <strong>Expira en 10 minutos.</strong>
          </p>

          <!-- Code box -->
          <div style="background:#f9fafb;border:2px dashed #e5e7eb;border-radius:12px;padding:24px;text-align:center;margin:0 0 24px">
            <p style="margin:0 0 6px;font-size:0.75rem;font-weight:700;color:#9ca3af;letter-spacing:0.08em;text-transform:uppercase">Tu código</p>
            <p style="margin:0;font-size:2.8rem;font-weight:900;letter-spacing:0.25em;color:#0A0F1E;font-variant-numeric:tabular-nums">${code}</p>
          </div>

          <p style="margin:0 0 8px;color:#6b7280;font-size:0.85rem;line-height:1.5">
            Ingresa este código en la pantalla de recuperación. Si no solicitaste este cambio, puedes ignorar este correo de forma segura.
          </p>
        </div>
        <!-- Footer -->
        <div style="background:#f9fafb;padding:16px 32px;border-top:1px solid #e5e7eb">
          <p style="margin:0;font-size:0.75rem;color:#9ca3af">ENGINES JDS — Sistema de gestión de taller de motocicletas</p>
        </div>
      </div>
    `,
  })
}
