export function isSaaSEnabled() {
  return ['1', 'true', 'yes', 'on'].includes(
    String(process.env.SAAS_ENABLED ?? '').trim().toLowerCase()
  )
}

export function getTrialDays() {
  const days = Number(process.env.SAAS_TRIAL_DAYS ?? 14)
  return Number.isInteger(days) && days > 0 && days <= 365 ? days : 14
}
