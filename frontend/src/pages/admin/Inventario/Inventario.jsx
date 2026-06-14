import { useCallback, useEffect, useRef, useState } from 'react'
import { inventoryApi } from '../../../api'
import { useToast } from '../../../hooks/useToast'
import styles from './Inventario.module.css'

const LIMIT = 20
const CATEGORIES = ['Aceites', 'Filtros', 'Llantas', 'Frenos', 'Transmisión', 'Eléctricos', 'Accesorios']
const STATUS_OPTIONS = ['Disponible', 'Stock bajo', 'Agotado']
const SORT_OPTIONS = [
  { value: '', label: 'Ordenar por…' },
  { value: 'sold_count', label: 'Más vendidos' },
  { value: 'name', label: 'Nombre A–Z' },
  { value: 'quantity', label: 'Menor stock' },
  { value: 'created_at', label: 'Más recientes' },
]

const EMPTY_FORM = {
  code: '',
  name: '',
  brand: '',
  category: '',
  quantity: '',
  min_stock: '',
  unit_price: '',
  sale_price: '',
}

function validate(form) {
  const errors = {}
  const code = form.code.trim().toUpperCase()
  if (!code) errors.code = 'El código es obligatorio.'
  else if (!/^[A-Z0-9-]{3,20}$/.test(code)) errors.code = 'Código: 3–20 caracteres alfanuméricos o guiones.'

  if (!form.name.trim()) errors.name = 'El nombre es obligatorio.'
  if (!form.brand.trim()) errors.brand = 'La marca es obligatoria.'
  if (!form.category) errors.category = 'Selecciona una categoría.'

  const qty = Number(form.quantity)
  if (form.quantity === '') errors.quantity = 'La cantidad es obligatoria.'
  else if (!Number.isInteger(qty) || qty < 0) errors.quantity = 'Entero mayor o igual a 0.'

  const minStock = Number(form.min_stock)
  if (form.min_stock === '') errors.min_stock = 'El stock mínimo es obligatorio.'
  else if (!Number.isInteger(minStock) || minStock < 0) errors.min_stock = 'Entero mayor o igual a 0.'

  const unitPrice = Number(form.unit_price)
  if (form.unit_price === '') errors.unit_price = 'El precio de compra es obligatorio.'
  else if (isNaN(unitPrice) || unitPrice < 0) errors.unit_price = 'Precio de compra inválido.'

  const salePrice = Number(form.sale_price)
  if (form.sale_price === '') errors.sale_price = 'El precio de venta es obligatorio.'
  else if (isNaN(salePrice) || salePrice < 0) errors.sale_price = 'Precio de venta inválido.'
  else if (!isNaN(unitPrice) && salePrice < unitPrice) {
    errors.sale_price = 'El precio de venta debe ser ≥ al precio de compra.'
  }

  return errors
}

function fmt(n) {
  return `$ ${Number(n).toLocaleString('es-CO')}`
}

function SearchIcon() {
  return (
    <svg viewBox="0 0 20 20" fill="currentColor" width="16" height="16" aria-hidden="true">
      <path fillRule="evenodd" d="M9 3.5a5.5 5.5 0 1 0 0 11 5.5 5.5 0 0 0 0-11ZM2 9a7 7 0 1 1 12.452 4.391l3.328 3.329a.75.75 0 1 1-1.06 1.06l-3.329-3.328A7 7 0 0 1 2 9Z" clipRule="evenodd" />
    </svg>
  )
}

function XIcon() {
  return (
    <svg viewBox="0 0 20 20" fill="currentColor" width="14" height="14" aria-hidden="true">
      <path d="M6.28 5.22a.75.75 0 0 0-1.06 1.06L8.94 10l-3.72 3.72a.75.75 0 1 0 1.06 1.06L10 11.06l3.72 3.72a.75.75 0 1 0 1.06-1.06L11.06 10l3.72-3.72a.75.75 0 0 0-1.06-1.06L10 8.94 6.28 5.22Z" />
    </svg>
  )
}

export function Inventario() {
  const toast = useToast()
  const mountedRef = useRef(true)
  const searchTimerRef = useRef(null)

  // ── List state ───────────────────────────────────────
  const [items, setItems] = useState([])
  const [pagination, setPagination] = useState({ page: 1, totalPages: 1, total: 0 })
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [page, setPage] = useState(1)

  // ── Filters (two search values: display vs. applied) ──
  const [searchInput, setSearchInput] = useState('')
  const [searchApplied, setSearchApplied] = useState('')
  const [filterCategory, setFilterCategory] = useState('')
  const [filterBrand, setFilterBrand] = useState('')
  const [filterStatus, setFilterStatus] = useState('')
  const [sortBy, setSortBy] = useState('')

  // ── Brands for dropdown ───────────────────────────────
  const [brands, setBrands] = useState([])

  // ── Alerts ────────────────────────────────────────────
  const [alerts, setAlerts] = useState([])

  // ── Create modal ──────────────────────────────────────
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [formData, setFormData] = useState(EMPTY_FORM)
  const [formErrors, setFormErrors] = useState({})
  const [submitting, setSubmitting] = useState(false)

  // ── Delete modal ──────────────────────────────────────
  const [deleteTarget, setDeleteTarget] = useState(null)
  const [deleteReason, setDeleteReason] = useState('')
  const [deleteReasonError, setDeleteReasonError] = useState('')
  const [deleting, setDeleting] = useState(false)

  useEffect(() => {
    mountedRef.current = true
    return () => {
      mountedRef.current = false
      clearTimeout(searchTimerRef.current)
    }
  }, [])

  // Load brands once on mount
  useEffect(() => {
    inventoryApi.getBrands()
      .then((data) => { if (mountedRef.current) setBrands(data ?? []) })
      .catch(() => {})
  }, [])

  // Load alerts (refreshed after mutations)
  const loadAlerts = useCallback(() => {
    inventoryApi.getAlerts()
      .then((data) => { if (mountedRef.current) setAlerts(Array.isArray(data) ? data : []) })
      .catch(() => {})
  }, [])

  useEffect(() => { loadAlerts() }, [loadAlerts])

  // ── Main loader ───────────────────────────────────────
  const loadItems = useCallback(async (opts = {}) => {
    const { silent = false, targetPage = page } = opts
    if (!silent) setLoading(true)
    setError(null)
    try {
      const res = await inventoryApi.getAll({
        page: targetPage,
        limit: LIMIT,
        ...(searchApplied ? { search: searchApplied } : {}),
        ...(filterCategory ? { category: filterCategory } : {}),
        ...(filterBrand ? { brand: filterBrand } : {}),
        ...(filterStatus ? { status: filterStatus } : {}),
        ...(sortBy ? { sort: sortBy } : {}),
      })
      if (!mountedRef.current) return
      setItems(res.data ?? [])
      setPagination(res.pagination ?? { page: targetPage, totalPages: 1, total: res.data?.length ?? 0 })
    } catch (err) {
      if (!mountedRef.current) return
      setError(err.message || 'Error al cargar el inventario.')
    } finally {
      if (mountedRef.current) setLoading(false)
    }
  }, [page, searchApplied, filterCategory, filterBrand, filterStatus, sortBy])

  useEffect(() => { loadItems() }, [loadItems])

  // ── Search with debounce ──────────────────────────────
  function handleSearchChange(e) {
    const value = e.target.value
    setSearchInput(value)
    clearTimeout(searchTimerRef.current)
    searchTimerRef.current = setTimeout(() => {
      setPage(1)
      setSearchApplied(value)
    }, 400)
  }

  // ── Filter helpers ────────────────────────────────────
  function handleCategoryChange(cat) {
    setFilterCategory(cat)
    setPage(1)
  }

  function handleFilterChange(setter) {
    return (e) => {
      setter(e.target.value)
      setPage(1)
    }
  }

  function clearFilters() {
    clearTimeout(searchTimerRef.current)
    setSearchInput('')
    setSearchApplied('')
    setFilterCategory('')
    setFilterBrand('')
    setFilterStatus('')
    setSortBy('')
    setPage(1)
  }

  const hasActiveFilters = searchInput || filterCategory || filterBrand || filterStatus || sortBy

  // ── Create modal ──────────────────────────────────────
  function openModal() {
    setFormData(EMPTY_FORM)
    setFormErrors({})
    setIsModalOpen(true)
  }

  function closeModal() {
    setIsModalOpen(false)
    setFormErrors({})
  }

  function handleInputChange(e) {
    const { name, value } = e.target
    setFormData((prev) => ({ ...prev, [name]: value }))
    if (formErrors[name]) setFormErrors((prev) => ({ ...prev, [name]: undefined }))
  }

  async function handleCreate(e) {
    e.preventDefault()
    const errs = validate(formData)
    if (Object.keys(errs).length > 0) { setFormErrors(errs); return }
    setSubmitting(true)
    try {
      await inventoryApi.create({
        code: formData.code.trim().toUpperCase(),
        name: formData.name.trim(),
        brand: formData.brand.trim(),
        category: formData.category,
        quantity: Number(formData.quantity),
        min_stock: Number(formData.min_stock),
        unit_price: Number(formData.unit_price),
        sale_price: Number(formData.sale_price),
      })
      toast.success(`Repuesto "${formData.name.trim()}" registrado exitosamente`)
      closeModal()
      await loadItems({ silent: true, targetPage: 1 })
      setPage(1)
      loadAlerts()
    } catch (err) {
      toast.error(err.message || 'Error al registrar el repuesto.')
    } finally {
      if (mountedRef.current) setSubmitting(false)
    }
  }

  // ── Delete ────────────────────────────────────────────
  function handleDeleteClick(item) {
    setDeleteTarget(item)
    setDeleteReason('')
    setDeleteReasonError('')
  }

  function handleCancelDelete() {
    setDeleteTarget(null)
    setDeleteReason('')
    setDeleteReasonError('')
  }

  async function handleConfirmDelete() {
    const reason = deleteReason.trim()
    if (!reason) { setDeleteReasonError('El motivo de eliminación es obligatorio.'); return }
    setDeleting(true)
    try {
      await inventoryApi.remove(deleteTarget.id, reason)
      toast.success(`Repuesto "${deleteTarget.name}" eliminado exitosamente`)
      setDeleteTarget(null)
      await loadItems({ silent: true, targetPage: page })
      loadAlerts()
    } catch (err) {
      toast.error(err.message || 'Error al eliminar el repuesto.')
    } finally {
      if (mountedRef.current) setDeleting(false)
    }
  }

  // ── Derived alert counts ──────────────────────────────
  const lowStockCount = alerts.filter((a) => a.status === 'Stock bajo').length
  const outOfStockCount = alerts.filter((a) => a.status === 'Agotado').length

  // ── Render ────────────────────────────────────────────
  return (
    <section className={styles.page}>
      {/* ── Header ──────────────────────────────────────── */}
      <div className={styles.pageHeader}>
        <div>
          <p className={styles.eyebrow}>Módulo administrativo</p>
          <h1>Inventario</h1>
          <p>Gestión de repuestos y materiales registrados en el sistema.</p>
        </div>
        <button className={styles.primaryButton} type="button" onClick={openModal} disabled={loading}>
          + Nuevo repuesto
        </button>
      </div>

      {/* ── Summary bar ─────────────────────────────────── */}
      <div className={styles.summaryBar}>
        <span>{loading ? '...' : `${pagination.total} repuestos registrados`}</span>
        <span className={styles.summaryWarn}>{lowStockCount} con stock bajo</span>
        <span className={styles.summaryDanger}>{outOfStockCount} agotados</span>
        {hasActiveFilters && !loading ? (
          <span className={styles.summaryFiltered}>
            {items.length} resultado{items.length !== 1 ? 's' : ''} en esta página
          </span>
        ) : null}
      </div>

      {/* ── Filters ─────────────────────────────────────── */}
      <div className={styles.filterSection}>
        <div className={styles.filterBar}>
          <div className={styles.searchWrapper}>
            <span className={styles.searchIcon}><SearchIcon /></span>
            <input
              className={styles.searchInput}
              type="search"
              placeholder="Buscar por nombre, código o marca…"
              value={searchInput}
              onChange={handleSearchChange}
              aria-label="Buscar repuesto"
            />
          </div>

          <select
            className={styles.filterSelect}
            value={filterStatus}
            onChange={handleFilterChange(setFilterStatus)}
            aria-label="Filtrar por estado"
          >
            <option value="">Todos los estados</option>
            {STATUS_OPTIONS.map((s) => (
              <option key={s} value={s}>{s}</option>
            ))}
          </select>

          <select
            className={styles.filterSelect}
            value={filterBrand}
            onChange={handleFilterChange(setFilterBrand)}
            aria-label="Filtrar por marca"
          >
            <option value="">Todas las marcas</option>
            {brands.map((b) => (
              <option key={b} value={b}>{b}</option>
            ))}
          </select>

          <select
            className={styles.filterSelect}
            value={sortBy}
            onChange={handleFilterChange(setSortBy)}
            aria-label="Ordenar resultados"
          >
            {SORT_OPTIONS.map((o) => (
              <option key={o.value} value={o.value}>{o.label}</option>
            ))}
          </select>

          {hasActiveFilters ? (
            <button className={styles.clearBtn} type="button" onClick={clearFilters} title="Limpiar filtros">
              <XIcon />
              Limpiar
            </button>
          ) : null}
        </div>

        {/* Category tabs */}
        <div className={styles.categoryTabs} role="group" aria-label="Filtrar por categoría">
          <button
            type="button"
            className={filterCategory === '' ? `${styles.categoryTab} ${styles.categoryTabActive}` : styles.categoryTab}
            onClick={() => handleCategoryChange('')}
          >
            Todos
          </button>
          {CATEGORIES.map((cat) => (
            <button
              key={cat}
              type="button"
              className={filterCategory === cat ? `${styles.categoryTab} ${styles.categoryTabActive}` : styles.categoryTab}
              onClick={() => handleCategoryChange(cat)}
            >
              {cat}
            </button>
          ))}
        </div>
      </div>

      {/* ── Loading ──────────────────────────────────────── */}
      {loading ? (
        <div className={styles.loadingState}>
          <div className={styles.spinner} aria-hidden="true" />
          <p>Cargando inventario...</p>
        </div>
      ) : error ? (
        /* ── Error ───────────────────────────────────────── */
        <div className={styles.errorState}>
          <p>{error}</p>
          <button className={styles.primaryButton} type="button" onClick={() => loadItems()}>
            Reintentar
          </button>
        </div>
      ) : (
        /* ── Table ───────────────────────────────────────── */
        <>
          <div className={styles.tableWrapper}>
            {items.length === 0 ? (
              <div className={styles.emptyState}>
                <p className={styles.emptyTitle}>Sin resultados</p>
                <p className={styles.emptyMsg}>
                  {hasActiveFilters
                    ? 'Ningún repuesto coincide con los filtros actuales.'
                    : 'Aún no hay repuestos registrados.'}
                </p>
                {hasActiveFilters ? (
                  <button className={styles.clearBtnAlt} type="button" onClick={clearFilters}>
                    Limpiar filtros
                  </button>
                ) : null}
              </div>
            ) : (
              <table className={styles.table}>
                <thead>
                  <tr>
                    <th>Código</th>
                    <th>Nombre</th>
                    <th>Marca</th>
                    <th>Categoría</th>
                    <th>Stock</th>
                    <th>Stock mín.</th>
                    <th>P. compra</th>
                    <th>P. venta</th>
                    <th>Estado</th>
                    <th>Acciones</th>
                  </tr>
                </thead>
                <tbody>
                  {items.map((item) => (
                    <tr key={item.id}>
                      <td data-label="Código">
                        <span className={styles.itemCode}>{item.code}</span>
                      </td>
                      <td data-label="Nombre">{item.name}</td>
                      <td data-label="Marca">{item.brand}</td>
                      <td data-label="Categoría">
                        {item.category ? (
                          <span className={styles.categoryBadge}>{item.category}</span>
                        ) : '—'}
                      </td>
                      <td data-label="Stock">
                        <span className={styles.quantity}>{item.quantity}</span>
                      </td>
                      <td data-label="Stock mín.">{item.min_stock}</td>
                      <td data-label="P. compra">
                        <span className={styles.price}>{fmt(item.unit_price)}</span>
                      </td>
                      <td data-label="P. venta">
                        <span className={styles.price}>{fmt(item.sale_price)}</span>
                      </td>
                      <td data-label="Estado">
                        <span className={styles.statusBadge} data-status={item.status}>
                          <span className={styles.statusDot} data-status={item.status} aria-hidden="true" />
                          {item.status}
                        </span>
                      </td>
                      <td data-label="Acciones">
                        <button
                          className={styles.deleteButton}
                          type="button"
                          disabled={deleting && deleteTarget?.id === item.id}
                          onClick={() => handleDeleteClick(item)}
                        >
                          Eliminar
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>

          {/* ── Pagination ────────────────────────────────── */}
          {pagination.totalPages > 1 ? (
            <div className={styles.pagination}>
              <button
                className={styles.secondaryButton}
                type="button"
                disabled={page <= 1}
                onClick={() => setPage((p) => p - 1)}
              >
                Anterior
              </button>
              <span>Página {page} de {pagination.totalPages}</span>
              <button
                className={styles.secondaryButton}
                type="button"
                disabled={page >= pagination.totalPages}
                onClick={() => setPage((p) => p + 1)}
              >
                Siguiente
              </button>
            </div>
          ) : null}
        </>
      )}

      {/* ── Create modal ──────────────────────────────────── */}
      {isModalOpen ? (
        <div className={styles.modalBackdrop} role="presentation">
          <section
            aria-labelledby="inventory-modal-title"
            className={styles.modal}
            role="dialog"
            aria-modal="true"
          >
            <div className={styles.modalHeader}>
              <div>
                <p className={styles.eyebrow}>Registro</p>
                <h2 id="inventory-modal-title">Nuevo repuesto</h2>
              </div>
              <button
                className={styles.iconButton}
                type="button"
                onClick={closeModal}
                aria-label="Cerrar"
                disabled={submitting}
              >
                <svg viewBox="0 0 20 20" fill="currentColor" width="16" height="16" aria-hidden="true">
                  <path d="M6.28 5.22a.75.75 0 0 0-1.06 1.06L8.94 10l-3.72 3.72a.75.75 0 1 0 1.06 1.06L10 11.06l3.72 3.72a.75.75 0 1 0 1.06-1.06L11.06 10l3.72-3.72a.75.75 0 0 0-1.06-1.06L10 8.94 6.28 5.22Z" />
                </svg>
              </button>
            </div>

            <form className={styles.form} onSubmit={handleCreate}>
              <label className={styles.formField}>
                Código *
                <input
                  name="code"
                  value={formData.code}
                  onChange={handleInputChange}
                  placeholder="REP-001"
                  disabled={submitting}
                />
                {formErrors.code ? <span>{formErrors.code}</span> : null}
              </label>

              <label className={styles.formField}>
                Marca *
                <input
                  name="brand"
                  value={formData.brand}
                  onChange={handleInputChange}
                  placeholder="NGK"
                  disabled={submitting}
                />
                {formErrors.brand ? <span>{formErrors.brand}</span> : null}
              </label>

              <label className={`${styles.formField} ${styles.fullWidth}`}>
                Nombre del repuesto *
                <input
                  name="name"
                  value={formData.name}
                  onChange={handleInputChange}
                  placeholder="Filtro de aceite"
                  disabled={submitting}
                />
                {formErrors.name ? <span>{formErrors.name}</span> : null}
              </label>

              <label className={`${styles.formField} ${styles.fullWidth}`}>
                Categoría *
                <select
                  name="category"
                  value={formData.category}
                  onChange={handleInputChange}
                  className={styles.formSelect}
                  disabled={submitting}
                >
                  <option value="">Selecciona una categoría…</option>
                  {CATEGORIES.map((cat) => (
                    <option key={cat} value={cat}>{cat}</option>
                  ))}
                </select>
                {formErrors.category ? <span>{formErrors.category}</span> : null}
              </label>

              <label className={styles.formField}>
                Stock inicial *
                <input
                  inputMode="numeric"
                  name="quantity"
                  value={formData.quantity}
                  onChange={handleInputChange}
                  placeholder="10"
                  disabled={submitting}
                />
                {formErrors.quantity ? <span>{formErrors.quantity}</span> : null}
              </label>

              <label className={styles.formField}>
                Stock mínimo *
                <input
                  inputMode="numeric"
                  name="min_stock"
                  value={formData.min_stock}
                  onChange={handleInputChange}
                  placeholder="5"
                  disabled={submitting}
                />
                {formErrors.min_stock ? <span>{formErrors.min_stock}</span> : null}
              </label>

              <label className={styles.formField}>
                Precio de compra (COP) *
                <input
                  inputMode="decimal"
                  name="unit_price"
                  value={formData.unit_price}
                  onChange={handleInputChange}
                  placeholder="18000"
                  disabled={submitting}
                />
                {formErrors.unit_price ? <span>{formErrors.unit_price}</span> : null}
              </label>

              <label className={styles.formField}>
                Precio de venta (COP) *
                <input
                  inputMode="decimal"
                  name="sale_price"
                  value={formData.sale_price}
                  onChange={handleInputChange}
                  placeholder="25000"
                  disabled={submitting}
                />
                {formErrors.sale_price ? <span>{formErrors.sale_price}</span> : null}
              </label>

              <div className={styles.formActions}>
                <button
                  className={styles.secondaryButton}
                  type="button"
                  onClick={closeModal}
                  disabled={submitting}
                >
                  Cancelar
                </button>
                <button className={styles.primaryButton} type="submit" disabled={submitting}>
                  {submitting ? 'Guardando...' : 'Guardar repuesto'}
                </button>
              </div>
            </form>
          </section>
        </div>
      ) : null}

      {/* ── Delete with reason modal ───────────────────────── */}
      {deleteTarget ? (
        <div className={styles.modalBackdrop} role="presentation">
          <section
            className={styles.modal}
            role="alertdialog"
            aria-modal="true"
            aria-labelledby="delete-inv-title"
            aria-describedby="delete-inv-desc"
          >
            <div className={styles.modalHeader}>
              <div>
                <p className={`${styles.eyebrow} ${styles.eyebrowDanger}`}>Acción irreversible</p>
                <h2 id="delete-inv-title">Eliminar repuesto</h2>
              </div>
              <button
                className={styles.iconButton}
                type="button"
                onClick={handleCancelDelete}
                aria-label="Cerrar"
                disabled={deleting}
              >
                <svg viewBox="0 0 20 20" fill="currentColor" width="16" height="16" aria-hidden="true">
                  <path d="M6.28 5.22a.75.75 0 0 0-1.06 1.06L8.94 10l-3.72 3.72a.75.75 0 1 0 1.06 1.06L10 11.06l3.72 3.72a.75.75 0 1 0 1.06-1.06L11.06 10l3.72-3.72a.75.75 0 0 0-1.06-1.06L10 8.94 6.28 5.22Z" />
                </svg>
              </button>
            </div>

            <p id="delete-inv-desc" className={styles.deleteDesc}>
              Estás a punto de eliminar{' '}
              <strong>&ldquo;{deleteTarget.code} — {deleteTarget.name}&rdquo;</strong>.
              Esta acción no se puede deshacer. El repuesto no puede tener historial en órdenes.
            </p>

            <label className={`${styles.formField} ${styles.fullWidth}`}>
              Motivo de eliminación <span className={styles.required}>*</span>
              <textarea
                className={`${styles.textarea} ${deleteReasonError ? styles.textareaError : ''}`}
                rows={4}
                placeholder="Describe el motivo por el que se elimina este repuesto..."
                value={deleteReason}
                disabled={deleting}
                onChange={(e) => {
                  setDeleteReason(e.target.value)
                  if (e.target.value.trim()) setDeleteReasonError('')
                }}
              />
              {deleteReasonError ? <span>{deleteReasonError}</span> : null}
            </label>

            <div className={styles.formActions}>
              <button
                className={styles.secondaryButton}
                type="button"
                onClick={handleCancelDelete}
                disabled={deleting}
              >
                Cancelar
              </button>
              <button
                className={styles.dangerButton}
                type="button"
                onClick={handleConfirmDelete}
                disabled={deleting}
              >
                {deleting ? 'Eliminando...' : 'Confirmar eliminación'}
              </button>
            </div>
          </section>
        </div>
      ) : null}
    </section>
  )
}
