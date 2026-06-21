import styles from './ConfirmModal.module.css'

export function ConfirmModal({ isOpen, entityLabel, reason, onReasonChange, onConfirm, onCancel }) {
  if (!isOpen) return null

  const requiresReason = onReasonChange !== undefined
  const canConfirm = !requiresReason || reason?.trim().length > 0

  return (
    <div className={styles.backdrop} role="presentation">
      <section
        className={styles.modal}
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
            />
          </div>
        )}
        <div className={styles.actions}>
          <button className={styles.cancelButton} type="button" onClick={onCancel}>
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
