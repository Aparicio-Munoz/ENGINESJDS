import { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { authApi } from '../../api/authApi'
import { ROUTES } from '../../utils/routes'
import styles from './ForgotPassword.module.css'

const RESEND_COOLDOWN_SECONDS = 30

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

const STEPS = ['email', 'code', 'password', 'success']
const STEP_LABELS = ['Correo', 'Código', 'Contraseña', 'Listo']

export function ForgotPassword() {
  const navigate = useNavigate()
  const [step, setStep] = useState('email')
  const [email, setEmail] = useState('')
  const [code, setCode] = useState('')
  const [pwd, setPwd] = useState('')
  const [confirm, setConfirm] = useState('')
  const [showPwd, setShowPwd] = useState(false)
  const [showConfirm, setShowConfirm] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [resendCooldown, setResendCooldown] = useState(0)

  const stepIndex = STEPS.indexOf(step)

  useEffect(() => {
    if (resendCooldown <= 0) return
    const timer = setInterval(() => setResendCooldown((s) => Math.max(0, s - 1)), 1000)
    return () => clearInterval(timer)
  }, [resendCooldown])

  async function handleSendEmail(e) {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      await authApi.forgotPassword(email)
      setResendCooldown(RESEND_COOLDOWN_SECONDS)
      setStep('code')
    } catch (err) {
      setError(err.message || 'No se pudo enviar el código. Intenta nuevamente.')
    } finally {
      setLoading(false)
    }
  }

  async function handleResend() {
    setError('')
    setLoading(true)
    try {
      await authApi.forgotPassword(email)
      setResendCooldown(RESEND_COOLDOWN_SECONDS)
    } catch (err) {
      setError(err.message || 'No se pudo reenviar el código. Intenta nuevamente.')
    } finally {
      setLoading(false)
    }
  }

  async function handleVerifyCode(e) {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      await authApi.verifyResetCode(email, code)
      setStep('password')
    } catch (err) {
      setError(err.message || 'Código inválido o expirado')
    } finally {
      setLoading(false)
    }
  }

  async function handleReset(e) {
    e.preventDefault()
    if (pwd.length < 8) return setError('La contraseña debe tener al menos 8 caracteres')
    if (!/[A-Z]/.test(pwd)) return setError('La contraseña debe contener al menos una mayúscula')
    if (!/[0-9]/.test(pwd)) return setError('La contraseña debe contener al menos un número')
    if (pwd !== confirm) return setError('Las contraseñas no coinciden')

    setError('')
    setLoading(true)
    try {
      await authApi.resetPassword({ email, code, newPassword: pwd, confirmPassword: confirm })
      setStep('success')
    } catch (err) {
      setError(err.message || 'No se pudo restablecer la contraseña. Intenta nuevamente.')
    } finally {
      setLoading(false)
    }
  }

  // ── Render ─────────────────────────────────────────────────
  return (
    <div className={styles.page}>
      <div className={styles.card}>

        {step !== 'success' && (
          <Link to={ROUTES.login} className={styles.backLink}>
            <svg viewBox="0 0 20 20" fill="currentColor" width="16" height="16" aria-hidden="true">
              <path fillRule="evenodd" d="M17 10a.75.75 0 0 1-.75.75H5.612l4.158 3.96a.75.75 0 1 1-1.04 1.08l-5.5-5.25a.75.75 0 0 1 0-1.08l5.5-5.25a.75.75 0 1 1 1.04 1.08L5.612 9.25H16.25A.75.75 0 0 1 17 10Z" clipRule="evenodd" />
            </svg>
            Volver al inicio de sesión
          </Link>
        )}

        {/* Indicador de progreso */}
        {step !== 'success' && (
          <div className={styles.stepIndicator} role="list" aria-label="Progreso">
            {STEPS.slice(0, 3).map((s, i) => (
              <div key={s} className={styles.stepItem} role="listitem">
                <div className={`${styles.stepDot} ${i < stepIndex ? styles.stepDone : ''} ${i === stepIndex ? styles.stepActive : ''}`}>
                  {i < stepIndex
                    ? <svg viewBox="0 0 12 12" fill="currentColor" width="10" height="10"><path d="M1 6l3.5 3.5L11 2" stroke="currentColor" strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round"/></svg>
                    : i + 1
                  }
                </div>
                <span className={`${styles.stepLabel} ${i === stepIndex ? styles.stepLabelActive : ''}`}>
                  {STEP_LABELS[i]}
                </span>
                {i < 2 && <div className={`${styles.stepLine} ${i < stepIndex ? styles.stepLineDone : ''}`} />}
              </div>
            ))}
          </div>
        )}

        {/* ── Paso 1: correo ── */}
        {step === 'email' && (
          <>
            <div className={styles.header}>
              <h1 className={styles.formTitle}>Recuperar contraseña</h1>
              <p className={styles.formSubtitle}>
                Ingresa tu correo y te enviaremos un código de 6 dígitos.
              </p>
            </div>
            <form onSubmit={handleSendEmail} className={styles.form} noValidate>
              <div className={styles.field}>
                <label className={styles.label} htmlFor="email">Correo electrónico</label>
                <input
                  id="email"
                  type="email"
                  className={`${styles.input} ${error ? styles.inputError : ''}`}
                  value={email}
                  onChange={(e) => { setEmail(e.target.value); setError('') }}
                  placeholder="usuario@enginesjds.com"
                  autoComplete="email"
                  required
                />
                {error && <span className={styles.errorMsg} role="alert">{error}</span>}
              </div>
              <button type="submit" className={styles.submitButton} disabled={loading}>
                {loading ? 'Enviando…' : 'Enviar código'}
              </button>
            </form>
          </>
        )}

        {/* ── Paso 2: código ── */}
        {step === 'code' && (
          <>
            <div className={styles.header}>
              <h1 className={styles.formTitle}>Ingresa el código</h1>
              <p className={styles.formSubtitle}>
                Enviamos un código de 6 dígitos a <strong className={styles.emailHighlight}>{email}</strong>.
                Tienes 10 minutos para usarlo.
              </p>
            </div>
            <form onSubmit={handleVerifyCode} className={styles.form} noValidate>
              <div className={styles.field}>
                <label className={styles.label} htmlFor="code">Código de verificación</label>
                <input
                  id="code"
                  type="text"
                  inputMode="numeric"
                  pattern="\d{6}"
                  maxLength={6}
                  className={`${styles.codeInput} ${error ? styles.inputError : ''}`}
                  value={code}
                  onChange={(e) => { setCode(e.target.value.replace(/\D/g, '')); setError('') }}
                  placeholder="000000"
                  autoComplete="one-time-code"
                  required
                />
                {error && <span className={styles.errorMsg} role="alert">{error}</span>}
              </div>

              <div className={styles.resendRow}>
                <span className={styles.resendHint}>¿No lo recibiste?</span>
                <button
                  type="button"
                  className={styles.resendBtn}
                  onClick={handleResend}
                  disabled={resendCooldown > 0 || loading}
                >
                  {resendCooldown > 0 ? `Reenviar en ${resendCooldown}s` : 'Reenviar código'}
                </button>
              </div>

              <div className={styles.formRow}>
                <button
                  type="button"
                  className={styles.backBtn}
                  onClick={() => { setStep('email'); setCode(''); setError('') }}
                >
                  Volver
                </button>
                <button type="submit" className={styles.submitButton} disabled={code.length !== 6 || loading}>
                  {loading ? 'Verificando…' : 'Continuar'}
                </button>
              </div>
            </form>
          </>
        )}

        {/* ── Paso 3: nueva contraseña ── */}
        {step === 'password' && (
          <>
            <div className={styles.header}>
              <h1 className={styles.formTitle}>Nueva contraseña</h1>
              <p className={styles.formSubtitle}>
                Elige una contraseña segura. Mínimo 8 caracteres, una mayúscula y un número.
              </p>
            </div>
            <form onSubmit={handleReset} className={styles.form} noValidate>
              <div className={styles.field}>
                <label className={styles.label} htmlFor="pwd">Nueva contraseña</label>
                <div className={styles.pwdWrapper}>
                  <input
                    id="pwd"
                    type={showPwd ? 'text' : 'password'}
                    className={`${styles.input} ${error ? styles.inputError : ''}`}
                    value={pwd}
                    onChange={(e) => { setPwd(e.target.value); setError('') }}
                    placeholder="Mínimo 8 caracteres"
                    autoComplete="new-password"
                    required
                  />
                  <button type="button" className={styles.eyeBtn} onClick={() => setShowPwd(v => !v)} aria-label={showPwd ? 'Ocultar' : 'Mostrar'}>
                    <EyeIcon open={showPwd} />
                  </button>
                </div>
              </div>
              <div className={styles.field}>
                <label className={styles.label} htmlFor="confirm">Confirmar contraseña</label>
                <div className={styles.pwdWrapper}>
                  <input
                    id="confirm"
                    type={showConfirm ? 'text' : 'password'}
                    className={`${styles.input} ${error ? styles.inputError : ''}`}
                    value={confirm}
                    onChange={(e) => { setConfirm(e.target.value); setError('') }}
                    placeholder="Repite la contraseña"
                    autoComplete="new-password"
                    required
                  />
                  <button type="button" className={styles.eyeBtn} onClick={() => setShowConfirm(v => !v)} aria-label={showConfirm ? 'Ocultar' : 'Mostrar'}>
                    <EyeIcon open={showConfirm} />
                  </button>
                </div>
              </div>

              {error && <div className={styles.errorBox} role="alert">{error}</div>}

              <div className={styles.formRow}>
                <button
                  type="button"
                  className={styles.backBtn}
                  onClick={() => { setStep('code'); setError('') }}
                >
                  Volver
                </button>
                <button type="submit" className={styles.submitButton} disabled={loading}>
                  {loading ? 'Guardando…' : 'Restablecer contraseña'}
                </button>
              </div>
            </form>
          </>
        )}

        {/* ── Paso 4: éxito ── */}
        {step === 'success' && (
          <div className={styles.successState}>
            <div className={styles.successIcon} aria-hidden="true">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" width="32" height="32">
                <polyline points="20 6 9 17 4 12" />
              </svg>
            </div>
            <h1 className={styles.formTitle}>¡Contraseña actualizada!</h1>
            <p className={styles.formSubtitle}>
              Tu contraseña fue restablecida correctamente. Ya puedes iniciar sesión con tu nueva contraseña.
            </p>
            <button
              className={styles.submitButton}
              onClick={() => navigate(ROUTES.login, { replace: true })}
            >
              Ir al inicio de sesión
            </button>
          </div>
        )}

      </div>
    </div>
  )
}
