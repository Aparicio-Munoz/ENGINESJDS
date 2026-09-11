const CHANNEL_NAME = 'sgtm-auth-events'
const EVENT_NAME = 'sgtm-auth-event'
const SOURCE_ID = `${Date.now()}-${Math.random().toString(36).slice(2)}`

let channel = null

function getChannel() {
  if (channel || typeof window === 'undefined' || !('BroadcastChannel' in window)) return channel
  channel = new BroadcastChannel(CHANNEL_NAME)
  return channel
}

export function notifySessionEvent(type) {
  if (typeof window === 'undefined') return
  const event = { type, at: Date.now(), sourceId: SOURCE_ID }
  window.dispatchEvent(new CustomEvent(EVENT_NAME, { detail: { ...event, local: true } }))
  getChannel()?.postMessage(event)
}

export function subscribeSessionEvents(handler) {
  if (typeof window === 'undefined') return () => {}

  const onWindowEvent = (event) => handler(event.detail)
  const currentChannel = getChannel()
  const onChannelMessage = (event) => handler({ ...event.data, local: false })

  window.addEventListener(EVENT_NAME, onWindowEvent)
  currentChannel?.addEventListener('message', onChannelMessage)

  return () => {
    window.removeEventListener(EVENT_NAME, onWindowEvent)
    currentChannel?.removeEventListener('message', onChannelMessage)
  }
}
