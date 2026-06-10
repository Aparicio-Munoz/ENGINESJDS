import styles from './Loader.module.css'

export function Loader({ size = 'md', label = 'Cargando...', fullScreen = false }) {
  const content = (
    <div className={styles.wrapper} role="status" aria-label={label}>
      <div className={`${styles.spinner} ${styles[size]}`} aria-hidden="true">
        <div className={styles.ring} />
        <div className={`${styles.ring} ${styles.ringDelay}`} />
      </div>
      <span className={styles.srOnly}>{label}</span>
    </div>
  )

  if (fullScreen) {
    return (
      <div className={styles.overlay}>
        {content}
      </div>
    )
  }

  return content
}
