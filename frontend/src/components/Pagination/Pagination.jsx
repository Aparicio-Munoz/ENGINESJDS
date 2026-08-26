import styles from './Pagination.module.css'

function getPageNumbers(current, total, maxVisible = 5) {
  if (total <= maxVisible) {
    return Array.from({ length: total }, (_, i) => i + 1)
  }

  const half = Math.floor(maxVisible / 2)
  let start = Math.max(1, current - half)
  let end = start + maxVisible - 1

  if (end > total) {
    end = total
    start = Math.max(1, end - maxVisible + 1)
  }

  const pages = []

  if (start > 1) {
    pages.push(1)
    if (start > 2) pages.push('...')
  }

  for (let i = start; i <= end; i++) {
    if (!pages.includes(i)) pages.push(i)
  }

  if (end < total) {
    if (end < total - 1) pages.push('...')
    pages.push(total)
  }

  return pages
}

export function Pagination({ page, totalPages, total, limit, onPageChange, disabled }) {
  if (!totalPages || totalPages <= 1) return null

  const pages = getPageNumbers(page, totalPages)

  let rangeLabel = null
  if (total != null) {
    if (limit) {
      const start = total === 0 ? 0 : (page - 1) * limit + 1
      const end = Math.min(page * limit, total)
      rangeLabel = `Mostrando ${start}–${end} de ${total} registros`
    } else {
      rangeLabel = `${total} registros`
    }
  }

  return (
    <nav className={styles.pagination} aria-label="Paginación">
      <button
        className={styles.navBtn}
        type="button"
        disabled={page <= 1 || disabled}
        onClick={() => onPageChange(page - 1)}
        aria-label="Página anterior"
      >
        <svg viewBox="0 0 20 20" fill="currentColor" width="14" height="14">
          <path fillRule="evenodd" d="M11.78 5.22a.75.75 0 0 1 0 1.06L8.06 10l3.72 3.72a.75.75 0 1 1-1.06 1.06l-4.25-4.25a.75.75 0 0 1 0-1.06l4.25-4.25a.75.75 0 0 1 1.06 0Z" clipRule="evenodd" />
        </svg>
        Anterior
      </button>

      <div className={styles.pages}>
        {pages.map((p, i) =>
          p === '...' ? (
            <span key={`ellipsis-${i}`} className={styles.ellipsis}>…</span>
          ) : (
            <button
              key={p}
              type="button"
              className={`${styles.pageBtn} ${p === page ? styles.pageBtnActive : ''}`}
              disabled={disabled}
              onClick={() => onPageChange(p)}
              aria-label={`Página ${p}`}
              aria-current={p === page ? 'page' : undefined}
            >
              {p}
            </button>
          )
        )}
      </div>

      <button
        className={styles.navBtn}
        type="button"
        disabled={page >= totalPages || disabled}
        onClick={() => onPageChange(page + 1)}
        aria-label="Página siguiente"
      >
        Siguiente
        <svg viewBox="0 0 20 20" fill="currentColor" width="14" height="14">
          <path fillRule="evenodd" d="M8.22 5.22a.75.75 0 0 1 1.06 0l4.25 4.25a.75.75 0 0 1 0 1.06l-4.25 4.25a.75.75 0 0 1-1.06-1.06L11.94 10 8.22 6.28a.75.75 0 0 1 0-1.06Z" clipRule="evenodd" />
        </svg>
      </button>

      {rangeLabel ? (
        <span className={styles.info}>{rangeLabel}</span>
      ) : null}
    </nav>
  )
}
