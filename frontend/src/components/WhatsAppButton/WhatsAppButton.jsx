import { useState } from 'react'
import styles from './WhatsAppButton.module.css'

const CONTACTS = [
  { label: 'Línea 1', number: '573183531500', display: '318 353 1500' },
  { label: 'Línea 2', number: '573008909195', display: '300 890 9195' },
]

export function WhatsAppButton() {
  const [open, setOpen] = useState(false)

  return (
    <div className={styles.wrapper}>
      {open ? (
        <>
          <div
            className={styles.overlay}
            role="presentation"
            onClick={() => setOpen(false)}
          />
          <div className={styles.menu} role="menu">
            <p className={styles.menuTitle}>¿Necesitas ayuda?</p>
            {CONTACTS.map((c) => (
              <a
                key={c.number}
                href={`https://wa.me/${c.number}`}
                target="_blank"
                rel="noopener noreferrer"
                className={styles.menuItem}
                role="menuitem"
                onClick={() => setOpen(false)}
              >
                <span className={styles.menuItemIcon} aria-hidden="true">💬</span>
                <span>
                  <strong>{c.label}</strong>
                  <br />
                  <span className={styles.menuItemNumber}>{c.display}</span>
                </span>
              </a>
            ))}
          </div>
        </>
      ) : null}

      <button
        className={styles.fab}
        type="button"
        aria-label="Contactar por WhatsApp"
        aria-expanded={open}
        onClick={() => setOpen((prev) => !prev)}
      >
        <span className={styles.onlineBadge} aria-hidden="true" />
        <svg
          viewBox="0 0 24 24"
          fill="currentColor"
          width="26"
          height="26"
          aria-hidden="true"
        >
          <path d="M12 2C6.486 2 2 6.486 2 12c0 1.787.475 3.547 1.376 5.098L2.05 21.4a.75.75 0 0 0 .916.916l4.302-1.326A9.963 9.963 0 0 0 12 22c5.514 0 10-4.486 10-10S17.514 2 12 2zm5.07 12.889c-.221.623-1.299 1.19-1.781 1.264-.489.075-.962.089-1.449-.085-.333-.116-.757-.27-1.289-.499-2.261-.977-3.739-3.293-3.852-3.444-.111-.152-.906-1.205-.906-2.3s.568-1.629.771-1.855c.199-.22.434-.275.578-.275l.418.008c.134.006.313-.051.489.373.18.435.613 1.495.667 1.604.054.108.09.235.018.379-.073.144-.109.233-.217.358-.108.125-.228.28-.325.377-.108.108-.221.224-.095.439.126.215.561.928 1.204 1.503.828.737 1.525.965 1.74 1.073.215.108.341.09.468-.054.126-.143.541-.627.686-.843.143-.215.287-.179.487-.108.198.072 1.256.592 1.472.7.215.108.357.161.411.251.054.09.054.521-.167 1.144z" />
        </svg>
      </button>
    </div>
  )
}
