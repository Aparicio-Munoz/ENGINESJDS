import { useEffect, useRef, useState } from 'react'
import { settingsApi } from '../../../api/settingsApi'
import { useToast } from '../../../hooks/useToast'
import styles from './Configuracion.module.css'

export function Configuracion() {
  const toast = useToast()
  const mountedRef = useRef(true)
  const [settings, setSettings] = useState(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [section, setSection] = useState('info')

  useEffect(() => {
    mountedRef.current = true
    loadSettings()
    return () => { mountedRef.current = false }
  }, [])

  async function loadSettings() {
    setLoading(true)
    try {
      const data = await settingsApi.get()
      if (mountedRef.current) setSettings(data)
    } catch { if (mountedRef.current) toast.error('Error al cargar configuración') }
    finally { if (mountedRef.current) setLoading(false) }
  }

  async function handleSave(fields) {
    setSaving(true)
    try {
      const updated = await settingsApi.update(fields)
      if (mountedRef.current) { setSettings(updated); toast.success('Configuración guardada') }
    } catch (err) { toast.error(err?.response?.data?.message ?? 'Error al guardar') }
    finally { if (mountedRef.current) setSaving(false) }
  }

  async function handleLogoUpload(e) {
    const file = e.target.files?.[0]
    if (!file) return
    setSaving(true)
    try {
      const updated = await settingsApi.uploadLogo(file)
      if (mountedRef.current) { setSettings(updated); toast.success('Logo actualizado') }
    } catch (err) { toast.error(err?.response?.data?.message ?? 'Error al subir logo') }
    finally { if (mountedRef.current) setSaving(false) }
  }

  function upd(key, val) { setSettings((p) => ({ ...p, [key]: val })) }
  function updHours(key, val) {
    setSettings((p) => {
      const wh = typeof p.working_hours === 'string' ? JSON.parse(p.working_hours) : (p.working_hours ?? {})
      return { ...p, working_hours: { ...wh, [key]: val } }
    })
  }

  const wh = settings?.working_hours
    ? (typeof settings.working_hours === 'string' ? JSON.parse(settings.working_hours) : settings.working_hours)
    : {}

  const TABS = [
    { id: 'info', label: 'Taller', icon: '🏢' },
    { id: 'logo', label: 'Logo', icon: '🖼️' },
    { id: 'social', label: 'Redes', icon: '🌐' },
    { id: 'billing', label: 'Facturación', icon: '💰' },
    { id: 'signature', label: 'Firma', icon: '✍️' },
    { id: 'appearance', label: 'Apariencia', icon: '🎨' },
    { id: 'hours', label: 'Horarios', icon: '🕐' },
    { id: 'security', label: 'Seguridad', icon: '🔒' },
  ]

  if (loading) return <div className={styles.page}><div className={styles.loadingState}><div className={styles.spinner} />Cargando configuración…</div></div>
  if (!settings) return <div className={styles.page}><div className={styles.loadingState}>Error al cargar configuración</div></div>

  return (
    <div className={styles.page}>
      <header className={styles.pageHeader}>
        <div>
          <p className={styles.eyebrow}>Sistema</p>
          <h1 className={styles.title}>Configuración</h1>
          <p className={styles.subtitle}>Personaliza completamente tu taller.</p>
        </div>
      </header>

      {/* Tabs */}
      <nav className={styles.tabNav}>
        {TABS.map((t) => (
          <button key={t.id} type="button" className={`${styles.tab} ${section === t.id ? styles.tabActive : ''}`} onClick={() => setSection(t.id)}>
            <span>{t.icon}</span> {t.label}
          </button>
        ))}
      </nav>

      <div className={styles.layout}>
        {/* ── 1. Info del taller ──────────────────── */}
        {section === 'info' ? (
          <section className={styles.section}>
            <h2 className={styles.sectionTitle}>Información del Taller</h2>
            <form className={styles.form} onSubmit={(e) => { e.preventDefault(); handleSave({ business_name: settings.business_name, slogan: settings.slogan, address: settings.address, phone: settings.phone, email: settings.email, whatsapp: settings.whatsapp }) }}>
              <div className={styles.field}><label className={styles.label}>Nombre del taller</label><input className={styles.input} value={settings.business_name ?? ''} onChange={(e) => upd('business_name', e.target.value)} /></div>
              <div className={styles.field}><label className={styles.label}>Slogan</label><input className={styles.input} value={settings.slogan ?? ''} onChange={(e) => upd('slogan', e.target.value)} /></div>
              <div className={`${styles.field} ${styles.fieldFull}`}><label className={styles.label}>Dirección</label><input className={styles.input} value={settings.address ?? ''} onChange={(e) => upd('address', e.target.value)} /></div>
              <div className={styles.field}><label className={styles.label}>Teléfono</label><input className={styles.input} value={settings.phone ?? ''} onChange={(e) => upd('phone', e.target.value)} /></div>
              <div className={styles.field}><label className={styles.label}>WhatsApp</label><input className={styles.input} value={settings.whatsapp ?? ''} onChange={(e) => upd('whatsapp', e.target.value)} /></div>
              <div className={`${styles.field} ${styles.fieldFull}`}><label className={styles.label}>Correo electrónico</label><input className={styles.input} type="email" value={settings.email ?? ''} onChange={(e) => upd('email', e.target.value)} /></div>
              <div className={styles.formActions}><button type="submit" className={styles.primaryButton} disabled={saving}>{saving ? 'Guardando…' : 'Guardar'}</button></div>
            </form>
          </section>
        ) : null}

        {/* ── 2. Logo ────────────────────────────── */}
        {section === 'logo' ? (
          <section className={styles.section}>
            <h2 className={styles.sectionTitle}>Logo del Taller</h2>
            <div className={styles.logoSection}>
              {settings.logo_url ? (
                <div className={styles.logoPreview}><img src={settings.logo_url} alt="Logo" /><button type="button" className={styles.dangerBtn} onClick={() => handleSave({ logo_url: null })}>Eliminar logo</button></div>
              ) : <p className={styles.noLogo}>Sin logo configurado</p>}
              <label className={styles.uploadLabel}>
                <input type="file" accept="image/*" className={styles.hiddenInput} onChange={handleLogoUpload} />
                <span className={styles.uploadBtn}>{saving ? 'Subiendo…' : 'Subir imagen'}</span>
              </label>
            </div>
          </section>
        ) : null}

        {/* ── 3. Redes sociales ──────────────────── */}
        {section === 'social' ? (
          <section className={styles.section}>
            <h2 className={styles.sectionTitle}>Redes Sociales</h2>
            <form className={styles.form} onSubmit={(e) => { e.preventDefault(); handleSave({ facebook: settings.facebook, instagram: settings.instagram, website: settings.website }) }}>
              <div className={styles.field}><label className={styles.label}>Facebook</label><input className={styles.input} placeholder="https://facebook.com/enginesjds" value={settings.facebook ?? ''} onChange={(e) => upd('facebook', e.target.value)} /></div>
              <div className={styles.field}><label className={styles.label}>Instagram</label><input className={styles.input} placeholder="https://instagram.com/enginesjds" value={settings.instagram ?? ''} onChange={(e) => upd('instagram', e.target.value)} /></div>
              <div className={`${styles.field} ${styles.fieldFull}`}><label className={styles.label}>Página web</label><input className={styles.input} value={settings.website ?? ''} onChange={(e) => upd('website', e.target.value)} /></div>
              <div className={styles.formActions}><button type="submit" className={styles.primaryButton} disabled={saving}>{saving ? 'Guardando…' : 'Guardar'}</button></div>
            </form>
          </section>
        ) : null}

        {/* ── 4. Facturación ─────────────────────── */}
        {section === 'billing' ? (
          <section className={styles.section}>
            <h2 className={styles.sectionTitle}>Facturación</h2>
            <form className={styles.form} onSubmit={(e) => { e.preventDefault(); handleSave({ currency: settings.currency, tax_percent: settings.tax_percent, footer_message: settings.footer_message }) }}>
              <div className={styles.field}><label className={styles.label}>Moneda</label><input className={styles.input} value={settings.currency ?? 'COP'} onChange={(e) => upd('currency', e.target.value)} /></div>
              <div className={styles.field}><label className={styles.label}>IVA (%)</label><input className={styles.input} type="number" min="0" max="100" step="0.01" value={settings.tax_percent ?? 0} onChange={(e) => upd('tax_percent', e.target.value)} /></div>
              <div className={`${styles.field} ${styles.fieldFull}`}><label className={styles.label}>Mensaje pie de factura</label><textarea className={styles.textarea} rows={3} value={settings.footer_message ?? ''} onChange={(e) => upd('footer_message', e.target.value)} /></div>
              <div className={styles.formActions}><button type="submit" className={styles.primaryButton} disabled={saving}>{saving ? 'Guardando…' : 'Guardar'}</button></div>
            </form>
          </section>
        ) : null}

        {/* ── 5. Firma digital ───────────────────── */}
        {section === 'signature' ? (
          <section className={styles.section}>
            <h2 className={styles.sectionTitle}>Firma Digital</h2>
            <form className={styles.form} onSubmit={(e) => { e.preventDefault(); handleSave({ signature_name: settings.signature_name, signature_position: settings.signature_position }) }}>
              <div className={styles.field}><label className={styles.label}>Nombre</label><input className={styles.input} placeholder="José García" value={settings.signature_name ?? ''} onChange={(e) => upd('signature_name', e.target.value)} /></div>
              <div className={styles.field}><label className={styles.label}>Cargo</label><input className={styles.input} placeholder="Gerente Técnico" value={settings.signature_position ?? ''} onChange={(e) => upd('signature_position', e.target.value)} /></div>
              <div className={styles.formActions}><button type="submit" className={styles.primaryButton} disabled={saving}>{saving ? 'Guardando…' : 'Guardar'}</button></div>
            </form>
          </section>
        ) : null}

        {/* ── 6. Apariencia ──────────────────────── */}
        {section === 'appearance' ? (
          <section className={styles.section}>
            <h2 className={styles.sectionTitle}>Apariencia</h2>
            <form className={styles.form} onSubmit={(e) => { e.preventDefault(); handleSave({ primary_color: settings.primary_color, secondary_color: settings.secondary_color }) }}>
              <div className={styles.field}>
                <label className={styles.label}>Color principal</label>
                <div className={styles.colorRow}>
                  <input type="color" value={settings.primary_color ?? '#F97316'} onChange={(e) => upd('primary_color', e.target.value)} className={styles.colorInput} />
                  <input className={styles.input} value={settings.primary_color ?? ''} onChange={(e) => upd('primary_color', e.target.value)} />
                </div>
              </div>
              <div className={styles.field}>
                <label className={styles.label}>Color secundario</label>
                <div className={styles.colorRow}>
                  <input type="color" value={settings.secondary_color ?? '#1E293B'} onChange={(e) => upd('secondary_color', e.target.value)} className={styles.colorInput} />
                  <input className={styles.input} value={settings.secondary_color ?? ''} onChange={(e) => upd('secondary_color', e.target.value)} />
                </div>
              </div>
              <div className={`${styles.field} ${styles.fieldFull}`}>
                <label className={styles.label}>Vista previa</label>
                <div className={styles.preview} style={{ background: settings.secondary_color ?? '#1E293B' }}>
                  <span style={{ color: settings.primary_color ?? '#F97316', fontWeight: 800, fontSize: '1.2rem' }}>◈ {settings.business_name}</span>
                  <span style={{ color: '#94A3B8', fontSize: '0.82rem' }}>{settings.slogan}</span>
                </div>
              </div>
              <div className={styles.formActions}><button type="submit" className={styles.primaryButton} disabled={saving}>{saving ? 'Guardando…' : 'Guardar'}</button></div>
            </form>
          </section>
        ) : null}

        {/* ── 7. Horarios ────────────────────────── */}
        {section === 'hours' ? (
          <section className={styles.section}>
            <h2 className={styles.sectionTitle}>Horarios de Atención</h2>
            <form className={styles.form} onSubmit={(e) => { e.preventDefault(); handleSave({ working_hours: wh }) }}>
              <div className={styles.field}><label className={styles.label}>Lunes a Viernes</label><input className={styles.input} placeholder="8:00 AM - 6:00 PM" value={wh.weekdays ?? ''} onChange={(e) => updHours('weekdays', e.target.value)} /></div>
              <div className={styles.field}><label className={styles.label}>Sábado</label><input className={styles.input} placeholder="8:00 AM - 1:00 PM" value={wh.saturday ?? ''} onChange={(e) => updHours('saturday', e.target.value)} /></div>
              <div className={styles.field}><label className={styles.label}>Domingo</label><input className={styles.input} placeholder="Cerrado" value={wh.sunday ?? ''} onChange={(e) => updHours('sunday', e.target.value)} /></div>
              <div className={styles.formActions}><button type="submit" className={styles.primaryButton} disabled={saving}>{saving ? 'Guardando…' : 'Guardar'}</button></div>
            </form>
          </section>
        ) : null}

        {/* ── 8. Seguridad ──────────────────────── */}
        {section === 'security' ? (
          <section className={styles.section}>
            <h2 className={styles.sectionTitle}>Seguridad</h2>
            <div className={styles.form}>
              <div className={`${styles.field} ${styles.fieldFull}`}>
                <div className={styles.switchRow}>
                  <div>
                    <label className={styles.label}>Permitir registro público</label>
                    <p className={styles.fieldDesc}>Cuando está activo, cualquier persona puede crear una cuenta desde la pantalla de login. Los nuevos usuarios se crean con rol Recepcionista.</p>
                  </div>
                  <button
                    type="button"
                    role="switch"
                    aria-checked={Boolean(settings.allow_public_registration)}
                    className={`${styles.toggle} ${settings.allow_public_registration ? styles.toggleOn : ''}`}
                    onClick={() => { const next = settings.allow_public_registration ? 0 : 1; upd('allow_public_registration', next); handleSave({ allow_public_registration: next }) }}
                  >
                    <span className={styles.toggleKnob} />
                  </button>
                </div>
              </div>
            </div>
          </section>
        ) : null}
      </div>
    </div>
  )
}
