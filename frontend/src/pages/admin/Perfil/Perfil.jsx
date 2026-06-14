import { useState, useEffect } from 'react'
import { useAuth } from '../../../hooks/useAuth'
import { useToast } from '../../../hooks/useToast'
import styles from './Perfil.module.css'

const PROFILE_KEY = 'engines_jds_profile'
const PWD_KEY = 'engines_jds_profile_pwd'

function getProfile() {
  try {
    const s = localStorage.getItem(PROFILE_KEY)
    return s ? JSON.parse(s) : {}
  } catch { return {} }
}

function saveProfile(data) {
  localStorage.setItem(PROFILE_KEY, JSON.stringify(data))
}

function ClockIcon() {
  return (
    <svg viewBox="0 0 20 20" fill="currentColor" width="18" height="18" aria-hidden="true">
      <path fillRule="evenodd" d="M10 18a8 8 0 1 0 0-16 8 8 0 0 0 0 16Zm.75-13a.75.75 0 0 0-1.5 0v5c0 .414.336.75.75.75h4a.75.75 0 0 0 0-1.5h-3.25V5Z" clipRule="evenodd" />
    </svg>
  )
}

function CalendarIcon() {
  return (
    <svg viewBox="0 0 20 20" fill="currentColor" width="18" height="18" aria-hidden="true">
      <path fillRule="evenodd" d="M5.75 2a.75.75 0 0 1 .75.75V4h7V2.75a.75.75 0 0 1 1.5 0V4h.25A2.75 2.75 0 0 1 18 6.75v8.5A2.75 2.75 0 0 1 15.25 18H4.75A2.75 2.75 0 0 1 2 15.25v-8.5A2.75 2.75 0 0 1 4.75 4H5V2.75A.75.75 0 0 1 5.75 2Zm-1 5.5c-.69 0-1.25.56-1.25 1.25v6.5c0 .69.56 1.25 1.25 1.25h10.5c.69 0 1.25-.56 1.25-1.25v-6.5c0-.69-.56-1.25-1.25-1.25H4.75Z" clipRule="evenodd" />
    </svg>
  )
}

function ShieldIcon() {
  return (
    <svg viewBox="0 0 20 20" fill="currentColor" width="18" height="18" aria-hidden="true">
      <path fillRule="evenodd" d="M9.661 2.237a.531.531 0 0 1 .678 0 11.947 11.947 0 0 0 7.078 2.749.5.5 0 0 1 .479.425c.069.52.104 1.05.104 1.589 0 5.162-3.26 9.563-7.834 11.256a.48.48 0 0 1-.332 0C5.26 16.563 2 12.162 2 7c0-.538.035-1.069.104-1.589a.5.5 0 0 1 .48-.425 11.947 11.947 0 0 0 7.077-2.749Zm4.196 5.954a.75.75 0 0 0-1.214-.882l-3.483 4.79-1.88-1.88a.75.75 0 1 0-1.06 1.061l2.5 2.5a.75.75 0 0 0 1.137-.089l4-5.5Z" clipRule="evenodd" />
    </svg>
  )
}

export function Perfil() {
  const { user } = useAuth()
  const toast = useToast()

  const [profile, setProfile] = useState(() => getProfile())
  const [info, setInfo] = useState({
    displayName: '',
    phone: '',
  })
  const [infoErrors, setInfoErrors] = useState({})

  const [pwd, setPwd] = useState({ current: '', newPwd: '', confirm: '' })
  const [pwdErrors, setPwdErrors] = useState({})

  useEffect(() => {
    const p = getProfile()
    const now = new Date().toLocaleString('es-CO', { dateStyle: 'long', timeStyle: 'short' })
    if (!p.createdAt) {
      p.createdAt = now
    }
    p.lastAccess = now
    saveProfile(p)
    setProfile(p)
    setInfo({
      displayName: p.displayName || user?.name || '',
      phone: p.phone || '',
    })
  }, [user?.name])

  const initials = ((info.displayName || user?.name || user?.email || 'U'))
    .split(' ')
    .slice(0, 2)
    .map((w) => w[0])
    .join('')
    .toUpperCase()

  function handleSaveInfo(e) {
    e.preventDefault()
    const errors = {}
    if (!info.displayName.trim()) errors.displayName = 'El nombre es requerido'
    if (Object.keys(errors).length) { setInfoErrors(errors); return }
    setInfoErrors({})
    const updated = { ...profile, displayName: info.displayName.trim(), phone: info.phone.trim() }
    saveProfile(updated)
    setProfile(updated)
    toast.success('Información personal guardada exitosamente')
  }

  function handleSavePwd(e) {
    e.preventDefault()
    const storedPwd = localStorage.getItem(PWD_KEY)
    const errors = {}
    if (storedPwd && pwd.current !== storedPwd) {
      errors.current = 'Contraseña actual incorrecta'
    }
    if (pwd.newPwd.length < 6) {
      errors.newPwd = 'La contraseña debe tener al menos 6 caracteres'
    }
    if (pwd.newPwd !== pwd.confirm) {
      errors.confirm = 'Las contraseñas no coinciden'
    }
    if (Object.keys(errors).length) { setPwdErrors(errors); return }
    setPwdErrors({})
    localStorage.setItem(PWD_KEY, pwd.newPwd)
    setPwd({ current: '', newPwd: '', confirm: '' })
    toast.success('Contraseña actualizada exitosamente')
  }

  return (
    <div className={styles.page}>
      <header className={styles.pageHeader}>
        <div>
          <p className={styles.eyebrow}>Mi cuenta</p>
          <h1 className={styles.title}>Mi Perfil</h1>
          <p className={styles.subtitle}>Administra tu información personal y seguridad de la cuenta</p>
        </div>
      </header>

      <div className={styles.avatarCard}>
        <div className={styles.avatar}>{initials}</div>
        <div className={styles.avatarInfo}>
          <h2 className={styles.avatarName}>{info.displayName || user?.name || 'Usuario'}</h2>
          <p className={styles.avatarEmail}>{user?.email}</p>
          <span className={styles.roleBadge}>Administrador</span>
        </div>
      </div>

      <div className={styles.grid}>
        <section className={styles.section}>
          <div className={styles.sectionHeader}>
            <h2 className={styles.sectionTitle}>Información Personal</h2>
            <p className={styles.sectionSub}>Actualiza tu nombre de usuario y datos de contacto</p>
          </div>
          <form onSubmit={handleSaveInfo} className={styles.form}>
            <div className={styles.field}>
              <label className={styles.label}>Nombre para mostrar</label>
              <input
                className={`${styles.input} ${infoErrors.displayName ? styles.inputError : ''}`}
                value={info.displayName}
                onChange={(e) => setInfo((p) => ({ ...p, displayName: e.target.value }))}
                placeholder="Tu nombre completo"
              />
              {infoErrors.displayName && <span className={styles.fieldError}>{infoErrors.displayName}</span>}
            </div>
            <div className={styles.field}>
              <label className={styles.label}>Correo electrónico</label>
              <input className={`${styles.input} ${styles.inputDisabled}`} value={user?.email || ''} disabled />
              <span className={styles.fieldHint}>El correo electrónico no se puede cambiar</span>
            </div>
            <div className={styles.field}>
              <label className={styles.label}>Cargo / Rol</label>
              <input className={`${styles.input} ${styles.inputDisabled}`} value="Administrador" disabled />
            </div>
            <div className={styles.field}>
              <label className={styles.label}>Teléfono de contacto</label>
              <input
                className={styles.input}
                value={info.phone}
                onChange={(e) => setInfo((p) => ({ ...p, phone: e.target.value }))}
                placeholder="+57 300 000 0000"
              />
            </div>
            <div className={styles.formActions}>
              <button type="submit" className={styles.primaryButton}>Guardar información</button>
            </div>
          </form>
        </section>

        <div className={styles.rightCol}>
          <section className={styles.section}>
            <div className={styles.sectionHeader}>
              <div className={styles.sectionTitleRow}>
                <ShieldIcon />
                <h2 className={styles.sectionTitle}>Seguridad</h2>
              </div>
              <p className={styles.sectionSub}>Cambia tu contraseña de acceso al sistema</p>
            </div>
            <form onSubmit={handleSavePwd} className={styles.formCol}>
              <div className={styles.field}>
                <label className={styles.label}>Contraseña actual</label>
                <input
                  type="password"
                  className={`${styles.input} ${pwdErrors.current ? styles.inputError : ''}`}
                  value={pwd.current}
                  onChange={(e) => setPwd((p) => ({ ...p, current: e.target.value }))}
                  placeholder="Contraseña actual"
                  autoComplete="current-password"
                />
                {pwdErrors.current && <span className={styles.fieldError}>{pwdErrors.current}</span>}
              </div>
              <div className={styles.field}>
                <label className={styles.label}>Nueva contraseña</label>
                <input
                  type="password"
                  className={`${styles.input} ${pwdErrors.newPwd ? styles.inputError : ''}`}
                  value={pwd.newPwd}
                  onChange={(e) => setPwd((p) => ({ ...p, newPwd: e.target.value }))}
                  placeholder="Mínimo 6 caracteres"
                  autoComplete="new-password"
                />
                {pwdErrors.newPwd && <span className={styles.fieldError}>{pwdErrors.newPwd}</span>}
              </div>
              <div className={styles.field}>
                <label className={styles.label}>Confirmar nueva contraseña</label>
                <input
                  type="password"
                  className={`${styles.input} ${pwdErrors.confirm ? styles.inputError : ''}`}
                  value={pwd.confirm}
                  onChange={(e) => setPwd((p) => ({ ...p, confirm: e.target.value }))}
                  placeholder="Repite la nueva contraseña"
                  autoComplete="new-password"
                />
                {pwdErrors.confirm && <span className={styles.fieldError}>{pwdErrors.confirm}</span>}
              </div>
              <div className={styles.formActions}>
                <button type="submit" className={styles.primaryButton}>Cambiar contraseña</button>
              </div>
            </form>
          </section>

          <section className={styles.section}>
            <div className={styles.sectionHeader}>
              <h2 className={styles.sectionTitle}>Actividad de la Cuenta</h2>
            </div>
            <div className={styles.activityList}>
              <div className={styles.activityRow}>
                <div className={styles.activityIcon} style={{ background: '#EFF6FF', color: '#1D4ED8' }}>
                  <ClockIcon />
                </div>
                <div>
                  <p className={styles.activityLabel}>Último acceso</p>
                  <p className={styles.activityValue}>{profile.lastAccess || '—'}</p>
                </div>
              </div>
              <div className={styles.activityRow}>
                <div className={styles.activityIcon} style={{ background: '#F0FDF4', color: '#16A34A' }}>
                  <CalendarIcon />
                </div>
                <div>
                  <p className={styles.activityLabel}>Cuenta creada</p>
                  <p className={styles.activityValue}>{profile.createdAt || '—'}</p>
                </div>
              </div>
            </div>
          </section>
        </div>
      </div>
    </div>
  )
}
