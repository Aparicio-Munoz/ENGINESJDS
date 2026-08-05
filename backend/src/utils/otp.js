import crypto from 'crypto'

const OTP_LENGTH = 6

// ── Genera un OTP numérico de 6 dígitos criptográficamente seguro ─
export function generateOTP() {
  const min = 10 ** (OTP_LENGTH - 1)
  const max = 10 ** OTP_LENGTH
  return String(crypto.randomInt(min, max))
}

// ── Hashea el OTP — nunca se almacena en texto plano ──────────
export function hashOTP(otp) {
  return crypto.createHash('sha256').update(String(otp)).digest('hex')
}

// ── Compara un OTP en texto plano contra su hash (timing-safe) ─
export function verifyOTP(otp, hash) {
  const candidate = Buffer.from(hashOTP(otp))
  const stored = Buffer.from(String(hash))
  if (candidate.length !== stored.length) return false
  return crypto.timingSafeEqual(candidate, stored)
}
