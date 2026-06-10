import { useCallback, useMemo, useState } from 'react'
import { ToastContext } from './toastContextValue'
import { Toast } from '../components/Toast/Toast'

export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([])

  const removeToast = useCallback((id) => {
    setToasts((prev) => prev.filter((t) => t.id !== id))
  }, [])

  const addToast = useCallback((message, type = 'info', duration = 4000) => {
    const id = crypto.randomUUID()
    setToasts((prev) => [...prev, { id, message, type }])
    if (duration > 0) {
      setTimeout(() => removeToast(id), duration)
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
