import styles from './ConfirmModal.module.css'

export function ConfirmModal({ isOpen, entityLabel, onConfirm, onCancel }) {
  if (!isOpen) return null

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
        <div className={styles.actions}>
          <button className={styles.cancelButton} type="button" onClick={onCancel}>
            Cancelar
          </button>
          <button className={styles.deleteButton} type="button" onClick={onConfirm}>
            Eliminar
          </button>
        </div>
      </section>
    </div>
  )
}
