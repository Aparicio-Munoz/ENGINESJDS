import { useMemo, useState } from 'react'
import { getInventory } from '../../services/inventoryService'
import styles from './Repuestos.module.css'

const FALLBACK = []

export function Repuestos() {
  const [search, setSearch] = useState('')
  const inventory = getInventory(FALLBACK)

  const filtered = useMemo(() => {
    const q = search.toLowerCase().trim()
    if (!q) return inventory
    return inventory.filter(
      (item) =>
        item.name.toLowerCase().includes(q) ||
        item.code.toLowerCase().includes(q) ||
        (item.category && item.category.toLowerCase().includes(q)),
    )
  }, [inventory, search])

  return (
    <div className={styles.page}>
      <div className={styles.container}>
        {/* Header */}
        <div className={styles.header}>
          <span className={styles.eyebrow}>Inventario disponible</span>
          <h1 className={styles.title}>Catálogo de repuestos</h1>
          <p className={styles.subtitle}>
            Encuentra los repuestos y accesorios que necesitas para tu motocicleta.
            Stock actualizado en tiempo real.
          </p>
        </div>

        {/* Search */}
        <div className={styles.searchBar}>
          <svg className={styles.searchIcon} viewBox="0 0 20 20" fill="currentColor" width="18" height="18" aria-hidden="true">
            <path fillRule="evenodd" d="M9 3.5a5.5 5.5 0 1 0 0 11 5.5 5.5 0 0 0 0-11ZM2 9a7 7 0 1 1 12.452 4.391l3.328 3.329a.75.75 0 1 1-1.06 1.06l-3.329-3.328A7 7 0 0 1 2 9Z" clipRule="evenodd" />
          </svg>
          <input
            type="search"
            className={styles.searchInput}
            placeholder="Buscar por nombre, código o categoría..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            aria-label="Buscar repuestos"
          />
        </div>

        {/* Results */}
        {inventory.length === 0 ? (
          <div className={styles.emptyState}>
            <span className={styles.emptyIcon} aria-hidden="true">🔩</span>
            <h2 className={styles.emptyTitle}>Catálogo en preparación</h2>
            <p className={styles.emptyDesc}>
              Estamos cargando nuestro inventario. Mientras tanto, contáctanos por
              WhatsApp para consultar disponibilidad.
            </p>
            <a
              href="https://wa.me/573183531500"
              target="_blank"
              rel="noopener noreferrer"
              className={styles.emptyWhatsapp}
            >
              💬 Consultar disponibilidad
            </a>
          </div>
        ) : filtered.length === 0 ? (
          <div className={styles.emptyState}>
            <span className={styles.emptyIcon} aria-hidden="true">🔍</span>
            <h2 className={styles.emptyTitle}>Sin resultados para "{search}"</h2>
            <p className={styles.emptyDesc}>
              Intenta con otro término o contáctanos para verificar disponibilidad.
            </p>
          </div>
        ) : (
          <>
            <p className={styles.resultCount}>
              {filtered.length} {filtered.length === 1 ? 'repuesto encontrado' : 'repuestos encontrados'}
            </p>
            <div className={styles.grid}>
              {filtered.map((item) => (
                <article key={item.id} className={styles.card}>
                  <div className={styles.cardTop}>
                    <span className={styles.cardCode}>{item.code}</span>
                    <span className={`${styles.cardBadge} ${item.stock > 0 ? styles.badgeAvailable : styles.badgeOut}`}>
                      {item.stock > 0 ? `${item.stock} en stock` : 'Agotado'}
                    </span>
                  </div>
                  <h3 className={styles.cardName}>{item.name}</h3>
                  {item.category ? (
                    <span className={styles.cardCategory}>{item.category}</span>
                  ) : null}
                  <div className={styles.cardFooter}>
                    <span className={styles.cardPrice}>
                      {item.price
                        ? `$${Number(item.price).toLocaleString('es-CO')}`
                        : 'Consultar precio'}
                    </span>
                    <a
                      href={`https://wa.me/573183531500?text=Hola, me interesa el repuesto ${item.code} - ${item.name}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className={styles.cardCta}
                    >
                      Pedir
                    </a>
                  </div>
                </article>
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  )
}
