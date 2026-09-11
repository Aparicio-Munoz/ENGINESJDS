import { useCallback, useEffect, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { billingApi } from '../../../api/billingApi'
import styles from './Suscripcion.module.css'

const STATUS_LABELS = {
  TRIALING: 'Período de prueba',
  ACTIVE: 'Activa',
  PAST_DUE: 'Pago pendiente',
  SUSPENDED: 'Suspendida',
  CANCELLED: 'Cancelada',
}

function formatDate(value) {
  if (!value) return '—'
  return new Date(value).toLocaleDateString('es-CO', {
    day: 'numeric', month: 'long', year: 'numeric',
  })
}

export function Suscripcion() {
  const [searchParams] = useSearchParams()
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [checkoutLoading, setCheckoutLoading] = useState(false)
  const [error, setError] = useState('')

  const loadStatus = useCallback(async () => {
    setError('')
    try {
      setData(await billingApi.getStatus())
    } catch (err) {
      setError(err.message || 'No se pudo consultar el estado de la suscripción.')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    const timer = setTimeout(() => loadStatus(), 0)
    return () => clearTimeout(timer)
  }, [loadStatus])

  async function handleCheckout() {
    setCheckoutLoading(true)
    setError('')
    try {
      const { url } = await billingApi.createCheckout()
      window.location.assign(url)
    } catch (err) {
      setError(err.message || 'No se pudo iniciar el checkout.')
      setCheckoutLoading(false)
    }
  }

  if (loading) {
    return <main className={styles.page}><div className={styles.loading}>Cargando suscripción…</div></main>
  }

  const subscription = data?.subscription
  const status = subscription?.status
  const active = status === 'TRIALING' || status === 'ACTIVE'
  const returnedFromCheckout = searchParams.get('billing') === 'success'

  return (
    <main className={styles.page}>
      <div className={styles.heading}>
        <div>
          <p className={styles.eyebrow}>Cuenta del taller</p>
          <h1>Suscripción</h1>
          <p className={styles.subtitle}>Administra el acceso de {data?.tenant?.businessName || 'tu taller'}.</p>
        </div>
        <button className={styles.refreshButton} type="button" onClick={loadStatus}>Actualizar estado</button>
      </div>

      {returnedFromCheckout ? (
        <div className={styles.success}>
          Recibimos tu regreso del proveedor. El estado se actualizará cuando llegue la confirmación del pago.
        </div>
      ) : null}
      {error ? <div className={styles.error}>{error}</div> : null}

      {!data?.enabled || data?.legacy ? (
        <section className={styles.card}>
          <h2>Modo actual</h2>
          <p>La plataforma SaaS está desactivada en este entorno. La instalación legacy continúa funcionando con su base actual.</p>
        </section>
      ) : (
        <>
          <section className={styles.card}>
            <div className={styles.cardTop}>
              <div>
                <p className={styles.cardLabel}>Plan</p>
                <h2>{subscription?.planCode || 'trial'}</h2>
              </div>
              <span className={`${styles.status} ${active ? styles.statusActive : styles.statusBlocked}`}>
                {STATUS_LABELS[status] || status || 'Sin estado'}
              </span>
            </div>

            <div className={styles.details}>
              <div><span>Prueba hasta</span><strong>{formatDate(subscription?.trialEndsAt)}</strong></div>
              <div><span>Período actual hasta</span><strong>{formatDate(subscription?.currentPeriodEnd)}</strong></div>
              <div><span>Identificador del taller</span><strong>{data?.tenant?.slug || '—'}</strong></div>
            </div>

            {data.configured ? (
              <div className={styles.actionArea}>
                <p>{active ? 'Continúa usando el sistema mientras tu plan esté vigente.' : 'Activa tu suscripción mensual para recuperar el acceso operativo.'}</p>
                <button className={styles.primaryButton} type="button" onClick={handleCheckout} disabled={checkoutLoading}>
                  {checkoutLoading ? 'Conectando con pagos…' : 'Suscribirme mensualmente'}
                </button>
              </div>
            ) : (
              <div className={styles.warning}>
                El cobro todavía no está configurado en el servidor. Define STRIPE_SECRET_KEY, STRIPE_PRICE_ID y STRIPE_WEBHOOK_SECRET para habilitarlo.
              </div>
            )}
          </section>

          <section className={styles.helpCard}>
            <strong>¿Qué ocurre al vencer el período?</strong>
            <p>El sistema conserva tus datos aislados y bloquea los módulos operativos. El administrador puede entrar aquí para renovar la cuenta.</p>
          </section>
        </>
      )}
    </main>
  )
}
