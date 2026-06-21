import { useState, useEffect, useCallback } from 'react'
import { useAuth } from '../../../hooks/useAuth'
import { useToast } from '../../../hooks/useToast'
import { authApi } from '../../../api/authApi'
import { usersApi } from '../../../api/usersApi'
import styles from './Perfil.module.css'

// ── Iconos ────────────────────────────────────────────────
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

function EyeIcon({ open }) {
  return open ? (
    <svg viewBox="0 0 20 20" fill="currentColor" width="17" height="17" aria-hidden="true">
      <path d="M10 12.5a2.5 2.5 0 1 0 0-5 2.5 2.5 0 0 0 0 5Z" />
      <path fillRule="evenodd" d="M.664 10.59a1.651 1.651 0 0 1 0-1.186A10.004 10.004 0 0 1 10 3c4.257 0 7.893 2.66 9.336 6.41.147.381.146.804 0 1.186A10.004 10.004 0 0 1 10 17c-4.257 0-7.893-2.66-9.336-6.41ZM14 10a4 4 0 1 1-8 0 4 4 0 0 1 8 0Z" clipRule="evenodd" />
    </svg>
  ) : (
    <svg viewBox="0 0 20 20" fill="currentColor" width="17" height="17" aria-hidden="true">
      <path fillRule="evenodd" d="M3.28 2.22a.75.75 0 0 0-1.06 1.06l14.5 14.5a.75.75 0 1 0 1.06-1.06l-1.745-1.745a10.029 10.029 0 0 0 3.3-4.38 1.651 1.651 0 0 0 0-1.185A10.004 10.004 0 0 0 9.999 3a9.956 9.956 0 0 0-4.744 1.194L3.28 2.22ZM7.752 6.69l1.092 1.092a2.5 2.5 0 0 1 3.374 3.373l1.091 1.092a4 4 0 0 0-5.557-5.557Z" clipRule="evenodd" />
      <path d="M10.748 13.93l2.523 2.523a10.065 10.065 0 0 1-3.27.547c-4.258 0-7.894-2.66-9.337-6.41a1.651 1.651 0 0 1 0-1.186A10.007 10.007 0 0 1 2.839 6.02L6.07 9.252a4 4 0 0 0 4.678 4.678Z" />
    </svg>
  )
}

// ── Helpers ───────────────────────────────────────────────
function PwdInput({ id, value, onChange, placeholder, autoComplete, hasError }) {
  const [show, setShow] = useState(false)
  return (
    <div className={styles.pwdWrapper}>
      <input
        id={id}
        type={show ? 'text' : 'password'}
        className={`${styles.input} ${hasError ? styles.inputError : ''}`}
        value={value}
        onChange={onChange}
        placeholder={placeholder}
        autoComplete={autoComplete}
      />
      <button
        type="button"
        className={styles.eyeBtn}
        onClick={() => setShow((v) => !v)}
        aria-label={show ? 'Ocultar contraseña' : 'Mostrar contraseña'}
      >
        <EyeIcon open={show} />
      </button>
    </div>
  )
}

// ── Componente principal ─────────────────────────────────
export function Perfil() {
  const { user, refreshUser } = useAuth()
  const toast = useToast()

  // ── Info personal ────────────────────────────────────
  const [info, setInfo] = useState({ username: '', email: '' })
  const [infoErrors, setInfoErrors] = useState({})
  const [savingInfo, setSavingInfo] = useState(false)
  const [lastAccess, setLastAccess] = useState('')

  // ── Cambio de contraseña ──────────────────────────────
  const [pwd, setPwd] = useState({ current: '', newPwd: '', confirm: '' })
  const [pwdErrors, setPwdErrors] = useState({})
  const [savingPwd, setSavingPwd] = useState(false)

  useEffect(() => {
    if (user) {
      setInfo({ username: user.username ?? '', email: user.email ?? '' })
    }
    setLastAccess(new Date().toLocaleString('es-CO', { dateStyle: 'long', timeStyle: 'short' }))
  }, [user])

  const initials = (user?.username || user?.email || 'U')
    .split(' ')
    .slice(0, 2)
    .map((w) => w[0])
    .join('')
    .toUpperCase()

  // ── Guardar información personal ──────────────────────
  const handleSaveInfo = useCallback(async (e) => {
    e.preventDefault()
    const errors = {}
    if (!info.username.trim()) errors.username = 'El nombre de usuario es requerido'
    else if (info.username.trim().length < 3) errors.username = 'Mínimo 3 caracteres'
    if (!info.email.trim()) errors.email = 'El correo electrónico es requerido'
    if (Object.keys(errors).length) { setInfoErrors(errors); return }
    setInfoErrors({})
    setSavingInfo(true)
    try {
      await usersApi.update(user.id, {
        username: info.username.trim(),
        email:    info.email.trim(),
      })
      await refreshUser()
      toast.success('Información personal actualizada correctamente')
    } catch (err) {
      const msg = err.message || 'Error al actualizar la información'
      if (msg.toLowerCase().includes('correo') || msg.toLowerCase().includes('email')) {
        setInfoErrors({ email: msg })
      } else if (msg.toLowerCase().includes('usuario') || msg.toLowerCase().includes('username')) {
        setInfoErrors({ username: msg })
      } else {
        toast.error(msg)
      }
    } finally {
      setSavingInfo(false)
    }
  }, [info, user, refreshUser, toast])

  // ── Cambiar contraseña ────────────────────────────────
  const handleSavePwd = useCallback(async (e) => {
    e.preventDefault()
    const errors = {}
    if (!pwd.current.trim()) errors.current = 'Ingresa tu contraseña actual'
    if (pwd.newPwd.length < 6) errors.newPwd = 'Mínimo 6 caracteres'
    if (pwd.newPwd !== pwd.confirm) errors.confirm = 'Las contraseñas no coinciden'
    if (Object.keys(errors).length) { setPwdErrors(errors); return }
    setPwdErrors({})
    setSavingPwd(true)
    try {
      await authApi.changePassword({
        currentPassword:  pwd.current,
        newPassword:      pwd.newPwd,
        confirmPassword:  pwd.confirm,
      })
      setPwd({ current: '', newPwd: '', confirm: '' })
      toast.success('Contraseña actualizada correctamente')
    } catch (err) {
      const msg = err.message || 'Error al cambiar la contraseña'
      if (msg.toLowerCase().includes('actual') || msg.toLowerCase().includes('incorrecta')) {
        setPwdErrors({ current: msg })
      } else {
        toast.error(msg)
      }
    } finally {
      setSavingPwd(false)
    }
  }, [pwd, toast])

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
          <h2 className={styles.avatarName}>{user?.username || 'Usuario'}</h2>
          <p className={styles.avatarEmail}>{user?.email}</p>
          <span className={styles.roleBadge}>{user?.role || 'Administrador'}</span>
        </div>
      </div>

      <div className={styles.grid}>
        {/* ── Información Personal ─────────────────────── */}
        <section className={styles.section}>
          <div className={styles.sectionHeader}>
            <h2 className={styles.sectionTitle}>Información Personal</h2>
            <p className={styles.sectionSub}>Actualiza tu nombre de usuario y correo electrónico</p>
          </div>
          <form onSubmit={handleSaveInfo} className={styles.form}>
            <div className={styles.field}>
              <label className={styles.label} htmlFor="username">Nombre de usuario</label>
              <input
                id="username"
                className={`${styles.input} ${infoErrors.username ? styles.inputError : ''}`}
                value={info.username}
                onChange={(e) => setInfo((p) => ({ ...p, username: e.target.value }))}
                placeholder="tu_usuario"
                autoComplete="username"
              />
              {infoErrors.username && <span className={styles.fieldError}>{infoErrors.username}</span>}
            </div>
            <div className={styles.field}>
              <label className={styles.label} htmlFor="email">Correo electrónico</label>
              <input
                id="email"
                type="email"
                className={`${styles.input} ${infoErrors.email ? styles.inputError : ''}`}
                value={info.email}
                onChange={(e) => setInfo((p) => ({ ...p, email: e.target.value }))}
                placeholder="correo@dominio.com"
                autoComplete="email"
              />
              {infoErrors.email && <span className={styles.fieldError}>{infoErrors.email}</span>}
            </div>
            <div className={styles.field}>
              <label className={styles.label}>Cargo / Rol</label>
              <input className={`${styles.input} ${styles.inputDisabled}`} value={user?.role || 'Administrador'} disabled />
            </div>
            <div className={styles.formActions}>
              <button type="submit" className={styles.primaryButton} disabled={savingInfo}>
                {savingInfo ? 'Guardando…' : 'Guardar información'}
              </button>
            </div>
          </form>
        </section>

        <div className={styles.rightCol}>
          {/* ── Seguridad ───────────────────────────────── */}
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
                <label className={styles.label} htmlFor="currentPwd">Contraseña actual</label>
                <PwdInput
                  id="currentPwd"
                  value={pwd.current}
                  onChange={(e) => setPwd((p) => ({ ...p, current: e.target.value }))}
                  placeholder="Contraseña actual"
                  autoComplete="current-password"
                  hasError={Boolean(pwdErrors.current)}
                />
                {pwdErrors.current && <span className={styles.fieldError}>{pwdErrors.current}</span>}
              </div>
              <div className={styles.field}>
                <label className={styles.label} htmlFor="newPwd">Nueva contraseña</label>
                <PwdInput
                  id="newPwd"
                  value={pwd.newPwd}
                  onChange={(e) => setPwd((p) => ({ ...p, newPwd: e.target.value }))}
                  placeholder="Mínimo 6 caracteres"
                  autoComplete="new-password"
                  hasError={Boolean(pwdErrors.newPwd)}
                />
                {pwdErrors.newPwd && <span className={styles.fieldError}>{pwdErrors.newPwd}</span>}
              </div>
              <div className={styles.field}>
                <label className={styles.label} htmlFor="confirmPwd">Confirmar nueva contraseña</label>
                <PwdInput
                  id="confirmPwd"
                  value={pwd.confirm}
                  onChange={(e) => setPwd((p) => ({ ...p, confirm: e.target.value }))}
                  placeholder="Repite la nueva contraseña"
                  autoComplete="new-password"
                  hasError={Boolean(pwdErrors.confirm)}
                />
                {pwdErrors.confirm && <span className={styles.fieldError}>{pwdErrors.confirm}</span>}
              </div>
              <div className={styles.formActions}>
                <button type="submit" className={styles.primaryButton} disabled={savingPwd}>
                  {savingPwd ? 'Cambiando…' : 'Cambiar contraseña'}
                </button>
              </div>
            </form>
          </section>

          {/* ── Actividad ────────────────────────────────── */}
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
                  <p className={styles.activityValue}>{lastAccess || '—'}</p>
                </div>
              </div>
              <div className={styles.activityRow}>
                <div className={styles.activityIcon} style={{ background: '#F0FDF4', color: '#16A34A' }}>
                  <CalendarIcon />
                </div>
                <div>
                  <p className={styles.activityLabel}>Miembro desde</p>
                  <p className={styles.activityValue}>
                    {user?.created_at
                      ? new Date(user.created_at).toLocaleDateString('es-CO', { dateStyle: 'long' })
                      : '—'}
                  </p>
                </div>
              </div>
            </div>
          </section>
        </div>
      </div>
    </div>
  )
}
