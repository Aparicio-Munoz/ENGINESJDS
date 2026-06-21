const LEVELS = { error: 0, warn: 1, info: 2, debug: 3 }

function log(level, message, meta) {
  const currentLevel = process.env.LOG_LEVEL ?? 'info'
  if (LEVELS[level] > LEVELS[currentLevel]) return

  const entry = {
    level,
    timestamp: new Date().toISOString(),
    message,
    ...(meta && Object.keys(meta).length ? { meta } : {}),
  }

  const output = JSON.stringify(entry)
  if (level === 'error') return console.error(output)
  if (level === 'warn')  return console.warn(output)
  console.log(output)
}

export const logger = {
  error: (msg, meta) => log('error', msg, meta),
  warn:  (msg, meta) => log('warn',  msg, meta),
  info:  (msg, meta) => log('info',  msg, meta),
  debug: (msg, meta) => log('debug', msg, meta),
}
