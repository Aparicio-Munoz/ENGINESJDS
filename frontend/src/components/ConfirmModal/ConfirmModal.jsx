import { useEffect, useRef } from 'react'
import styles from './ConfirmModal.module.css'

export function ConfirmModal({ isOpen, entityLabel, reason, onReasonChange, onConfirm, onCancel }) {
  const requiresReason = onReasonChange !== undefined
  const canConfirm = !requiresReason || reason?.trim().length > 0
  const modalRef = useRef(null)
  const reasonRef = useRef(null)
  const cancelRef = useRef(null)

  useEffect(() => {
    if (!isOpen) return undefined

    const previousFocus = document.activeElement
    const focusTimer = window.setTimeout(() => {
      ;(requiresReason ? reasonRef.current : cancelRef.current)?.focus()
    }, 0)

    function handleKeyDown(event) {
      if (event.key === 'Escape') {
        event.preventDefault()
        onCancel()
        return
      }

      if (event.key !== 'Tab') return
      const focusable = modalRef.current?.querySelectorAll(
        'button:not(:disabled), textarea:not(:disabled), [href], input:not(:disabled), select:not(:disabled)'
      )
      if (!focusable?.length) return

      const first = focusable[0]
      const last = focusable[focusable.length - 1]
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault()
        last.focus()
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault()
        first.focus()
      }
    }

    document.addEventListener('keydown', handleKeyDown)
    return () => {
      window.clearTimeout(focusTimer)
      document.removeEventListener('keydown', handleKeyDown)
      previousFocus?.focus?.()
    }
  }, [isOpen, requiresReason, onCancel])

  if (!isOpen) return null

  return (
    <div className={styles.backdrop} role="presentation">
      <section
        className={styles.modal}
        ref={modalRef}
        role="alertdialog"
        aria-modal="true"
        aria-labelledby="confirm-title"
        aria-describedby="confirm-desc"
      >
        <h2 id="confirm-title" className={styles.title}>
          Confirmar eliminación
        </h2>
        <p id="confirm-desc" className={styles.message}>
          ¿Estás seguro que deseas eliminar{' '}
          <strong>&ldquo;{entityLabel}&rdquo;</strong>? Esta acción no se puede
          deshacer.
        </p>
        {requiresReason && (
          <div className={styles.reasonField}>
            <label htmlFor="delete-reason" className={styles.reasonLabel}>
              Motivo de eliminación <span className={styles.required}>*</span>
            </label>
            <textarea
              id="delete-reason"
              className={styles.reasonTextarea}
              rows={3}
              maxLength={500}
              placeholder="Describe el motivo..."
              value={reason}
              onChange={(e) => onReasonChange(e.target.value)}
              ref={reasonRef}
            />
          </div>
        )}
        <div className={styles.actions}>
          <button className={styles.cancelButton} type="button" onClick={onCancel} ref={cancelRef}>
            Cancelar
          </button>
          <button
            className={styles.deleteButton}
            type="button"
            onClick={onConfirm}
            disabled={!canConfirm}
          >
            Eliminar
          </button>
        </div>
      </section>
    </div>
  )
}
