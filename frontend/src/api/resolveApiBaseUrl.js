export function resolveApiBaseURL({ apiBaseURL, isProduction, location }) {
  // Las cookies HttpOnly deben ser de primera parte. En producción la web
  // expone /api mediante el rewrite de Vercel, aunque VITE_API_BASE_URL
  // conserve el host directo para desarrollo o previews antiguos.
  if (isProduction) return `${location.origin}/api`

  if (apiBaseURL) return apiBaseURL
  return `${location.protocol}//${location.hostname}:3000/api`
}
