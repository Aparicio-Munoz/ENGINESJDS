import { useCallback, useEffect, useRef, useState } from 'react'
import { backupsApi } from '../../../api/backupsApi'
import { Pagination } from '../../../components/Pagination/Pagination'
import { useToast } from '../../../hooks/useToast'
import styles from './Backups.module.css'

function fmtDate(d) {
  if (!d) return '—'
  return new Date(d).toLocaleString('es-CO', {
    day: '2-digit', month: '2-digit', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  })
}

function fmtSize(kb) {
  if (!kb) return '0 KB'
  if (kb >= 1024) return `${(kb / 1024).toFixed(1)} MB`
  return `${kb} KB`
}

function getBackupErrorMessage(err, fallback) {
  const status = err?.response?.status
  if (status === 401) return 'Tu sesión expiró.'
  if (status === 403) return 'No tienes permisos para administrar respaldos.'
  if (status === 404) return 'El recurso de respaldo no está disponible.'
  if (status === 409) return 'Ya hay una operación de respaldo o restauración en curso.'
  if (status === 500) return 'El servidor no pudo procesar el respaldo.'
  return err?.response?.data?.message ?? fallback
}

export function Backups() {
  const toast = useToast()
  const mountedRef = useRef(true)
  const fileInputRef = useRef(null)

  const [backups, setBackups] = useState([])
  const [pagination, setPagination] = useState(null)
  const [page, setPage] = useState(1)
  const [stats, setStats] = useState(null)
  const [capabilities, setCapabilities] = useState(null)
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState(null)
  const [creating, setCreating] = useState(false)
  const [restoring, setRestoring] = useState(false)
  const [deleteTarget, setDeleteTarget] = useState(null)
  const [deleting, setDeleting] = useState(false)

  // Restore modal
  const [restoreModal, setRestoreModal] = useState(false)
  const [restoreFile, setRestoreFile] = useState(null)
  const [restoreConfirmation, setRestoreConfirmation] = useState('')
  const [dragOver, setDragOver] = useState(false)

  useEffect(() => { mountedRef.current = true; return () => { mountedRef.current = false } }, [])

  const loadData = useCallback(async () => {
    setLoading(true)
    setLoadError(null)
    try {
      const capabilitiesRes = await backupsApi.getCapabilities()
      const [listRes, statsRes] = capabilitiesRes.manualBackupAvailable
        ? await Promise.all([
            backupsApi.getAll({ page, limit: 10 }),
            backupsApi.getStats(),
          ])
        : [null, null]
      if (!mountedRef.current) return
      setCapabilities(capabilitiesRes)
      setBackups(listRes?.data ?? [])
      setPagination(listRes?.pagination ?? null)
      setStats(statsRes)
    } catch (err) {
      if (mountedRef.current) {
        setCapabilities(null)
        setBackups([])
        setPagination(null)
        setStats(null)
        setLoadError(getBackupErrorMessage(err, 'Error al cargar respaldos.'))
      }
    } finally {
      if (mountedRef.current) setLoading(false)
    }
  }, [page])

  useEffect(() => {
    const timer = setTimeout(() => loadData(), 0)
    return () => clearTimeout(timer)
  }, [loadData])

  async function handleCreate() {
    if (!capabilities?.manualBackupAvailable) return
    setCreating(true)
    try {
      const backup = await backupsApi.create()
      toast.success(`Respaldo "${backup.filename}" creado (${fmtSize(backup.size_kb)})`)
      loadData()
    } catch (err) {
      toast.error(getBackupErrorMessage(err, 'Error al crear el respaldo.'))
    } finally {
      if (mountedRef.current) setCreating(false)
    }
  }

  async function handleDownload(backup) {
    try {
      await backupsApi.download(backup.id)
      toast.success(`Descargando ${backup.filename}`)
    } catch (err) {
      toast.error(getBackupErrorMessage(err, 'Error al descargar el respaldo.'))
    }
  }

  async function handleDelete() {
    if (!deleteTarget) return
    setDeleting(true)
    try {
      await backupsApi.remove(deleteTarget.id)
      toast.success(`Respaldo "${deleteTarget.filename}" eliminado`)
      setDeleteTarget(null)
      loadData()
    } catch (err) {
      toast.error(getBackupErrorMessage(err, 'Error al eliminar el respaldo.'))
    } finally {
      if (mountedRef.current) setDeleting(false)
    }
  }

  // ── Restore ────────────────────────────────────────────
  function handleFileDrop(e) {
    e.preventDefault(); setDragOver(false)
    const file = e.dataTransfer?.files?.[0]
    selectRestoreFile(file)
  }

  function handleFileSelect(e) {
    const file = e.target.files?.[0]
    selectRestoreFile(file)
  }

  function selectRestoreFile(file) {
    if (!file) return
    if (!file.name.toLowerCase().endsWith('.sql')) {
      toast.error('Selecciona un archivo .sql')
      return
    }
    if (file.size > 50 * 1024 * 1024) {
      toast.error('El archivo excede el límite de 50 MB')
      return
    }
    setRestoreFile(file)
  }

  async function handleRestore() {
    if (!restoreFile || !capabilities?.manualRestoreAvailable || restoreConfirmation !== 'RESTAURAR') return
    setRestoring(true)
    try {
      await backupsApi.restore(restoreFile, restoreConfirmation)
      toast.success('Base de datos restaurada exitosamente')
      setRestoreModal(false); setRestoreFile(null); setRestoreConfirmation('')
      loadData()
    } catch (err) {
      toast.error(getBackupErrorMessage(err, 'Error al restaurar el respaldo.'))
    } finally {
      if (mountedRef.current) setRestoring(false)
    }
  }

  const manualBackupAvailable = capabilities?.manualBackupAvailable === true
  const manualRestoreAvailable = capabilities?.manualRestoreAvailable === true
  const managedBackups = capabilities?.mode === 'managed'
  const aivenManagedBackups = managedBackups && capabilities?.provider === 'Aiven'

  return (
    <section className={styles.page}>
      {/* Header */}
      <div className={styles.pageHeader}>
        <div>
          <p className={styles.eyebrow}>Módulo administrativo</p>
          <h1>Respaldos</h1>
          <p>{managedBackups ? 'Consulta el estado de protección de la base de datos.' : 'Crea, descarga y restaura respaldos de la base de datos.'}</p>
        </div>
        <div className={styles.headerActions}>
          <button className={styles.primaryButton} type="button" onClick={handleCreate} disabled={!manualBackupAvailable || creating} title={!manualBackupAvailable ? 'Los respaldos manuales no están disponibles en este entorno.' : undefined}>
            {creating ? 'Creando…' : 'Crear respaldo'}
          </button>
          <button className={styles.secondaryButton} type="button" onClick={() => { setRestoreModal(true); setRestoreFile(null); setRestoreConfirmation('') }} disabled={!manualRestoreAvailable} title={!manualRestoreAvailable ? 'La restauración manual no está disponible en este entorno.' : undefined}>
            Restaurar
          </button>
        </div>
      </div>

      {loadError ? (
        <div className={styles.errorState} role="alert">
          <p>{loadError}</p>
          <button className={styles.secondaryButton} type="button" onClick={loadData}>Reintentar</button>
        </div>
      ) : capabilities && !manualBackupAvailable ? (
        <section className={styles.managedInfo} role="status">
          <p className={styles.eyebrow}>{managedBackups ? 'Base de datos administrada' : 'Operación no habilitada'}</p>
          <h2>{aivenManagedBackups ? 'Respaldos automáticos gestionados por Aiven' : managedBackups ? 'Base de datos gestionada por el proveedor' : 'Respaldos manuales deshabilitados'}</h2>
          <p>
            {managedBackups
              ? aivenManagedBackups
                ? 'La base de datos de producción usa respaldos automáticos gestionados por Aiven.'
                : 'SGTM no crea ni almacena dumps manuales en este entorno serverless.'
              : 'Este entorno no tiene habilitada la creación de respaldos manuales.'}
          </p>
          <p>Este módulo no consulta métricas ni fechas de respaldo del proveedor. La restauración debe gestionarse desde su plataforma o soporte autorizado.</p>
        </section>
      ) : null}

      {!loadError && stats && manualBackupAvailable ? (
        <div className={styles.statsGrid}>
          <div className={styles.statCard}>
            <span className={styles.statLabel}>Último respaldo</span>
            <strong className={styles.statValue}>{stats.lastBackupAt ? fmtDate(stats.lastBackupAt) : 'Nunca'}</strong>
          </div>
          <div className={styles.statCard}>
            <span className={styles.statLabel}>Total respaldos</span>
            <strong className={styles.statValue}>{stats.totalBackups}</strong>
          </div>
          <div className={styles.statCard}>
            <span className={styles.statLabel}>Espacio usado</span>
            <strong className={styles.statValue}>{fmtSize(stats.totalSizeKb)}</strong>
          </div>
          <div className={styles.statCard}>
            <span className={styles.statLabel}>Último estado</span>
            <strong className={`${styles.statValue} ${stats.lastStatus === 'SUCCESS' ? styles.statusOk : styles.statusFail}`}>
              {stats.lastStatus ?? '—'}
            </strong>
          </div>
        </div>
      ) : null}

      {loadError ? null : manualBackupAvailable && loading ? (
        <div className={styles.loadingState}><div className={styles.spinner} />Cargando respaldos…</div>
      ) : manualBackupAvailable && backups.length === 0 ? (
        <div className={styles.emptyState}>No hay respaldos registrados. Crea el primero.</div>
      ) : manualBackupAvailable ? (
        <>
          <div className={styles.tableWrapper}>
            <table className={styles.table}>
              <thead>
                <tr>
                  <th>Fecha</th>
                  <th>Archivo</th>
                  <th>Tamaño</th>
                  <th>Usuario</th>
                  <th>Estado</th>
                  <th>Acciones</th>
                </tr>
              </thead>
              <tbody>
                {backups.map((b) => (
                  <tr key={b.id}>
                    <td data-label="Fecha">{fmtDate(b.created_at)}</td>
                    <td data-label="Archivo"><span className={styles.filename}>{b.filename}</span></td>
                    <td data-label="Tamaño">{fmtSize(b.size_kb)}</td>
                    <td data-label="Usuario">{b.created_by_name ?? '—'}</td>
                    <td data-label="Estado">
                      <span className={`${styles.statusBadge} ${b.status === 'SUCCESS' ? styles.statusOk : styles.statusFail}`}>
                        {b.status === 'SUCCESS' ? 'Exitoso' : 'Fallido'}
                      </span>
                    </td>
                    <td data-label="Acciones">
                      <div className={styles.actionsCell}>
                        {b.status === 'SUCCESS' ? (
                          <button className={styles.downloadBtn} type="button" onClick={() => handleDownload(b)}>Descargar</button>
                        ) : null}
                        <button className={styles.deleteBtn} type="button" onClick={() => setDeleteTarget(b)}>Eliminar</button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <Pagination page={page} totalPages={pagination?.totalPages} total={pagination?.total} onPageChange={setPage} disabled={loading} />
        </>
      ) : null}

      {/* Delete modal */}
      {deleteTarget ? (
        <div className={styles.modalBackdrop}>
          <section className={styles.modal}>
            <div className={styles.modalHeader}>
              <h2>Eliminar respaldo</h2>
              <button className={styles.iconButton} type="button" onClick={() => !deleting && setDeleteTarget(null)}>×</button>
            </div>
            <p className={styles.modalText}>
              ¿Eliminar <strong>{deleteTarget.filename}</strong>? Esta acción no se puede deshacer.
            </p>
            <div className={styles.modalActions}>
              <button className={styles.secondaryButton} type="button" disabled={deleting} onClick={() => setDeleteTarget(null)}>Cancelar</button>
              <button className={styles.dangerButton} type="button" disabled={deleting} onClick={handleDelete}>
                {deleting ? 'Eliminando…' : 'Eliminar'}
              </button>
            </div>
          </section>
        </div>
      ) : null}

      {/* Restore modal */}
      {restoreModal ? (
        <div className={styles.modalBackdrop}>
          <section className={styles.modal}>
            <div className={styles.modalHeader}>
              <div>
                <p className={styles.eyebrow}>Restauración</p>
                <h2>Restaurar base de datos</h2>
              </div>
              <button className={styles.iconButton} type="button" onClick={() => !restoring && setRestoreModal(false)}>×</button>
            </div>

            <div
              className={`${styles.dropZone} ${dragOver ? styles.dropZoneActive : ''}`}
              onDragOver={(e) => { e.preventDefault(); setDragOver(true) }}
              onDragLeave={() => setDragOver(false)}
              onDrop={handleFileDrop}
              onClick={() => fileInputRef.current?.click()}
            >
              <input ref={fileInputRef} type="file" accept=".sql" className={styles.hiddenInput} onChange={handleFileSelect} />
              {restoreFile ? (
                <div className={styles.fileInfo}>
                  <svg viewBox="0 0 20 20" fill="currentColor" width="24" height="24" className={styles.fileIcon}>
                    <path fillRule="evenodd" d="M4.5 2A1.5 1.5 0 0 0 3 3.5v13A1.5 1.5 0 0 0 4.5 18h11a1.5 1.5 0 0 0 1.5-1.5V7.621a1.5 1.5 0 0 0-.44-1.06l-4.12-4.122A1.5 1.5 0 0 0 11.378 2H4.5Z" clipRule="evenodd" />
                  </svg>
                  <div>
                    <strong>{restoreFile.name}</strong>
                    <span className={styles.fileMeta}>{fmtSize(Math.round(restoreFile.size / 1024))}</span>
                  </div>
                  <button type="button" className={styles.fileRemove} onClick={(e) => { e.stopPropagation(); setRestoreFile(null) }}>×</button>
                </div>
              ) : (
                <div className={styles.dropPrompt}>
                  <svg viewBox="0 0 20 20" fill="currentColor" width="32" height="32" className={styles.dropIcon}>
                    <path d="M9.25 13.25a.75.75 0 0 0 1.5 0V4.636l2.955 3.129a.75.75 0 0 0 1.09-1.03l-4.25-4.5a.75.75 0 0 0-1.09 0l-4.25 4.5a.75.75 0 1 0 1.09 1.03L9.25 4.636v8.614Z" />
                    <path d="M3.5 12.75a.75.75 0 0 0-1.5 0v2.5A2.75 2.75 0 0 0 4.75 18h10.5A2.75 2.75 0 0 0 18 15.25v-2.5a.75.75 0 0 0-1.5 0v2.5c0 .69-.56 1.25-1.25 1.25H4.75c-.69 0-1.25-.56-1.25-1.25v-2.5Z" />
                  </svg>
                  <p>Arrastra un archivo .sql aquí</p>
                  <span>o haz click para seleccionar</span>
                </div>
              )}
            </div>

            <p className={styles.restoreWarn}>
              Esta acción sobrescribirá los datos actuales de la base de datos. Escribe RESTAURAR para confirmar.
            </p>

            <label className={styles.confirmationField}>
              Confirmación
              <input value={restoreConfirmation} onChange={(e) => setRestoreConfirmation(e.target.value)} placeholder="RESTAURAR" autoComplete="off" />
            </label>

            <div className={styles.modalActions}>
              <button className={styles.secondaryButton} type="button" disabled={restoring} onClick={() => setRestoreModal(false)}>Cancelar</button>
              <button className={styles.dangerButton} type="button" disabled={!restoreFile || restoreConfirmation !== 'RESTAURAR' || restoring} onClick={handleRestore}>
                {restoring ? 'Restaurando…' : 'Restaurar'}
              </button>
            </div>
          </section>
        </div>
      ) : null}
    </section>
  )
}
