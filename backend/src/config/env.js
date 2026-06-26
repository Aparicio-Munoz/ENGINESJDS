const REQUIRED = [
  'DB_HOST',
  'DB_USER',
  'DB_NAME',
  'JWT_SECRET',
]

export function validateEnv() {
  const missing = REQUIRED.filter((key) => !process.env[key]?.trim())
  if (missing.length > 0) {
    throw new Error(
      `[env] Variables de entorno requeridas no configuradas: ${missing.join(', ')}\n` +
      `      Revisa el archivo .env (copia desde .env.example).`
    )
  }
}
