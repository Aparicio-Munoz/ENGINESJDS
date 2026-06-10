import { useMemo, useState } from 'react'
import { getInventory } from '../../services/inventoryService'
import styles from './Repuestos.module.css'

const FALLBACK = []

const STATUS_CONFIG = {
  Disponible: { label: 'Disponible', cls: styles.badgeAvailable },
  'Stock bajo': { label: 'Stock bajo', cls: styles.badgeWarn },
  Agotado: { label: 'Agotado', cls: styles.badgeOut },
}

function RepuestoCard({ item }) {
  const [imgError, setImgError] = useState(false)
  const badge = STATUS_CONFIG[item.status] ?? STATUS_CONFIG.Disponible
  const isOut = item.status === 'Agotado'

  const waMessage = encodeURIComponent(
    `Hola, me interesa el repuesto ${item.code} - ${item.name}. ¿Está disponible?`,
  )
  const waUrl = `https://wa.me/573183531500?text=${waMessage}`

  return (
    <article className={`${styles.card} ${isOut ? styles.cardOut : ''}`}>
      <div className={styles.cardImage}>
        {item.imageUrl && !imgError ? (
          <img
            src={item.imageUrl}
            alt={item.name}
            className={styles.productImg}
            onError={() => setImgError(true)}
            loading="lazy"
          />
        ) : (
          <div className={styles.imgPlaceholder} aria-hidden="true">
            <svg viewBox="0 0 48 48" fill="none" width="40" height="40">
              <rect width="48" height="48" rx="10" fill="#F1F5F9" />
              <path d="M14 34l8-10 6 7 4-5 6 8H14Z" fill="#CBD5E1" />
              <circle cx="32" cy="18" r="4" fill="#CBD5E1" />
            </svg>
          </div>
        )}
        <span className={`${styles.cardBadge} ${badge.cls}`}>{badge.label}</span>
      </div>

      <div className={styles.cardBody}>
        <span className={styles.cardCode}>{item.code}</span>
        <h3 className={styles.cardName}>{item.name}</h3>
        {item.brand ? <span className={styles.cardBrand}>{item.brand}</span> : null}

        <div className={styles.cardFooter}>
          <span className={styles.cardPrice}>
            {item.price
              ? `$${Number(item.price).toLocaleString('es-CO')}`
              : 'Consultar precio'}
          </span>
          {isOut ? (
            <span className={styles.outLabel}>Sin stock</span>
          ) : (
            <a
              href={waUrl}
              target="_blank"
              rel="noopener noreferrer"
              className={styles.cardCta}
              aria-label={`Pedir ${item.name} por WhatsApp`}
            >
              <svg viewBox="0 0 20 20" fill="currentColor" width="14" height="14" aria-hidden="true">
                <path fillRule="evenodd" d="M10 2a8 8 0 1 0 3.886 15.006l3.003.838a.75.75 0 0 0 .921-.921l-.838-3.003A8 8 0 0 0 10 2ZM6.75 7.75a.75.75 0 0 0 0 1.5h6.5a.75.75 0 0 0 0-1.5h-6.5ZM6 10.75a.75.75 0 0 1 .75-.75h3.5a.75.75 0 0 1 0 1.5h-3.5a.75.75 0 0 1-.75-.75Z" clipRule="evenodd" />
              </svg>
              Pedir por WhatsApp
            </a>
          )}
        </div>
      </div>
    </article>
  )
}

export function Repuestos() {
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('')
  const inventory = getInventory(FALLBACK)

  const filtered = useMemo(() => {
    const q = search.toLowerCase().trim()
    return inventory.filter((item) => {
      const matchSearch =
        !q ||
        item.name?.toLowerCase().includes(q) ||
        item.code?.toLowerCase().includes(q) ||
        item.brand?.toLowerCase().includes(q)
      const matchStatus = !statusFilter || item.status === statusFilter
      return matchSearch && matchStatus
    })
  }, [inventory, search, statusFilter])

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

        {/* Filters */}
        <div className={styles.searchBar}>
          <div className={styles.searchWrapper}>
            <svg className={styles.searchIcon} viewBox="0 0 20 20" fill="currentColor" width="18" height="18" aria-hidden="true">
              <path fillRule="evenodd" d="M9 3.5a5.5 5.5 0 1 0 0 11 5.5 5.5 0 0 0 0-11ZM2 9a7 7 0 1 1 12.452 4.391l3.328 3.329a.75.75 0 1 1-1.06 1.06l-3.329-3.328A7 7 0 0 1 2 9Z" clipRule="evenodd" />
            </svg>
            <input
              type="search"
              className={styles.searchInput}
              placeholder="Buscar por nombre, código o marca..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              aria-label="Buscar repuestos"
            />
          </div>
          <select
            className={styles.filterSelect}
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            aria-label="Filtrar por disponibilidad"
          >
            <option value="">Todos</option>
            <option value="Disponible">Disponible</option>
            <option value="Stock bajo">Stock bajo</option>
            <option value="Agotado">Agotado</option>
          </select>
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
                <RepuestoCard key={item.id} item={item} />
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  )
}
