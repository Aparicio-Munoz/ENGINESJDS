import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import test from 'node:test'
import { resolveApiBaseURL } from '../src/api/resolveApiBaseUrl.js'

const productionLocation = {
  origin: 'https://sgtm-app.vercel.app',
  protocol: 'https:',
  hostname: 'sgtm-app.vercel.app',
}

test('la web de producción consume la API por su propio origen', () => {
  assert.equal(
    resolveApiBaseURL({
      apiBaseURL: 'https://sgtm-api.vercel.app/api',
      isProduction: true,
      location: productionLocation,
    }),
    'https://sgtm-app.vercel.app/api',
  )
})

test('el desarrollo conserva la API configurada o el puerto local', () => {
  assert.equal(
    resolveApiBaseURL({
      apiBaseURL: 'https://preview-api.example/api',
      isProduction: false,
      location: productionLocation,
    }),
    'https://preview-api.example/api',
  )
  assert.equal(
    resolveApiBaseURL({
      apiBaseURL: '',
      isProduction: false,
      location: { protocol: 'http:', hostname: '192.168.1.24' },
    }),
    'http://192.168.1.24:3000/api',
  )
})

test('Vercel reenvía /api antes del fallback de la SPA', async () => {
  const config = JSON.parse(await readFile(new URL('../vercel.json', import.meta.url), 'utf8'))
  const apiRewriteIndex = config.rewrites.findIndex((rewrite) => rewrite.source === '/api/:path*')
  const spaRewriteIndex = config.rewrites.findIndex((rewrite) => rewrite.destination === '/index.html')

  assert.ok(apiRewriteIndex >= 0, 'falta el proxy /api hacia el backend')
  assert.ok(apiRewriteIndex < spaRewriteIndex, 'el proxy debe evaluarse antes del fallback de la SPA')
  assert.equal(
    config.rewrites[apiRewriteIndex].destination,
    'https://sgtm-api.vercel.app/api/:path*',
  )
})
