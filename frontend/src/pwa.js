let deferredPrompt = null
let swRegistration = null

export function registerSW() {
  if (!('serviceWorker' in navigator)) return
  if (import.meta.env.DEV) return

  window.addEventListener('load', async () => {
    try {
      swRegistration = await navigator.serviceWorker.register('/sw.js')

      if (swRegistration.waiting && navigator.serviceWorker.controller) {
        showUpdateBanner(swRegistration)
      }

      swRegistration.addEventListener('updatefound', () => {
        const newWorker = swRegistration.installing
        if (!newWorker) return

        newWorker.addEventListener('statechange', () => {
          if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
            showUpdateBanner(swRegistration)
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

function showUpdateBanner(registration) {
  if (document.getElementById('pwa-update-banner')) return

  const banner = document.createElement('div')
  banner.id = 'pwa-update-banner'
  Object.assign(banner.style, {
    position: 'fixed', bottom: '20px', left: '50%', transform: 'translateX(-50%)', zIndex: '9999',
    display: 'flex', alignItems: 'center', gap: '12px', padding: '12px 20px', borderRadius: '12px',
    background: '#1E293B', border: '1px solid #F97316', boxShadow: '0 8px 32px rgba(0,0,0,0.4)',
    fontFamily: 'Inter, system-ui, sans-serif', fontSize: '0.88rem', color: '#E2E8F0', maxWidth: 'calc(100vw - 32px)',
  })

  const message = document.createElement('span')
  message.textContent = 'Hay una nueva versión disponible'
  const updateButton = document.createElement('button')
  updateButton.type = 'button'
  updateButton.textContent = 'Actualizar'
  Object.assign(updateButton.style, {
    padding: '8px 16px', border: '0', borderRadius: '8px', background: '#F97316', color: '#fff',
    fontWeight: '700', fontSize: '0.85rem', cursor: 'pointer', whiteSpace: 'nowrap',
  })
  updateButton.addEventListener('click', () => {
    const waitingWorker = registration?.waiting
    if (!waitingWorker) return
    updateButton.disabled = true
    updateButton.textContent = 'Actualizando…'
    navigator.serviceWorker.addEventListener('controllerchange', () => window.location.reload(), { once: true })
    waitingWorker.postMessage({ type: 'SKIP_WAITING' })
  })

  banner.append(message, updateButton)
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
