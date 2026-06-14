import { useState } from 'react'
import { getTallerConfig, saveTallerConfig } from '../../../services/tallerConfigService'
import { getUsers } from '../../../services/usersService'
import { useToast } from '../../../hooks/useToast'
import styles from './Configuracion.module.css'

const INITIAL_USERS = [
  { id: 'u-1', username: 'admin', email: 'admin@enginesjds.com', role: 'Administrador', status: 'Activo' },
  { id: 'u-2', username: 'tecnico1', email: 'tecnico1@enginesjds.com', role: 'Técnico', status: 'Activo' },
]

function BuildingIcon() {
  return (
    <svg viewBox="0 0 20 20" fill="currentColor" width="17" height="17" aria-hidden="true">
      <path fillRule="evenodd" d="M4 16.5v-13h-.25a.75.75 0 0 1 0-1.5h12.5a.75.75 0 0 1 0 1.5H16v13h.25a.75.75 0 0 1 0 1.5h-3.5a.75.75 0 0 1-.75-.75v-2.5a.75.75 0 0 0-.75-.75h-2.5a.75.75 0 0 0-.75.75v2.5a.75.75 0 0 1-.75.75h-3.5a.75.75 0 0 1 0-1.5H4Zm3-11a.75.75 0 0 1 .75-.75h.5a.75.75 0 0 1 0 1.5h-.5A.75.75 0 0 1 7 5.5Zm.75 2.25h.5a.75.75 0 0 1 0 1.5h-.5a.75.75 0 0 1 0-1.5Zm2.75-2.25a.75.75 0 0 1 .75-.75h.5a.75.75 0 0 1 0 1.5h-.5A.75.75 0 0 1 10.5 5.5Zm.75 2.25h.5a.75.75 0 0 1 0 1.5h-.5a.75.75 0 0 1 0-1.5Z" clipRule="evenodd" />
    </svg>
  )
}

function ClockIcon() {
  return (
    <svg viewBox="0 0 20 20" fill="currentColor" width="17" height="17" aria-hidden="true">
      <path fillRule="evenodd" d="M10 18a8 8 0 1 0 0-16 8 8 0 0 0 0 16Zm.75-13a.75.75 0 0 0-1.5 0v5c0 .414.336.75.75.75h4a.75.75 0 0 0 0-1.5h-3.25V5Z" clipRule="evenodd" />
    </svg>
  )
}

function CalendarIcon() {
  return (
    <svg viewBox="0 0 20 20" fill="currentColor" width="17" height="17" aria-hidden="true">
      <path fillRule="evenodd" d="M5.75 2a.75.75 0 0 1 .75.75V4h7V2.75a.75.75 0 0 1 1.5 0V4h.25A2.75 2.75 0 0 1 18 6.75v8.5A2.75 2.75 0 0 1 15.25 18H4.75A2.75 2.75 0 0 1 2 15.25v-8.5A2.75 2.75 0 0 1 4.75 4H5V2.75A.75.75 0 0 1 5.75 2Zm-1 5.5c-.69 0-1.25.56-1.25 1.25v6.5c0 .69.56 1.25 1.25 1.25h10.5c.69 0 1.25-.56 1.25-1.25v-6.5c0-.69-.56-1.25-1.25-1.25H4.75Z" clipRule="evenodd" />
    </svg>
  )
}

function BoxIcon() {
  return (
    <svg viewBox="0 0 20 20" fill="currentColor" width="17" height="17" aria-hidden="true">
      <path d="M10.362 1.093a.75.75 0 0 0-.724 0L2.523 5.018 10 9.143l7.477-4.125-7.115-3.925ZM18 6.443l-7.25 4V18.39l6.498-3.7a.75.75 0 0 0 .752-.931V6.443ZM9.25 18.39V10.443L2 6.443v7.316a.75.75 0 0 0 .752.931L9.25 18.39Z" />
    </svg>
  )
}

function CarIcon() {
  return (
    <svg viewBox="0 0 20 20" fill="currentColor" width="17" height="17" aria-hidden="true">
      <path d="M6.5 3A1.5 1.5 0 0 0 5 4.5v.796a3.968 3.968 0 0 0-1.981 1.39L1.187 9.604A1.5 1.5 0 0 0 1 10.35V13.5A1.5 1.5 0 0 0 2.5 15h.5a2 2 0 0 0 4 0h6a2 2 0 0 0 4 0h.5a1.5 1.5 0 0 0 1.5-1.5v-3.15a1.5 1.5 0 0 0-.187-.746l-1.832-2.918A3.968 3.968 0 0 0 15 5.296V4.5A1.5 1.5 0 0 0 13.5 3h-7ZM6.5 4.5h7v.796a2.47 2.47 0 0 1-.085.63H6.585a2.47 2.47 0 0 1-.085-.63V4.5ZM5.5 8h9l1.4 2.232H4.1L5.5 8ZM5 13a1 1 0 1 1 2 0 1 1 0 0 1-2 0Zm9 0a1 1 0 1 1 2 0 1 1 0 0 1-2 0Z" />
    </svg>
  )
}

function UsersIcon() {
  return (
    <svg viewBox="0 0 20 20" fill="currentColor" width="17" height="17" aria-hidden="true">
      <path d="M7 8a3 3 0 1 0 0-6 3 3 0 0 0 0 6ZM14.5 9a2.5 2.5 0 1 0 0-5 2.5 2.5 0 0 0 0 5ZM1.615 16.428a1.224 1.224 0 0 1-.569-1.175 6.002 6.002 0 0 1 11.908 0c.058.467-.172.92-.57 1.174A9.953 9.953 0 0 1 7 17a9.953 9.953 0 0 1-5.385-1.572ZM14.5 16h-.106c.07-.297.088-.611.048-.933a7.47 7.47 0 0 0-1.588-3.755 4.502 4.502 0 0 1 5.874 2.636.818.818 0 0 1-.36.98A7.465 7.465 0 0 1 14.5 16Z" />
    </svg>
  )
}

export function Configuracion() {
  const toast = useToast()
  const cfg = getTallerConfig()
  const users = getUsers(INITIAL_USERS)

  const [taller, setTaller] = useState({
    nombre: cfg.nombre,
    direccion: cfg.direccion,
    telefono: cfg.telefono,
    whatsapp: cfg.whatsapp,
    email: cfg.email,
  })

  const [horario, setHorario] = useState({
    horaApertura: cfg.horaApertura,
    horaCierre: cfg.horaCierre,
  })

  const [citas, setCitas] = useState({
    duracionCita: cfg.duracionCita,
    intervaloCita: cfg.intervaloCita,
  })

  const [inventario, setInventario] = useState({
    stockMinimo: cfg.stockMinimo,
  })

  const [tecno, setTecno] = useState({
    diasTecno: cfg.diasTecno,
  })

  function handleSaveTaller(e) {
    e.preventDefault()
    saveTallerConfig({ ...getTallerConfig(), ...taller })
    toast.success('Información del taller guardada exitosamente')
  }

  function handleSaveHorario(e) {
    e.preventDefault()
    saveTallerConfig({ ...getTallerConfig(), ...horario })
    toast.success('Horario de atención guardado exitosamente')
  }

  function handleSaveCitas(e) {
    e.preventDefault()
    saveTallerConfig({ ...getTallerConfig(), ...citas })
    toast.success('Configuración de citas guardada exitosamente')
  }

  function handleSaveInventario(e) {
    e.preventDefault()
    saveTallerConfig({ ...getTallerConfig(), ...inventario })
    toast.success('Configuración de inventario guardada exitosamente')
  }

  function handleSaveTecno(e) {
    e.preventDefault()
    saveTallerConfig({ ...getTallerConfig(), ...tecno })
    toast.success('Configuración tecnomecánica guardada exitosamente')
  }

  return (
    <div className={styles.page}>
      <header className={styles.pageHeader}>
        <div>
          <p className={styles.eyebrow}>Sistema</p>
          <h1 className={styles.title}>Configuración</h1>
          <p className={styles.subtitle}>Personaliza el taller, horarios y preferencias del sistema</p>
        </div>
      </header>

      <div className={styles.layout}>
        {/* ── Información del taller ──────────────── */}
        <section className={styles.section}>
          <div className={styles.sectionHeader}>
            <div className={styles.sectionTitleRow}>
              <span className={styles.sectionIcon} style={{ background: '#EFF6FF', color: '#1d4ed8' }}>
                <BuildingIcon />
              </span>
              <div>
                <h2 className={styles.sectionTitle}>Información del Taller</h2>
                <p className={styles.sectionSub}>Datos de contacto e identificación del negocio</p>
              </div>
            </div>
          </div>
          <form onSubmit={handleSaveTaller} className={styles.form}>
            <div className={styles.field}>
              <label className={styles.label}>Nombre del taller</label>
              <input
                className={styles.input}
                value={taller.nombre}
                onChange={(e) => setTaller((p) => ({ ...p, nombre: e.target.value }))}
                placeholder="ENGINES JDS"
              />
            </div>
            <div className={`${styles.field} ${styles.fieldFull}`}>
              <label className={styles.label}>Dirección</label>
              <input
                className={styles.input}
                value={taller.direccion}
                onChange={(e) => setTaller((p) => ({ ...p, direccion: e.target.value }))}
                placeholder="Calle 45 # 12-30, Bogotá"
              />
            </div>
            <div className={styles.field}>
              <label className={styles.label}>Teléfono</label>
              <input
                className={styles.input}
                value={taller.telefono}
                onChange={(e) => setTaller((p) => ({ ...p, telefono: e.target.value }))}
                placeholder="+57 1 234 5678"
              />
            </div>
            <div className={styles.field}>
              <label className={styles.label}>WhatsApp</label>
              <input
                className={styles.input}
                value={taller.whatsapp}
                onChange={(e) => setTaller((p) => ({ ...p, whatsapp: e.target.value }))}
                placeholder="+57 300 000 0000"
              />
            </div>
            <div className={`${styles.field} ${styles.fieldFull}`}>
              <label className={styles.label}>Correo electrónico</label>
              <input
                className={styles.input}
                type="email"
                value={taller.email}
                onChange={(e) => setTaller((p) => ({ ...p, email: e.target.value }))}
                placeholder="contacto@enginesjds.com"
              />
            </div>
            <div className={styles.formActions}>
              <button type="submit" className={styles.primaryButton}>Guardar información</button>
            </div>
          </form>
        </section>

        {/* ── Horario ─────────────────────────────── */}
        <section className={styles.section}>
          <div className={styles.sectionHeader}>
            <div className={styles.sectionTitleRow}>
              <span className={styles.sectionIcon} style={{ background: '#FFF7ED', color: '#EA580C' }}>
                <ClockIcon />
              </span>
              <div>
                <h2 className={styles.sectionTitle}>Horario de Atención</h2>
                <p className={styles.sectionSub}>Define las horas de apertura y cierre del taller</p>
              </div>
            </div>
          </div>
          <form onSubmit={handleSaveHorario} className={styles.form}>
            <div className={styles.field}>
              <label className={styles.label}>Hora de apertura</label>
              <input
                className={styles.input}
                type="time"
                value={horario.horaApertura}
                onChange={(e) => setHorario((p) => ({ ...p, horaApertura: e.target.value }))}
              />
            </div>
            <div className={styles.field}>
              <label className={styles.label}>Hora de cierre</label>
              <input
                className={styles.input}
                type="time"
                value={horario.horaCierre}
                onChange={(e) => setHorario((p) => ({ ...p, horaCierre: e.target.value }))}
              />
            </div>
            <div className={styles.horarioPreview}>
              <span className={styles.horarioText}>
                Horario configurado: <strong>{horario.horaApertura}</strong> — <strong>{horario.horaCierre}</strong>
              </span>
            </div>
            <div className={styles.formActions}>
              <button type="submit" className={styles.primaryButton}>Guardar horario</button>
            </div>
          </form>
        </section>

        {/* ── Citas ───────────────────────────────── */}
        <section className={styles.section}>
          <div className={styles.sectionHeader}>
            <div className={styles.sectionTitleRow}>
              <span className={styles.sectionIcon} style={{ background: '#F0FDF4', color: '#16A34A' }}>
                <CalendarIcon />
              </span>
              <div>
                <h2 className={styles.sectionTitle}>Configuración de Citas</h2>
                <p className={styles.sectionSub}>Duración e intervalo entre citas del taller</p>
              </div>
            </div>
          </div>
          <form onSubmit={handleSaveCitas} className={styles.form}>
            <div className={styles.field}>
              <label className={styles.label}>Duración por cita (minutos)</label>
              <input
                className={styles.input}
                type="number"
                min="15"
                max="240"
                step="15"
                value={citas.duracionCita}
                onChange={(e) => setCitas((p) => ({ ...p, duracionCita: Number(e.target.value) }))}
              />
              <span className={styles.fieldHint}>Tiempo estimado por servicio</span>
            </div>
            <div className={styles.field}>
              <label className={styles.label}>Intervalo entre citas (minutos)</label>
              <input
                className={styles.input}
                type="number"
                min="0"
                max="120"
                step="5"
                value={citas.intervaloCita}
                onChange={(e) => setCitas((p) => ({ ...p, intervaloCita: Number(e.target.value) }))}
              />
              <span className={styles.fieldHint}>Tiempo libre entre turnos</span>
            </div>
            <div className={styles.formActions}>
              <button type="submit" className={styles.primaryButton}>Guardar configuración</button>
            </div>
          </form>
        </section>

        {/* ── Inventario ──────────────────────────── */}
        <section className={styles.section}>
          <div className={styles.sectionHeader}>
            <div className={styles.sectionTitleRow}>
              <span className={styles.sectionIcon} style={{ background: '#FFF1F2', color: '#DC2626' }}>
                <BoxIcon />
              </span>
              <div>
                <h2 className={styles.sectionTitle}>Inventario</h2>
                <p className={styles.sectionSub}>Umbral de alerta por stock bajo de repuestos</p>
              </div>
            </div>
          </div>
          <form onSubmit={handleSaveInventario} className={styles.form}>
            <div className={styles.field}>
              <label className={styles.label}>Stock mínimo para alerta</label>
              <input
                className={styles.input}
                type="number"
                min="1"
                max="100"
                value={inventario.stockMinimo}
                onChange={(e) => setInventario({ stockMinimo: Number(e.target.value) })}
              />
              <span className={styles.fieldHint}>
                Se mostrará alerta cuando un repuesto tenga {inventario.stockMinimo} unidades o menos
              </span>
            </div>
            <div className={styles.formActions}>
              <button type="submit" className={styles.primaryButton}>Guardar configuración</button>
            </div>
          </form>
        </section>

        {/* ── Tecnomecánica ───────────────────────── */}
        <section className={styles.section}>
          <div className={styles.sectionHeader}>
            <div className={styles.sectionTitleRow}>
              <span className={styles.sectionIcon} style={{ background: '#FFFBEB', color: '#D97706' }}>
                <CarIcon />
              </span>
              <div>
                <h2 className={styles.sectionTitle}>Tecnomecánica</h2>
                <p className={styles.sectionSub}>Días de anticipación para alertas de vencimiento</p>
              </div>
            </div>
          </div>
          <form onSubmit={handleSaveTecno} className={styles.form}>
            <div className={styles.field}>
              <label className={styles.label}>Días de anticipación para alerta</label>
              <input
                className={styles.input}
                type="number"
                min="7"
                max="365"
                value={tecno.diasTecno}
                onChange={(e) => setTecno({ diasTecno: Number(e.target.value) })}
              />
              <span className={styles.fieldHint}>
                Alertar cuando falten {tecno.diasTecno} días o menos para el vencimiento
              </span>
            </div>
            <div className={styles.formActions}>
              <button type="submit" className={styles.primaryButton}>Guardar configuración</button>
            </div>
          </form>
        </section>

        {/* ── Usuarios con acceso ─────────────────── */}
        <section className={styles.section}>
          <div className={styles.sectionHeader}>
            <div className={styles.sectionTitleRow}>
              <span className={styles.sectionIcon} style={{ background: '#F5F3FF', color: '#7C3AED' }}>
                <UsersIcon />
              </span>
              <div>
                <h2 className={styles.sectionTitle}>Usuarios con Acceso</h2>
                <p className={styles.sectionSub}>Personas con acceso al panel administrativo</p>
              </div>
            </div>
          </div>
          <div className={styles.userList}>
            {users.map((u) => (
              <div key={u.id} className={styles.userRow}>
                <div className={styles.userAvatar}>
                  {(u.username || u.email || 'U')[0].toUpperCase()}
                </div>
                <div className={styles.userInfo}>
                  <span className={styles.userName}>{u.username || u.email}</span>
                  <span className={styles.userEmail}>{u.email}</span>
                </div>
                <div className={styles.userMeta}>
                  <span className={styles.userRole}>{u.role}</span>
                  <span
                    className={styles.userStatus}
                    data-status={u.status}
                  >
                    {u.status}
                  </span>
                </div>
              </div>
            ))}
          </div>
          <p className={styles.usersHint}>
            Gestiona los usuarios desde la sección <strong>Usuarios</strong> del menú lateral.
          </p>
        </section>
      </div>
    </div>
  )
}
