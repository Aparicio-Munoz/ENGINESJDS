import { isSaaSEnabled } from './saas.js'

const REQUIRED = [
  'DB_HOST',
  'DB_USER',
  'DB_NAME',
  'JWT_SECRET',
]

export function validateEnv() {
  const required = [...REQUIRED]
  if (isSaaSEnabled()) required.push('PLATFORM_DB_NAME')

  const missing = required.filter((key) => !process.env[key]?.trim())
  if (missing.length > 0) {
    throw new Error(
      `[env] Variables de entorno requeridas no configuradas: ${missing.join(', ')}\n` +
      `      Revisa el archivo .env (copia desde .env.example).`
    )
  }
}
