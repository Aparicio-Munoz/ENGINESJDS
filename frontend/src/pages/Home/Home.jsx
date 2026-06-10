import { useEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import heroBike from '../../assets/images/hero-bike.png'
import { ROUTES } from '../../utils/routes'
import styles from './Home.module.css'

const SERVICES = [
  {
    icon: '🔧',
    title: 'Mantenimiento preventivo',
    description: 'Cambios de aceite, filtros y revisiones programadas para mantener tu moto en óptimas condiciones.',
  },
  {
    icon: '⚡',
    title: 'Diagnóstico electrónico',
    description: 'Escáner y diagnóstico avanzado de sistemas eléctricos y electrónicos de última generación.',
  },
  {
    icon: '🏍️',
    title: 'Mecánica general',
    description: 'Reparación de motor, frenos, transmisión y suspensión con repuestos de calidad.',
  },
  {
    icon: '🎨',
    title: 'Latonería y pintura',
    description: 'Corrección de carrocería, pintura y acabados para devolver el brillo original a tu moto.',
  },
  {
    icon: '🛡️',
    title: 'Revisión SOAT / técnicomecánica',
    description: 'Preparación completa para pasar la revisión técnicomecánica sin contratiempos.',
  },
  {
    icon: '🔩',
    title: 'Personalización',
    description: 'Instalación de accesorios, luces LED, escapes y modificaciones a tu gusto.',
  },
]

const STATS = [
  { end: 500, suffix: '+', label: 'Motos atendidas' },
  { end: 8,   suffix: '+', label: 'Años de experiencia' },
  { end: 98,  suffix: '%', label: 'Clientes satisfechos' },
  { end: 24,  suffix: 'h', label: 'Tiempo promedio de entrega' },
]

function useCountUp(target, duration = 1600) {
  const [count, setCount] = useState(0)
  const [started, setStarted] = useState(false)
  const ref = useRef(null)

  useEffect(() => {
    const node = ref.current
    if (!node) return
    const observer = new IntersectionObserver(
      ([entry]) => { if (entry.isIntersecting) { setStarted(true); observer.disconnect() } },
      { threshold: 0.3 },
    )
    observer.observe(node)
    return () => observer.disconnect()
  }, [])

  useEffect(() => {
    if (!started) return
    let start = null
    const step = (ts) => {
      if (!start) start = ts
      const progress = Math.min((ts - start) / duration, 1)
      const ease = 1 - Math.pow(1 - progress, 3)
      setCount(Math.round(ease * target))
      if (progress < 1) requestAnimationFrame(step)
    }
    requestAnimationFrame(step)
  }, [started, target, duration])

  return { count, ref }
}

function AnimatedStat({ end, suffix, label }) {
  const { count, ref } = useCountUp(end)
  return (
    <div className={styles.statCard} ref={ref}>
      <span className={styles.statValue}>{count}{suffix}</span>
      <span className={styles.statLabel}>{label}</span>
    </div>
  )
}

export function Home() {
  return (
    <div className={styles.page}>
      {/* ── Hero ─────────────────────────────────────── */}
      <section className={styles.hero} aria-labelledby="hero-heading">
        <div className={styles.heroGlow} aria-hidden="true" />
        <div className={styles.heroContent}>
          <span className={styles.heroBadge}>Taller especializado en motocicletas</span>
          <h1 id="hero-heading" className={styles.heroTitle}>
            Tu motocicleta en
            <br />
            <span className={styles.heroAccent}>las mejores manos</span>
          </h1>
          <p className={styles.heroSubtitle}>
            En ENGINES JDS combinamos experiencia, tecnología y pasión para mantener
            tu moto lista para el camino. Diagnóstico preciso, repuestos de calidad,
            resultados que se notan.
          </p>
          <div className={styles.heroActions}>
            <Link to={ROUTES.agendarCita} className={styles.heroCta}>
              Agendar cita ahora
              <svg viewBox="0 0 20 20" fill="currentColor" width="18" height="18" aria-hidden="true">
                <path fillRule="evenodd" d="M3 10a.75.75 0 0 1 .75-.75h10.638L10.23 5.29a.75.75 0 1 1 1.04-1.08l5.5 5.25a.75.75 0 0 1 0 1.08l-5.5 5.25a.75.75 0 1 1-1.04-1.08l4.158-3.96H3.75A.75.75 0 0 1 3 10Z" clipRule="evenodd" />
              </svg>
            </Link>
            <a href="/#servicios" className={styles.heroSecondary}>
              Ver servicios
            </a>
          </div>
        </div>
        <div className={styles.heroVisual} aria-hidden="true">
          <div className={styles.heroHalo} />
          <div className={styles.heroHaloRing} />
          <div className={styles.heroBikeWrapper}>
            <img
              src={heroBike}
              alt="Motocicleta deportiva ENGINES JDS"
              className={styles.heroBikeImg}
              draggable={false}
            />
          </div>
          <div className={styles.heroGroundGlow} />
        </div>
      </section>

      {/* ── Stats ────────────────────────────────────── */}
      <section className={styles.statsSection} aria-label="Estadísticas">
        <div className={styles.container}>
          <div className={styles.statsGrid}>
            {STATS.map((s) => (
              <AnimatedStat key={s.label} end={s.end} suffix={s.suffix} label={s.label} />
            ))}
          </div>
        </div>
      </section>

      {/* ── Services ─────────────────────────────────── */}
      <section id="servicios" className={styles.servicesSection} aria-labelledby="services-heading">
        <div className={styles.container}>
          <div className={styles.sectionHeader}>
            <span className={styles.sectionEyebrow}>Lo que hacemos</span>
            <h2 id="services-heading" className={styles.sectionTitle}>
              Servicios especializados
            </h2>
            <p className={styles.sectionSubtitle}>
              Contamos con técnicos certificados y equipos de diagnóstico de última
              generación para todo tipo de motocicletas.
            </p>
          </div>
          <div className={styles.servicesGrid}>
            {SERVICES.map((s) => (
              <article key={s.title} className={styles.serviceCard}>
                <span className={styles.serviceIcon} aria-hidden="true">{s.icon}</span>
                <h3 className={styles.serviceTitle}>{s.title}</h3>
                <p className={styles.serviceDesc}>{s.description}</p>
              </article>
            ))}
          </div>
        </div>
      </section>

      {/* ── Products teaser ──────────────────────────── */}
      <section className={styles.productsSection} aria-labelledby="products-heading">
        <div className={styles.container}>
          <div className={styles.productsBanner}>
            <div className={styles.productsText}>
              <span className={styles.sectionEyebrow}>Repuestos & accesorios</span>
              <h2 id="products-heading" className={styles.productsBannerTitle}>
                Catálogo disponible en línea
              </h2>
              <p className={styles.productsBannerDesc}>
                Consulta nuestro inventario de repuestos originales y accesorios
                para tu motocicleta. Stock actualizado en tiempo real.
              </p>
              <Link to={ROUTES.repuestos} className={styles.productsLink}>
                Ver catálogo completo
                <svg viewBox="0 0 20 20" fill="currentColor" width="16" height="16" aria-hidden="true">
                  <path fillRule="evenodd" d="M3 10a.75.75 0 0 1 .75-.75h10.638L10.23 5.29a.75.75 0 1 1 1.04-1.08l5.5 5.25a.75.75 0 0 1 0 1.08l-5.5 5.25a.75.75 0 1 1-1.04-1.08l4.158-3.96H3.75A.75.75 0 0 1 3 10Z" clipRule="evenodd" />
                </svg>
              </Link>
            </div>
            <div className={styles.productsIllustration} aria-hidden="true">
              <div className={styles.productsOrb} />
              <span className={styles.productsEmoji}>🔩</span>
            </div>
          </div>
        </div>
      </section>

      {/* ── Contact ──────────────────────────────────── */}
      <section id="contacto" className={styles.contactSection} aria-labelledby="contact-heading">
        <div className={styles.container}>
          <div className={styles.sectionHeader}>
            <span className={styles.sectionEyebrow}>Contáctanos</span>
            <h2 id="contact-heading" className={styles.sectionTitle}>¿Listo para empezar?</h2>
            <p className={styles.sectionSubtitle}>
              Escríbenos por WhatsApp o agenda tu cita directamente en línea.
              Respuesta garantizada en menos de 1 hora.
            </p>
          </div>
          <div className={styles.contactGrid}>
            <a
              href="https://wa.me/573183531500"
              target="_blank"
              rel="noopener noreferrer"
              className={styles.contactCard}
            >
              <span className={styles.contactCardIcon} aria-hidden="true">💬</span>
              <div>
                <strong className={styles.contactCardTitle}>WhatsApp Línea 1</strong>
                <span className={styles.contactCardNumber}>318 353 1500</span>
              </div>
              <svg className={styles.contactCardArrow} viewBox="0 0 20 20" fill="currentColor" width="18" height="18" aria-hidden="true">
                <path fillRule="evenodd" d="M3 10a.75.75 0 0 1 .75-.75h10.638L10.23 5.29a.75.75 0 1 1 1.04-1.08l5.5 5.25a.75.75 0 0 1 0 1.08l-5.5 5.25a.75.75 0 1 1-1.04-1.08l4.158-3.96H3.75A.75.75 0 0 1 3 10Z" clipRule="evenodd" />
              </svg>
            </a>
            <a
              href="https://wa.me/573008909195"
              target="_blank"
              rel="noopener noreferrer"
              className={styles.contactCard}
            >
              <span className={styles.contactCardIcon} aria-hidden="true">💬</span>
              <div>
                <strong className={styles.contactCardTitle}>WhatsApp Línea 2</strong>
                <span className={styles.contactCardNumber}>300 890 9195</span>
              </div>
              <svg className={styles.contactCardArrow} viewBox="0 0 20 20" fill="currentColor" width="18" height="18" aria-hidden="true">
                <path fillRule="evenodd" d="M3 10a.75.75 0 0 1 .75-.75h10.638L10.23 5.29a.75.75 0 1 1 1.04-1.08l5.5 5.25a.75.75 0 0 1 0 1.08l-5.5 5.25a.75.75 0 1 1-1.04-1.08l4.158-3.96H3.75A.75.75 0 0 1 3 10Z" clipRule="evenodd" />
              </svg>
            </a>
            <Link to={ROUTES.agendarCita} className={`${styles.contactCard} ${styles.contactCardAccent}`}>
              <span className={styles.contactCardIcon} aria-hidden="true">📅</span>
              <div>
                <strong className={styles.contactCardTitle}>Agendar cita</strong>
                <span className={styles.contactCardNumber}>Reserva en línea</span>
              </div>
              <svg className={styles.contactCardArrow} viewBox="0 0 20 20" fill="currentColor" width="18" height="18" aria-hidden="true">
                <path fillRule="evenodd" d="M3 10a.75.75 0 0 1 .75-.75h10.638L10.23 5.29a.75.75 0 1 1 1.04-1.08l5.5 5.25a.75.75 0 0 1 0 1.08l-5.5 5.25a.75.75 0 1 1-1.04-1.08l4.158-3.96H3.75A.75.75 0 0 1 3 10Z" clipRule="evenodd" />
              </svg>
            </Link>
          </div>
        </div>
      </section>

      {/* ── Footer ───────────────────────────────────── */}
      <footer className={styles.footer} role="contentinfo">
        <div className={styles.container}>
          <div className={styles.footerInner}>
            <div className={styles.footerBrand}>
              <span className={styles.footerMark} aria-hidden="true">◈</span>
              ENGINES JDS
            </div>
            <p className={styles.footerTagline}>
              Taller especializado en motocicletas · Bogotá, Colombia
            </p>
            <p className={styles.footerCopy}>
              © {new Date().getFullYear()} ENGINES JDS. Todos los derechos reservados.
            </p>
          </div>
        </div>
      </footer>
    </div>
  )
}
