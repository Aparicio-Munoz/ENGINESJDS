import { useCallback, useEffect, useRef, useState } from 'react'
import { brandsApi } from '../../../api'
import { ConfirmModal } from '../../../components/ConfirmModal/ConfirmModal'
import { Pagination } from '../../../components/Pagination/Pagination'
import { useToast } from '../../../hooks/useToast'
import styles from './Marcas.module.css'

const LIMIT = 12
const CATEGORIES = [
  'Aceites', 'Filtros', 'Llantas', 'Baterías',
  'Pastillas', 'Accesorios', 'Lubricantes', 'Eléctricos',
]
const STATUS_OPTIONS = ['Activo', 'Inactivo']

const CATEGORY_COLORS = {
  Aceites:     { bg: '#fef3c7', color: '#92400e' },
  Filtros:     { bg: '#d1fae5', color: '#047857' },
  Llantas:     { bg: '#e0e7ff', color: '#4338ca' },
  Baterías:    { bg: '#dbeafe', color: '#1d4ed8' },
  Pastillas:   { bg: '#fee2e2', color: '#b91c1c' },
  Accesorios:  { bg: '#ede9fe', color: '#6d28d9' },
  Lubricantes: { bg: '#ffedd5', color: '#9a3412' },
  Eléctricos:  { bg: '#cffafe', color: '#0e7490' },
}

const EMPTY_FORM = { name: '', category: '', price: '', status: 'Activo' }

function validate(form) {
  const errors = {}
  if (!form.name.trim()) errors.name = 'El nombre es obligatorio.'
  else if (form.name.trim().length > 100) errors.name = 'Máximo 100 caracteres.'
  if (!form.category) errors.category = 'Selecciona una categoría.'
  if (form.price === '' || form.price === null || form.price === undefined) {
    errors.price = 'El precio es requerido.'
  } else if (isNaN(Number(form.price)) || Number(form.price) <= 0) {
    errors.price = 'El precio debe ser mayor a $0.'
  }
  return errors
}

function fmtCOP(n) {
  if (n === null || n === undefined || n === '') return '—'
  return `$ ${Number(n).toLocaleString('es-CO')}`
}

export function Marcas() {
  const toast = useToast()
  const mountedRef = useRef(true)
  const searchTimerRef = useRef(null)

  const [brands, setBrands] = useState([])
  const [pagination, setPagination] = useState({ page: 1, totalPages: 1, total: 0 })
  const [page, setPage] = useState(1)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  const [searchInput, setSearchInput] = useState('')
  const [searchApplied, setSearchApplied] = useState('')
  const [filterCategory, setFilterCategory] = useState('')
  const [filterStatus, setFilterStatus] = useState('')

  const [modalOpen, setModalOpen] = useState(false)
  const [editTarget, setEditTarget] = useState(null)
  const [form, setForm] = useState(EMPTY_FORM)
  const [formErrors, setFormErrors] = useState({})
  const [saving, setSaving] = useState(false)

  const [deleteTarget, setDeleteTarget] = useState(null)
  const [deleting, setDeleting] = useState(false)

  useEffect(() => { mountedRef.current = true; return () => { mountedRef.current = false } }, [])

  const loadBrands = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const res = await brandsApi.getAll({
        search:   searchApplied || undefined,
        category: filterCategory || undefined,
        status:   filterStatus || undefined,
        sort:     'category',
        page,
        limit:    LIMIT,
      })
      if (!mountedRef.current) return
      setBrands(res.data ?? [])
      setPagination(res.pagination ?? { page, totalPages: 1, total: res.data?.length ?? 0 })
    } catch (err) {
      if (!mountedRef.current) return
      setError(err?.response?.data?.message ?? 'No se pudieron cargar las marcas. Verifica que la tabla brands existe en la base de datos.')
    } finally {
      if (mountedRef.current) setLoading(false)
    }
  }, [page, searchApplied, filterCategory, filterStatus])

  useEffect(() => { loadBrands() }, [loadBrands])

  function handleSearchChange(e) {
    const val = e.target.value
    setSearchInput(val)
    clearTimeout(searchTimerRef.current)
    searchTimerRef.current = setTimeout(() => { setPage(1); setSearchApplied(val.trim()) }, 400)
  }

  function openCreate() {
    setEditTarget(null)
    setForm(EMPTY_FORM)
    setFormErrors({})
    setModalOpen(true)
  }

  function openEdit(brand) {
    setEditTarget(brand)
    setForm({
      name: brand.name,
      category: brand.category,
      price: String(brand.price ?? ''),
      status: brand.status,
    })
    setFormErrors({})
    setModalOpen(true)
  }

  async function handleSubmit(e) {
    e.preventDefault()
    const errs = validate(form)
    if (Object.keys(errs).length) { setFormErrors(errs); return }

    setSaving(true)
    try {
      const payload = {
        name:     form.name.trim(),
        category: form.category,
        price:    Number(form.price),
        status:   form.status,
      }
      if (editTarget) {
        await brandsApi.update(editTarget.id, payload)
        toast.success('Marca actualizada correctamente')
      } else {
        await brandsApi.create(payload)
        toast.success('Marca registrada exitosamente')
      }
      if (!mountedRef.current) return
      setModalOpen(false)
      loadBrands()
    } catch (err) {
      if (!mountedRef.current) return
      const msg = err?.response?.data?.message
        ?? err?.response?.data?.errors?.[0]?.msg
        ?? 'Error al guardar la marca. Revisa los datos.'
      toast.error(msg)
    } finally {
      if (mountedRef.current) setSaving(false)
    }
  }

  async function handleDelete() {
    setDeleting(true)
    try {
      await brandsApi.remove(deleteTarget.id)
      if (!mountedRef.current) return
      toast.success(`Marca "${deleteTarget.name}" eliminada`)
      setDeleteTarget(null)
      if (brands.length === 1 && page > 1) setPage((p) => p - 1)
      else loadBrands()
    } catch (err) {
      if (!mountedRef.current) return
      toast.error(err?.response?.data?.message ?? 'No se pudo eliminar la marca')
    } finally {
      if (mountedRef.current) setDeleting(false)
    }
  }

  const hasFilters = searchApplied || filterCategory || filterStatus

  return (
    <section className={styles.page}>
      {/* Header */}
      <div className={styles.pageHeader}>
        <div>
          <p className={styles.eyebrow}>Módulo administrativo</p>
          <h1>Marcas de Repuestos</h1>
          <p>Gestiona las marcas disponibles por categoría con precio de referencia.</p>
        </div>
        <button className={styles.primaryButton} type="button" onClick={openCreate}>
          Agregar marca
        </button>
      </div>

      {/* Summary */}
      <div className={styles.summaryBar}>
        <span>{loading ? '…' : `${pagination.total} marca${pagination.total !== 1 ? 's' : ''} registrada${pagination.total !== 1 ? 's' : ''}`}</span>
      </div>

      {/* Filters */}
      <div className={styles.searchBar}>
        <div className={styles.searchWrapper}>
          <svg className={styles.searchIcon} viewBox="0 0 20 20" fill="currentColor" width="16" height="16" aria-hidden="true">
            <path fillRule="evenodd" d="M9 3.5a5.5 5.5 0 1 0 0 11 5.5 5.5 0 0 0 0-11ZM2 9a7 7 0 1 1 12.452 4.391l3.328 3.329a.75.75 0 1 1-1.06 1.06l-3.329-3.328A7 7 0 0 1 2 9Z" clipRule="evenodd" />
          </svg>
          <input
            className={styles.searchInput}
            type="search"
            placeholder="Buscar marca por nombre…"
            value={searchInput}
            onChange={handleSearchChange}
          />
        </div>
        <select className={styles.filterSelect} value={filterStatus} onChange={(e) => { setPage(1); setFilterStatus(e.target.value) }}>
          <option value="">Todos los estados</option>
          {STATUS_OPTIONS.map((s) => <option key={s} value={s}>{s}</option>)}
        </select>
      </div>

      {/* Category tabs */}
      <div className={styles.categoryTabs} role="group" aria-label="Filtrar por categoría">
        <button type="button" className={filterCategory === '' ? `${styles.categoryTab} ${styles.categoryTabActive}` : styles.categoryTab} onClick={() => { setPage(1); setFilterCategory('') }}>
          Todas
        </button>
        {CATEGORIES.map((cat) => (
          <button
            key={cat}
            type="button"
            className={filterCategory === cat ? `${styles.categoryTab} ${styles.categoryTabActive}` : styles.categoryTab}
            onClick={() => { setPage(1); setFilterCategory(cat) }}
          >
            {cat}
          </button>
        ))}
      </div>

      {/* Content */}
      {loading ? (
        <div className={styles.loadingState}><div className={styles.spinner} />Cargando marcas…</div>
      ) : error ? (
        <div className={styles.errorState}>
          <p>{error}</p>
          <button type="button" className={styles.retryButton} onClick={loadBrands}>Reintentar</button>
        </div>
      ) : brands.length === 0 ? (
        <div className={styles.emptyState}>
          {hasFilters ? 'Sin resultados para los filtros aplicados.' : 'No hay marcas registradas. Agrega la primera.'}
        </div>
      ) : (
        <>
          <div className={styles.tableWrapper}>
            <table className={styles.table}>
              <thead>
                <tr>
                  <th>Marca</th>
                  <th>Categoría</th>
                  <th>Precio</th>
                  <th>Estado</th>
                  <th>Acciones</th>
                </tr>
              </thead>
              <tbody>
                {brands.map((brand) => (
                  <tr key={brand.id}>
                    <td data-label="Marca"><strong className={styles.brandName}>{brand.name}</strong></td>
                    <td data-label="Categoría">
                      <span className={styles.categoryBadge} style={{
                        background: CATEGORY_COLORS[brand.category]?.bg,
                        color: CATEGORY_COLORS[brand.category]?.color,
                      }}>
                        {brand.category}
                      </span>
                    </td>
                    <td data-label="Precio"><span className={styles.priceValue}>{fmtCOP(brand.price)}</span></td>
                    <td data-label="Estado">
                      <span className={`${styles.statusBadge} ${brand.status === 'Activo' ? styles.statusActive : styles.statusInactive}`}>
                        {brand.status}
                      </span>
                    </td>
                    <td data-label="Acciones">
                      <div className={styles.actionsCell}>
                        <button className={styles.editButton} type="button" onClick={() => openEdit(brand)}>Editar</button>
                        <button className={styles.deleteButton} type="button" onClick={() => setDeleteTarget(brand)}>Eliminar</button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <Pagination page={page} totalPages={pagination.totalPages} total={pagination.total} onPageChange={setPage} disabled={loading} />
        </>
      )}

      {/* Create / Edit modal */}
      {modalOpen ? (
        <div className={styles.modalBackdrop} role="presentation">
          <section className={styles.modal} role="dialog" aria-modal="true" aria-labelledby="brand-modal-title">
            <div className={styles.modalHeader}>
              <div>
                <p className={styles.eyebrow}>{editTarget ? 'Edición' : 'Registro'}</p>
                <h2 id="brand-modal-title">{editTarget ? 'Editar marca' : 'Nueva marca'}</h2>
              </div>
              <button className={styles.iconButton} type="button" onClick={() => setModalOpen(false)}>×</button>
            </div>
            <form className={styles.form} onSubmit={handleSubmit}>
              <label className={styles.formField}>
                Nombre de la marca <span className={styles.required}>*</span>
                <input
                  type="text"
                  maxLength={100}
                  placeholder="Ej: Motul 7100"
                  value={form.name}
                  onChange={(e) => setForm((p) => ({ ...p, name: e.target.value }))}
                  autoFocus
                />
                {formErrors.name ? <span className={styles.fieldError}>{formErrors.name}</span> : null}
              </label>

              <label className={styles.formField}>
                Categoría <span className={styles.required}>*</span>
                <select value={form.category} onChange={(e) => setForm((p) => ({ ...p, category: e.target.value }))}>
                  <option value="">Selecciona una categoría…</option>
                  {CATEGORIES.map((cat) => <option key={cat} value={cat}>{cat}</option>)}
                </select>
                {formErrors.category ? <span className={styles.fieldError}>{formErrors.category}</span> : null}
              </label>

              <label className={styles.formField}>
                Precio ($) <span className={styles.required}>*</span>
                <input
                  type="number"
                  min="1"
                  step="0.01"
                  placeholder="Ej: 85000"
                  value={form.price}
                  onChange={(e) => setForm((p) => ({ ...p, price: e.target.value }))}
                />
                {formErrors.price ? <span className={styles.fieldError}>{formErrors.price}</span> : null}
              </label>

              <label className={styles.formField}>
                Estado
                <select value={form.status} onChange={(e) => setForm((p) => ({ ...p, status: e.target.value }))}>
                  {STATUS_OPTIONS.map((s) => <option key={s} value={s}>{s}</option>)}
                </select>
              </label>

              <div className={styles.formActions}>
                <button className={styles.secondaryButton} type="button" disabled={saving} onClick={() => setModalOpen(false)}>
                  Cancelar
                </button>
                <button className={styles.primaryButton} type="submit" disabled={saving}>
                  {saving ? 'Guardando…' : editTarget ? 'Guardar cambios' : 'Crear marca'}
                </button>
              </div>
            </form>
          </section>
        </div>
      ) : null}

      {/* Delete confirmation */}
      <ConfirmModal
        isOpen={Boolean(deleteTarget)}
        entityLabel={deleteTarget ? `${deleteTarget.name} (${deleteTarget.category}) — ${fmtCOP(deleteTarget.price)}` : ''}
        onConfirm={handleDelete}
        onCancel={() => { if (!deleting) setDeleteTarget(null) }}
      />
    </section>
  )
}
