import { useEffect, useRef, useState } from 'react'
import { brandsApi } from '../../api'
import styles from './Repuestos.module.css'

// Categorías del catálogo — el orden y color de acento se definen aquí
const CATEGORIES = [
  { name: 'Aceites',     color: '#F59E0B', desc: 'Lubricantes minerales, sintéticos y semisintéticos para motores 2T y 4T.' },
  { name: 'Filtros',     color: '#10B981', desc: 'Filtros de aire, aceite y combustible de larga duración.' },
  { name: 'Llantas',     color: '#6366F1', desc: 'Neumáticos urbanos, sport y todoterreno en múltiples medidas.' },
  { name: 'Baterías',    color: '#3B82F6', desc: 'Baterías de gel y ácido libre de mantenimiento. Arranque garantizado.' },
  { name: 'Pastillas',   color: '#EF4444', desc: 'Pastillas y discos de freno de alto rendimiento para frenadas seguras.' },
  { name: 'Accesorios',  color: '#8B5CF6', desc: 'Espejos, maniguetas, cadenas, protectores y mucho más.' },
  { name: 'Lubricantes', color: '#F97316', desc: 'Grasas, limpiadores de cadena y lubricantes especializados.' },
  { name: 'Eléctricos',  color: '#06B6D4', desc: 'Bujías, reguladores, cableado y componentes eléctricos.' },
]

const CATEGORY_ICONS = {
  Aceites: (
    <svg viewBox="0 0 48 48" fill="none" width="32" height="32" aria-hidden="true">
      <path d="M24 6C24 6 14 18 14 27a10 10 0 0 0 20 0C34 18 24 6 24 6Z" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/>
      <path d="M18 30a6 6 0 0 0 6 6" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"/>
    </svg>
  ),
  Filtros: (
    <svg viewBox="0 0 48 48" fill="none" width="32" height="32" aria-hidden="true">
      <path d="M10 14h28M16 24h16M21 34h6" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"/>
    </svg>
  ),
  Llantas: (
    <svg viewBox="0 0 48 48" fill="none" width="32" height="32" aria-hidden="true">
      <circle cx="24" cy="24" r="16" stroke="currentColor" strokeWidth="2.5"/>
      <circle cx="24" cy="24" r="6" stroke="currentColor" strokeWidth="2.5"/>
      <path d="M24 8v4M24 36v4M8 24h4M36 24h4M12.1 12.1l2.83 2.83M33.07 33.07l2.83 2.83M35.9 12.1l-2.83 2.83M14.93 33.07l-2.83 2.83" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
    </svg>
  ),
  Baterías: (
    <svg viewBox="0 0 48 48" fill="none" width="32" height="32" aria-hidden="true">
      <rect x="6" y="14" width="36" height="24" rx="4" stroke="currentColor" strokeWidth="2.5"/>
      <path d="M16 14V10M32 14V10" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"/>
      <path d="M18 26h4M24 22v8" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"/>
      <path d="M30 26h4" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"/>
    </svg>
  ),
  Pastillas: (
    <svg viewBox="0 0 48 48" fill="none" width="32" height="32" aria-hidden="true">
      <circle cx="24" cy="24" r="16" stroke="currentColor" strokeWidth="2.5"/>
      <circle cx="24" cy="24" r="8" stroke="currentColor" strokeWidth="2.5"/>
      <path d="M24 10v6M24 32v6M10 24h6M32 24h6" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
    </svg>
  ),
  Accesorios: (
    <svg viewBox="0 0 48 48" fill="none" width="32" height="32" aria-hidden="true">
      <path d="M28.5 9.5a10 10 0 0 1 0 14.14L14.14 37.9A4 4 0 0 1 8.5 32.26L22.86 17.9A10 10 0 0 1 28.5 9.5Z" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/>
      <path d="M38.5 19.5l-10-10" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"/>
      <circle cx="13" cy="35" r="2.5" fill="currentColor"/>
    </svg>
  ),
  Lubricantes: (
    <svg viewBox="0 0 48 48" fill="none" width="32" height="32" aria-hidden="true">
      <path d="M18 8h8v8l6 6v18a2 2 0 0 1-2 2H14a2 2 0 0 1-2-2V22l6-6V8Z" stroke="currentColor" strokeWidth="2.5" strokeLinejoin="round"/>
      <path d="M16 8h12" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"/>
      <path d="M18 30h8" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"/>
    </svg>
  ),
  Eléctricos: (
    <svg viewBox="0 0 48 48" fill="none" width="32" height="32" aria-hidden="true">
      <path d="M26 6L12 26h10l-2 16 16-22H26l2-14Z" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
  ),
}

function fmtPrice(n) {
  return `$ ${Number(n).toLocaleString('es-CO')}`
}

export function Repuestos() {
  // view: 'categories' | 'brands' | 'products'
  const [view, setView] = useState('categories')
  const [selectedCategory, setSelectedCategory] = useState(null)
  const [selectedBrand, setSelectedBrand] = useState(null)

  const [brandsByCategory, setBrandsByCategory] = useState({})
  const [brandsLoading, setBrandsLoading] = useState(true)

  const [products, setProducts] = useState([])
  const [productsLoading, setProductsLoading] = useState(false)

  const mountedRef = useRef(true)

  useEffect(() => {
    mountedRef.current = true
    brandsApi.getPublicBrands()
      .then((grouped) => { if (mountedRef.current) setBrandsByCategory(grouped ?? {}) })
      .catch(() => { if (mountedRef.current) setBrandsByCategory({}) })
      .finally(() => { if (mountedRef.current) setBrandsLoading(false) })
    return () => { mountedRef.current = false }
  }, [])

  function openCategory(catName) {
    setSelectedCategory(catName)
    setSelectedBrand(null)
    setView('brands')
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  async function openBrand(brandName) {
    setSelectedBrand(brandName)
    setView('products')
    setProductsLoading(true)
    setProducts([])
    window.scrollTo({ top: 0, behavior: 'smooth' })
    try {
      const data = await brandsApi.getPublicProducts({ brand: brandName, category: selectedCategory })
      if (mountedRef.current) setProducts(data ?? [])
    } catch {
      if (mountedRef.current) setProducts([])
    } finally {
      if (mountedRef.current) setProductsLoading(false)
    }
  }

  function backToCategories() {
    setView('categories')
    setSelectedCategory(null)
    setSelectedBrand(null)
  }

  function backToBrands() {
    setView('brands')
    setSelectedBrand(null)
    setProducts([])
  }

  const categoryColor = CATEGORIES.find((c) => c.name === selectedCategory)?.color ?? '#F97316'
  const brandsForCategory = selectedCategory ? (brandsByCategory[selectedCategory] ?? []) : []

  return (
    <div className={styles.page}>
      <div className={styles.container}>

        {/* ── Header ───────────────────────────────────── */}
        <div className={styles.header}>
          <span className={styles.eyebrow}>Repuestos &amp; Accesorios</span>
          <h1 className={styles.title}>
            Lo que necesitas,<br />
            <span className={styles.titleAccent}>lo tenemos para ti</span>
          </h1>
          <p className={styles.subtitle}>
            Explora nuestro catálogo por categoría y descubre las marcas y productos disponibles.
          </p>
        </div>

        {/* ── Breadcrumb (en vistas internas) ──────────── */}
        {view !== 'categories' ? (
          <nav className={styles.breadcrumb} aria-label="Ruta de navegación">
            <button className={styles.crumbLink} type="button" onClick={backToCategories}>
              Repuestos
            </button>
            <span className={styles.crumbSep}>/</span>
            {view === 'brands' ? (
              <span className={styles.crumbCurrent}>{selectedCategory}</span>
            ) : (
              <>
                <button className={styles.crumbLink} type="button" onClick={backToBrands}>
                  {selectedCategory}
                </button>
                <span className={styles.crumbSep}>/</span>
                <span className={styles.crumbCurrent}>{selectedBrand}</span>
              </>
            )}
          </nav>
        ) : null}

        {/* ════════════ VISTA: CATEGORÍAS ════════════ */}
        {view === 'categories' ? (
          <div className={styles.grid}>
            {CATEGORIES.map((cat) => {
              const count = (brandsByCategory[cat.name] ?? []).length
              return (
                <button
                  key={cat.name}
                  className={styles.catCard}
                  style={{ '--cat-color': cat.color }}
                  onClick={() => openCategory(cat.name)}
                  type="button"
                >
                  <div className={styles.cardIconWrap}>
                    <div className={styles.cardIcon} style={{ color: cat.color }}>
                      {CATEGORY_ICONS[cat.name]}
                    </div>
                  </div>
                  <div className={styles.cardBody}>
                    <h3 className={styles.cardName}>{cat.name}</h3>
                    <p className={styles.cardDesc}>{cat.desc}</p>
                    <div className={styles.cardFooter}>
                      <span className={styles.brandCount}>
                        {brandsLoading ? 'Cargando…' : `${count} marca${count !== 1 ? 's' : ''}`}
                      </span>
                      <span className={styles.viewMore}>
                        Ver marcas
                        <svg viewBox="0 0 20 20" fill="currentColor" width="14" height="14" aria-hidden="true">
                          <path fillRule="evenodd" d="M8.22 5.22a.75.75 0 0 1 1.06 0l4.25 4.25a.75.75 0 0 1 0 1.06l-4.25 4.25a.75.75 0 0 1-1.06-1.06L11.94 10 8.22 6.28a.75.75 0 0 1 0-1.06Z" clipRule="evenodd" />
                        </svg>
                      </span>
                    </div>
                  </div>
                </button>
              )
            })}
          </div>
        ) : null}

        {/* ════════════ VISTA: MARCAS ════════════ */}
        {view === 'brands' ? (
          <>
            <div className={styles.sectionHead} style={{ '--cat-color': categoryColor }}>
              <div className={styles.sectionIcon} style={{ color: categoryColor }}>
                {CATEGORY_ICONS[selectedCategory]}
              </div>
              <div>
                <h2 className={styles.sectionTitle}>{selectedCategory}</h2>
                <p className={styles.sectionSub}>Selecciona una marca para ver los productos disponibles.</p>
              </div>
            </div>

            {brandsForCategory.length === 0 ? (
              <div className={styles.emptyState}>
                <p>No hay marcas disponibles en esta categoría por el momento.</p>
                <button className={styles.backBtn} type="button" onClick={backToCategories}>
                  Volver a categorías
                </button>
              </div>
            ) : (
              <div className={styles.brandGrid}>
                {brandsForCategory.map((brand) => (
                  <button
                    key={brand.id}
                    className={styles.brandCard}
                    style={{ '--cat-color': categoryColor }}
                    type="button"
                    onClick={() => openBrand(brand.name)}
                  >
                    <span className={styles.brandInitial} style={{ color: categoryColor }}>
                      {brand.name.charAt(0)}
                    </span>
                    <span className={styles.brandCardName}>{brand.name}</span>
                    <svg className={styles.brandArrow} viewBox="0 0 20 20" fill="currentColor" width="16" height="16" aria-hidden="true">
                      <path fillRule="evenodd" d="M8.22 5.22a.75.75 0 0 1 1.06 0l4.25 4.25a.75.75 0 0 1 0 1.06l-4.25 4.25a.75.75 0 0 1-1.06-1.06L11.94 10 8.22 6.28a.75.75 0 0 1 0-1.06Z" clipRule="evenodd" />
                    </svg>
                  </button>
                ))}
              </div>
            )}
          </>
        ) : null}

        {/* ════════════ VISTA: PRODUCTOS ════════════ */}
        {view === 'products' ? (
          <>
            <div className={styles.sectionHead} style={{ '--cat-color': categoryColor }}>
              <div className={styles.sectionIcon} style={{ color: categoryColor }}>
                {CATEGORY_ICONS[selectedCategory]}
              </div>
              <div>
                <h2 className={styles.sectionTitle}>{selectedBrand}</h2>
                <p className={styles.sectionSub}>Productos disponibles · {selectedCategory}</p>
              </div>
            </div>

            {productsLoading ? (
              <div className={styles.loadingState}>
                <div className={styles.spinner} />
                <p>Cargando productos…</p>
              </div>
            ) : products.length === 0 ? (
              <div className={styles.emptyState}>
                <p>No hay productos disponibles de <strong>{selectedBrand}</strong> en este momento.</p>
                <p className={styles.emptyHint}>Consulta disponibilidad directamente con nuestro equipo.</p>
                <a
                  href="https://wa.me/573183531500"
                  target="_blank"
                  rel="noopener noreferrer"
                  className={styles.ctaButton}
                >
                  Consultar por WhatsApp
                </a>
              </div>
            ) : (
              <div className={styles.productGrid}>
                {products.map((p) => (
                  <article key={p.id} className={styles.productCard}>
                    <div className={styles.productImageWrap}>
                      {p.image_url ? (
                        <img src={p.image_url} alt={p.name} className={styles.productImage} loading="lazy" />
                      ) : (
                        <div className={styles.productPlaceholder} style={{ color: categoryColor }}>
                          {CATEGORY_ICONS[p.category] ?? CATEGORY_ICONS[selectedCategory]}
                        </div>
                      )}
                      <span className={styles.availBadge}>Disponible</span>
                    </div>
                    <div className={styles.productInfo}>
                      <span className={styles.productBrand}>{p.brand}</span>
                      <h3 className={styles.productName}>{p.name}</h3>
                      {p.description ? <p className={styles.productDesc}>{p.description}</p> : null}
                      <div className={styles.productFooter}>
                        <span className={styles.productPrice}>{fmtPrice(p.sale_price)}</span>
                        <span className={styles.productUnit}>/ {p.unit}</span>
                      </div>
                    </div>
                  </article>
                ))}
              </div>
            )}
          </>
        ) : null}

        {/* ── CTA Banner (solo en vista de categorías) ── */}
        {view === 'categories' ? (
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
        ) : null}

      </div>
    </div>
  )
}
