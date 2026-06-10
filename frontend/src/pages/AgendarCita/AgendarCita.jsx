import { useState } from 'react'
import { getAppointments, saveAppointments } from '../../services/appointmentsService'
import styles from './AgendarCita.module.css'

const SERVICES_LIST = [
  'Mantenimiento preventivo',
  'Cambio de aceite',
  'Diagnóstico electrónico',
  'Reparación de motor',
  'Frenos y suspensión',
  'Latonería y pintura',
  'Revisión técnicomecánica',
  'Instalación de accesorios',
  'Otro',
]

const INITIAL = {
  name: '',
  phone: '',
  email: '',
  plate: '',
  brand: '',
  service: '',
  date: '',
  time: '',
  notes: '',
}

export function AgendarCita() {
  const [form, setForm] = useState(INITIAL)
  const [errors, setErrors] = useState({})
  const [submitted, setSubmitted] = useState(false)

  function validate(data) {
    const e = {}
    if (!data.name.trim()) e.name = 'El nombre es requerido'
    if (!data.phone.trim()) e.phone = 'El teléfono es requerido'
    if (!data.plate.trim()) e.plate = 'La placa es requerida'
    if (!data.brand.trim()) e.brand = 'La marca/modelo es requerida'
    if (!data.service) e.service = 'Selecciona un servicio'
    if (!data.date) e.date = 'La fecha es requerida'
    if (!data.time) e.time = 'La hora es requerida'
    return e
  }

  function handleChange(e) {
    const { name, value } = e.target
    setForm((prev) => ({ ...prev, [name]: value }))
    if (errors[name]) setErrors((prev) => ({ ...prev, [name]: '' }))
  }

  function handleSubmit(e) {
    e.preventDefault()
    const validationErrors = validate(form)
    if (Object.keys(validationErrors).length > 0) {
      setErrors(validationErrors)
      return
    }
    const appointment = {
      id: crypto.randomUUID(),
      ...form,
      createdAt: new Date().toISOString(),
      status: 'Pendiente',
    }
    const existing = getAppointments()
    saveAppointments([...existing, appointment])
    setSubmitted(true)
  }

  function handleReset() {
    setForm(INITIAL)
    setErrors({})
    setSubmitted(false)
  }

  if (submitted) {
    return (
      <div className={styles.page}>
        <div className={styles.container}>
          <div className={styles.successCard}>
            <span className={styles.successIcon} aria-hidden="true">✅</span>
            <h1 className={styles.successTitle}>¡Cita agendada!</h1>
            <p className={styles.successDesc}>
              Hemos recibido tu solicitud para <strong>{form.date}</strong> a las{' '}
              <strong>{form.time}</strong>. Te confirmaremos por WhatsApp o al correo{' '}
              {form.email ? <strong>{form.email}</strong> : 'registrado'}.
            </p>
            <div className={styles.successActions}>
              <button type="button" className={styles.resetButton} onClick={handleReset}>
                Agendar otra cita
              </button>
              <a
                href="https://wa.me/573183531500"
                target="_blank"
                rel="noopener noreferrer"
                className={styles.whatsappButton}
              >
                Confirmar por WhatsApp
              </a>
            </div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className={styles.page}>
      <div className={styles.container}>
        <div className={styles.header}>
          <span className={styles.eyebrow}>Reserva en línea</span>
          <h1 className={styles.title}>Agendar cita</h1>
          <p className={styles.subtitle}>
            Completa el formulario y nos pondremos en contacto para confirmar tu cita.
            También puedes escribirnos directamente por WhatsApp.
          </p>
        </div>

        <div className={styles.grid}>
          <form className={styles.form} onSubmit={handleSubmit} noValidate>
            <fieldset className={styles.fieldset}>
              <legend className={styles.legend}>Datos personales</legend>

              <div className={styles.field}>
                <label className={styles.label} htmlFor="name">Nombre completo *</label>
                <input
                  id="name"
                  name="name"
                  className={`${styles.input} ${errors.name ? styles.inputError : ''}`}
                  type="text"
                  placeholder="Ej. Juan Pérez"
                  value={form.name}
                  onChange={handleChange}
                  autoComplete="name"
                />
                {errors.name ? <span className={styles.error}>{errors.name}</span> : null}
              </div>

              <div className={styles.row}>
                <div className={styles.field}>
                  <label className={styles.label} htmlFor="phone">Teléfono / WhatsApp *</label>
                  <input
                    id="phone"
                    name="phone"
                    className={`${styles.input} ${errors.phone ? styles.inputError : ''}`}
                    type="tel"
                    placeholder="3XX XXX XXXX"
                    value={form.phone}
                    onChange={handleChange}
                    autoComplete="tel"
                  />
                  {errors.phone ? <span className={styles.error}>{errors.phone}</span> : null}
                </div>
                <div className={styles.field}>
                  <label className={styles.label} htmlFor="email">Correo electrónico</label>
                  <input
                    id="email"
                    name="email"
                    className={styles.input}
                    type="email"
                    placeholder="correo@ejemplo.com"
                    value={form.email}
                    onChange={handleChange}
                    autoComplete="email"
                  />
                </div>
              </div>
            </fieldset>

            <fieldset className={styles.fieldset}>
              <legend className={styles.legend}>Datos de la motocicleta</legend>

              <div className={styles.row}>
                <div className={styles.field}>
                  <label className={styles.label} htmlFor="plate">Placa *</label>
                  <input
                    id="plate"
                    name="plate"
                    className={`${styles.input} ${errors.plate ? styles.inputError : ''}`}
                    type="text"
                    placeholder="ABC123"
                    value={form.plate}
                    onChange={(e) => handleChange({ target: { name: 'plate', value: e.target.value.toUpperCase() } })}
                  />
                  {errors.plate ? <span className={styles.error}>{errors.plate}</span> : null}
                </div>
                <div className={styles.field}>
                  <label className={styles.label} htmlFor="brand">Marca y modelo *</label>
                  <input
                    id="brand"
                    name="brand"
                    className={`${styles.input} ${errors.brand ? styles.inputError : ''}`}
                    type="text"
                    placeholder="Ej. Honda CB300"
                    value={form.brand}
                    onChange={handleChange}
                  />
                  {errors.brand ? <span className={styles.error}>{errors.brand}</span> : null}
                </div>
              </div>
            </fieldset>

            <fieldset className={styles.fieldset}>
              <legend className={styles.legend}>Detalles de la cita</legend>

              <div className={styles.field}>
                <label className={styles.label} htmlFor="service">Servicio requerido *</label>
                <select
                  id="service"
                  name="service"
                  className={`${styles.input} ${errors.service ? styles.inputError : ''}`}
                  value={form.service}
                  onChange={handleChange}
                >
                  <option value="">Seleccionar servicio...</option>
                  {SERVICES_LIST.map((s) => (
                    <option key={s} value={s}>{s}</option>
                  ))}
                </select>
                {errors.service ? <span className={styles.error}>{errors.service}</span> : null}
              </div>

              <div className={styles.row}>
                <div className={styles.field}>
                  <label className={styles.label} htmlFor="date">Fecha preferida *</label>
                  <input
                    id="date"
                    name="date"
                    className={`${styles.input} ${errors.date ? styles.inputError : ''}`}
                    type="date"
                    min={new Date().toISOString().split('T')[0]}
                    value={form.date}
                    onChange={handleChange}
                  />
                  {errors.date ? <span className={styles.error}>{errors.date}</span> : null}
                </div>
                <div className={styles.field}>
                  <label className={styles.label} htmlFor="time">Hora preferida *</label>
                  <input
                    id="time"
                    name="time"
                    className={`${styles.input} ${errors.time ? styles.inputError : ''}`}
                    type="time"
                    min="08:00"
                    max="18:00"
                    value={form.time}
                    onChange={handleChange}
                  />
                  {errors.time ? <span className={styles.error}>{errors.time}</span> : null}
                </div>
              </div>

              <div className={styles.field}>
                <label className={styles.label} htmlFor="notes">Observaciones adicionales</label>
                <textarea
                  id="notes"
                  name="notes"
                  className={`${styles.input} ${styles.textarea}`}
                  placeholder="Describe el problema o cualquier detalle relevante..."
                  value={form.notes}
                  onChange={handleChange}
                  rows={3}
                />
              </div>
            </fieldset>

            <button type="submit" className={styles.submitButton}>
              Confirmar cita
              <svg viewBox="0 0 20 20" fill="currentColor" width="18" height="18" aria-hidden="true">
                <path fillRule="evenodd" d="M3 10a.75.75 0 0 1 .75-.75h10.638L10.23 5.29a.75.75 0 1 1 1.04-1.08l5.5 5.25a.75.75 0 0 1 0 1.08l-5.5 5.25a.75.75 0 1 1-1.04-1.08l4.158-3.96H3.75A.75.75 0 0 1 3 10Z" clipRule="evenodd" />
              </svg>
            </button>
          </form>

          <aside className={styles.aside}>
            <div className={styles.asideCard}>
              <h2 className={styles.asideTitle}>¿Prefieres WhatsApp?</h2>
              <p className={styles.asideDesc}>
                Escríbenos directamente y agendamos tu cita en minutos.
              </p>
              <a
                href="https://wa.me/573183531500"
                target="_blank"
                rel="noopener noreferrer"
                className={styles.asideWhatsapp}
              >
                <span aria-hidden="true">💬</span>
                318 353 1500
              </a>
              <a
                href="https://wa.me/573008909195"
                target="_blank"
                rel="noopener noreferrer"
                className={styles.asideWhatsapp}
              >
                <span aria-hidden="true">💬</span>
                300 890 9195
              </a>
            </div>

            <div className={styles.asideCard}>
              <h2 className={styles.asideTitle}>Horario de atención</h2>
              <ul className={styles.schedule}>
                <li><span>Lunes — Viernes</span><strong>8:00 am — 6:00 pm</strong></li>
                <li><span>Sábados</span><strong>8:00 am — 2:00 pm</strong></li>
                <li><span>Domingos</span><strong>Cerrado</strong></li>
              </ul>
            </div>
          </aside>
        </div>
      </div>
    </div>
  )
}
