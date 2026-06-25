let deferredPrompt = null
let swRegistration = null

export function registerSW() {
  if (!('serviceWorker' in navigator)) return
  if (import.meta.env.DEV) return

  window.addEventListener('load', async () => {
    try {
      swRegistration = await navigator.serviceWorker.register('/sw.js')

      swRegistration.addEventListener('updatefound', () => {
        const newWorker = swRegistration.installing
        if (!newWorker) return

        newWorker.addEventListener('statechange', () => {
          if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
            showUpdateBanner()
          }
        })
      })
    } catch (err) {
      console.warn('SW registration failed:', err)
    }
  })

  // Capture install prompt
  window.addEventListener('beforeinstallprompt', (e) => {
    e.preventDefault()
    deferredPrompt = e
    window.dispatchEvent(new Event('pwa-install-available'))
  })
}

function showUpdateBanner() {
  if (document.getElementById('pwa-update-banner')) return

  const banner = document.createElement('div')
  banner.id = 'pwa-update-banner'
  banner.innerHTML = `
    <div style="position:fixed;bottom:20px;left:50%;transform:translateX(-50%);z-index:9999;
      display:flex;align-items:center;gap:12px;padding:12px 20px;border-radius:12px;
      background:#1E293B;border:1px solid #F97316;box-shadow:0 8px 32px rgba(0,0,0,0.4);
      font-family:Inter,system-ui,sans-serif;font-size:0.88rem;color:#E2E8F0;max-width:420px;">
      <span>Hay una nueva versión disponible</span>
      <button onclick="document.getElementById('pwa-update-banner').remove();navigator.serviceWorker.controller?.postMessage({type:'SKIP_WAITING'});location.reload()"
        style="padding:8px 16px;border:0;border-radius:8px;background:#F97316;color:#fff;
          font-weight:700;font-size:0.85rem;cursor:pointer;white-space:nowrap;">
        Actualizar
      </button>
    </div>
  `
  document.body.appendChild(banner)
}

export async function promptInstall() {
  if (!deferredPrompt) return false
  deferredPrompt.prompt()
  const { outcome } = await deferredPrompt.userChoice
  deferredPrompt = null
  return outcome === 'accepted'
}

export function canInstall() {
  return deferredPrompt !== null
}
