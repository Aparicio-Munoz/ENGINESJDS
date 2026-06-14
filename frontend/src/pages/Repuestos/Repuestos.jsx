import { useState } from 'react'
import styles from './Repuestos.module.css'

const CATEGORIES = [
  {
    id: 'aceites',
    label: 'Aceites',
    description: 'Lubricantes minerales, sintéticos y semisintéticos para motores de 2T y 4T. Cambia tu aceite a tiempo y protege el corazón de tu moto.',
    brands: ['Motul', 'Castrol', 'Yamalube', 'Repsol'],
    priceFrom: 18000,
    accentColor: '#F59E0B',
  },
  {
    id: 'llantas',
    label: 'Llantas',
    description: 'Neumáticos para uso urbano, sport y todoterreno. Disponibles en múltiples medidas para las marcas más populares del mercado.',
    brands: ['Pirelli', 'Michelin', 'Maxxis', 'IRC'],
    priceFrom: 85000,
    accentColor: '#6366F1',
  },
  {
    id: 'frenos',
    label: 'Pastillas de freno',
    description: 'Pastillas y discos de alto rendimiento para frenadas seguras y progresivas. Compatibles con motos de calle y enduro.',
    brands: ['Brembo', 'EBC', 'Galfer', 'Ferodo'],
    priceFrom: 25000,
    accentColor: '#EF4444',
  },
  {
    id: 'filtros',
    label: 'Filtros',
    description: 'Filtros de aire, aceite y combustible de larga duración. Mantén tu motor respirando limpio con las mejores marcas.',
    brands: ['Champion', 'K&N', 'Mann', 'NGK'],
    priceFrom: 12000,
    accentColor: '#10B981',
  },
  {
    id: 'baterias',
    label: 'Baterías',
    description: 'Baterías de gel y ácido libre de mantenimiento para motos de cualquier cilindraje. Arranque garantizado.',
    brands: ['Yuasa', 'Lucas', 'Moura', 'Bosch'],
    priceFrom: 90000,
    accentColor: '#3B82F6',
  },
  {
    id: 'accesorios',
    label: 'Accesorios',
    description: 'Espejos, maniguetas, cadenas, protectores y más. Todo lo que necesitas para mantener tu moto en perfecto estado.',
    brands: ['Pro Taper', 'Renthal', 'Rizoma', 'SW-Motech'],
    priceFrom: 8000,
    accentColor: '#8B5CF6',
  },
]

const CATEGORY_ICONS = {
  aceites: (
    <svg viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg" width="32" height="32" aria-hidden="true">
      <path d="M24 6C24 6 14 18 14 27a10 10 0 0 0 20 0C34 18 24 6 24 6Z" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/>
      <path d="M18 30a6 6 0 0 0 6 6" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"/>
    </svg>
  ),
  llantas: (
    <svg viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg" width="32" height="32" aria-hidden="true">
      <circle cx="24" cy="24" r="16" stroke="currentColor" strokeWidth="2.5"/>
      <circle cx="24" cy="24" r="6" stroke="currentColor" strokeWidth="2.5"/>
      <path d="M24 8v4M24 36v4M8 24h4M36 24h4M12.1 12.1l2.83 2.83M33.07 33.07l2.83 2.83M35.9 12.1l-2.83 2.83M14.93 33.07l-2.83 2.83" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
    </svg>
  ),
  frenos: (
    <svg viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg" width="32" height="32" aria-hidden="true">
      <circle cx="24" cy="24" r="16" stroke="currentColor" strokeWidth="2.5"/>
      <circle cx="24" cy="24" r="8" stroke="currentColor" strokeWidth="2.5"/>
      <path d="M24 10v6M24 32v6M10 24h6M32 24h6" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
    </svg>
  ),
  filtros: (
    <svg viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg" width="32" height="32" aria-hidden="true">
      <path d="M10 14h28M16 24h16M21 34h6" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"/>
    </svg>
  ),
  baterias: (
    <svg viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg" width="32" height="32" aria-hidden="true">
      <rect x="6" y="14" width="36" height="24" rx="4" stroke="currentColor" strokeWidth="2.5"/>
      <path d="M16 14V10M32 14V10" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"/>
      <path d="M18 26h4M24 22v8" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"/>
      <path d="M30 26h4" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"/>
    </svg>
  ),
  accesorios: (
    <svg viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg" width="32" height="32" aria-hidden="true">
      <path d="M28.5 9.5a10 10 0 0 1 0 14.14L14.14 37.9A4 4 0 0 1 8.5 32.26L22.86 17.9A10 10 0 0 1 28.5 9.5Z" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/>
      <path d="M38.5 19.5l-10-10" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"/>
      <circle cx="13" cy="35" r="2.5" fill="currentColor"/>
    </svg>
  ),
}

function CategoryCard({ category }) {
  return (
    <article className={styles.card}>
      <div className={styles.cardIconWrap} style={{ '--cat-color': category.accentColor }}>
        <div className={styles.cardIcon} style={{ color: category.accentColor }}>
          {CATEGORY_ICONS[category.id]}
        </div>
      </div>

      <div className={styles.cardBody}>
        <h3 className={styles.cardName}>{category.label}</h3>
        <p className={styles.cardDesc}>{category.description}</p>

        <div className={styles.brandsSection}>
          <span className={styles.brandsLabel}>Marcas disponibles</span>
          <div className={styles.brandsList}>
            {category.brands.map((brand) => (
              <span key={brand} className={styles.brandPill}>{brand}</span>
            ))}
          </div>
        </div>

        <div className={styles.cardFooter}>
          <div className={styles.priceFrom}>
            <span className={styles.priceLabel}>Desde</span>
            <span className={styles.priceValue}>
              ${Number(category.priceFrom).toLocaleString('es-CO')}
            </span>
          </div>
          <div className={styles.availableDot}>
            <span className={styles.dot} aria-hidden="true" />
            Disponible
          </div>
        </div>
      </div>
    </article>
  )
}

export function Repuestos() {
  const [activeFilter, setActiveFilter] = useState('all')

  const displayed =
    activeFilter === 'all'
      ? CATEGORIES
      : CATEGORIES.filter((c) => c.id === activeFilter)

  return (
    <div className={styles.page}>
      <div className={styles.container}>

        {/* Header */}
        <div className={styles.header}>
          <span className={styles.eyebrow}>Repuestos &amp; Accesorios</span>
          <h1 className={styles.title}>
            Lo que necesitas,<br />
            <span className={styles.titleAccent}>lo tenemos para ti</span>
          </h1>
          <p className={styles.subtitle}>
            Trabajamos con las mejores marcas del mercado. Consulta disponibilidad
            y precios directamente con nuestro equipo.
          </p>
        </div>

        {/* Filter tabs */}
        <nav className={styles.filterNav} aria-label="Filtrar por categoría">
          <button
            className={`${styles.filterTab} ${activeFilter === 'all' ? styles.filterTabActive : ''}`}
            onClick={() => setActiveFilter('all')}
          >
            Todos
          </button>
          {CATEGORIES.map((cat) => (
            <button
              key={cat.id}
              className={`${styles.filterTab} ${activeFilter === cat.id ? styles.filterTabActive : ''}`}
              onClick={() => setActiveFilter(cat.id === activeFilter ? 'all' : cat.id)}
            >
              {cat.label}
            </button>
          ))}
        </nav>

        {/* Categories grid */}
        <div className={styles.grid}>
          {displayed.map((cat) => (
            <CategoryCard key={cat.id} category={cat} />
          ))}
        </div>

        {/* CTA Banner */}
        <div className={styles.ctaBanner}>
          <div className={styles.ctaContent}>
            <div className={styles.ctaIcon} aria-hidden="true">
              <svg viewBox="0 0 24 24" fill="none" width="28" height="28">
                <path d="M9.879 7.519c1.171-1.025 3.071-1.025 4.242 0 1.172 1.025 1.172 2.687 0 3.712-.203.178-.43.324-.673.439-.745.375-1.45.999-1.45 1.83v.43M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Zm-9 5.25h.008v.008H12v-.008Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </div>
            <div className={styles.ctaText}>
              <h2 className={styles.ctaTitle}>¿No encuentras el repuesto que buscas?</h2>
              <p className={styles.ctaDesc}>
                Contáctanos y te ayudamos a verificar disponibilidad. Tenemos acceso
                a un amplio catálogo de repuestos para todas las marcas.
              </p>
            </div>
          </div>
          <a
            href="https://wa.me/573183531500"
            target="_blank"
            rel="noopener noreferrer"
            className={styles.ctaButton}
          >
            <svg viewBox="0 0 20 20" fill="currentColor" width="16" height="16" aria-hidden="true">
              <path fillRule="evenodd" d="M10 2a8 8 0 1 0 3.886 15.006l3.003.838a.75.75 0 0 0 .921-.921l-.838-3.003A8 8 0 0 0 10 2ZM6.75 7.75a.75.75 0 0 0 0 1.5h6.5a.75.75 0 0 0 0-1.5h-6.5ZM6 10.75a.75.75 0 0 1 .75-.75h3.5a.75.75 0 0 1 0 1.5h-3.5a.75.75 0 0 1-.75-.75Z" clipRule="evenodd" />
            </svg>
            Consultar disponibilidad
          </a>
        </div>

      </div>
    </div>
  )
}
