import { createContext, useCallback, useMemo, useState } from 'react'
import { Toast } from '../components/Toast/Toast'

export const ToastContext = createContext(null)

// Los errores llevan información que hay que leer (ej. por qué no se
// pudo cerrar una orden) — se quedan más tiempo en pantalla que una
// confirmación rápida de éxito.
const DEFAULT_DURATIONS = { success: 4000, info: 4000, warning: 6000, error: 7000 }

export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([])

  const removeToast = useCallback((id) => {
    setToasts((prev) => prev.filter((t) => t.id !== id))
  }, [])

  const addToast = useCallback((message, type = 'info', duration) => {
    const id = crypto.randomUUID()
    setToasts((prev) => [...prev, { id, message, type }])
    const effectiveDuration = duration ?? DEFAULT_DURATIONS[type] ?? 4000
    if (effectiveDuration > 0) {
      setTimeout(() => removeToast(id), effectiveDuration)
    }
  }, [removeToast])

  const value = useMemo(() => ({
    toast: {
      success: (msg, dur) => addToast(msg, 'success', dur),
      error:   (msg, dur) => addToast(msg, 'error',   dur),
      warning: (msg, dur) => addToast(msg, 'warning',  dur),
      info:    (msg, dur) => addToast(msg, 'info',    dur),
    },
  }), [addToast])

  return (
    <ToastContext.Provider value={value}>
      {children}
      <Toast toasts={toasts} onRemove={removeToast} />
    </ToastContext.Provider>
  )
}
