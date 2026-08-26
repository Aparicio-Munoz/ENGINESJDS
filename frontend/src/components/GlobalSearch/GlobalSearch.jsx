import { useEffect, useMemo, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { getClients } from '../../services/clientsService'
import { getEmployees } from '../../services/employeesService'
import { getInventory } from '../../services/inventoryService'
import { getMotorcycles } from '../../services/motorcyclesService'
import { getOrders } from '../../services/ordersService'
import { getUsers } from '../../services/usersService'
import { ROUTES } from '../../utils/routes'
import styles from './GlobalSearch.module.css'

const CATEGORIES = [
  {
    key: 'clientes',
    label: 'Clientes',
    link: ROUTES.adminClientes,
    icon: (
      <svg viewBox="0 0 20 20" fill="currentColor" width="14" height="14" aria-hidden="true">
        <path d="M7 8a3 3 0 1 0 0-6 3 3 0 0 0 0 6ZM14.5 9a2.5 2.5 0 1 0 0-5 2.5 2.5 0 0 0 0 5ZM1.615 16.428a1.224 1.224 0 0 1-.569-1.175 6.002 6.002 0 0 1 11.908 0c.058.467-.172.92-.57 1.174A9.953 9.953 0 0 1 7 17a9.953 9.953 0 0 1-5.385-1.572ZM14.5 16h-.106c.07-.297.088-.611.048-.933a7.47 7.47 0 0 0-1.588-3.755 4.502 4.502 0 0 1 5.874 2.636.818.818 0 0 1-.36.98A7.465 7.465 0 0 1 14.5 16Z" />
      </svg>
    ),
    getData: () => getClients([]),
    match: (item, q) => item.name?.toLowerCase().includes(q) || item.document?.toLowerCase().includes(q),
    getTitle: (item) => item.name,
    getSub: (item) => item.document || item.phone || '',
  },
  {
    key: 'motocicletas',
    label: 'Motocicletas',
    link: `${ROUTES.admin}/motocicletas`,
    icon: (
      <svg viewBox="0 0 20 20" fill="currentColor" width="14" height="14" aria-hidden="true">
        <path fillRule="evenodd" d="M11.49 3.17c-.38-1.56-2.6-1.56-2.98 0a1.532 1.532 0 0 1-2.286.948c-1.372-.836-2.942.734-2.106 2.106.54.886.061 2.042-.947 2.287-1.561.379-1.561 2.6 0 2.978a1.532 1.532 0 0 1 .947 2.287c-.836 1.372.734 2.942 2.106 2.106a1.532 1.532 0 0 1 2.287.947c.379 1.561 2.6 1.561 2.978 0a1.533 1.533 0 0 1 2.287-.947c1.372.836 2.942-.734 2.106-2.106a1.533 1.533 0 0 1 .947-2.287c1.561-.379 1.561-2.6 0-2.978a1.532 1.532 0 0 1-.947-2.287c.836-1.372-.734-2.942-2.106-2.106a1.532 1.532 0 0 1-2.287-.947ZM10 13a3 3 0 1 0 0-6 3 3 0 0 0 0 6Z" clipRule="evenodd" />
      </svg>
    ),
    getData: () => getMotorcycles([]),
    match: (item, q) => item.plate?.toLowerCase().includes(q) || item.brand?.toLowerCase().includes(q) || item.model?.toLowerCase().includes(q),
    getTitle: (item) => [item.plate, [item.brand, item.model].filter(Boolean).join(' ')].filter(Boolean).join(' — ') || `Moto #${item.id}`,
    getSub: (item) => item.ownerName || '',
  },
  {
    key: 'ordenes',
    label: 'Órdenes',
    link: ROUTES.adminOrdenes,
    icon: (
      <svg viewBox="0 0 20 20" fill="currentColor" width="14" height="14" aria-hidden="true">
        <path fillRule="evenodd" d="M4 4a2 2 0 0 0-2 2v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8a2 2 0 0 0-2-2h-5L9 4H4Z" clipRule="evenodd" />
      </svg>
    ),
    getData: () => getOrders([]),
    match: (item, q) => item.orderNumber?.toLowerCase().includes(q) || item.clientName?.toLowerCase().includes(q),
    getTitle: (item) => item.orderNumber,
    getSub: (item) => item.clientName || '',
  },
  {
    key: 'inventario',
    label: 'Inventario',
    link: ROUTES.adminInventario,
    icon: (
      <svg viewBox="0 0 20 20" fill="currentColor" width="14" height="14" aria-hidden="true">
        <path d="M2 3a1 1 0 0 0-1 1v1a1 1 0 0 0 1 1h16a1 1 0 0 0 1-1V4a1 1 0 0 0-1-1H2ZM2 7.5h16l-.811 7.71a2 2 0 0 1-1.99 1.79H4.802a2 2 0 0 1-1.99-1.79L2 7.5Z" />
      </svg>
    ),
    getData: () => getInventory([]),
    match: (item, q) => item.name?.toLowerCase().includes(q) || item.code?.toLowerCase().includes(q),
    getTitle: (item) => item.name,
    getSub: (item) => item.code || '',
  },
  {
    key: 'empleados',
    label: 'Empleados',
    link: ROUTES.adminEmpleados,
    icon: (
      <svg viewBox="0 0 20 20" fill="currentColor" width="14" height="14" aria-hidden="true">
        <path d="M10 9a3 3 0 1 0 0-6 3 3 0 0 0 0 6ZM6 8a2 2 0 1 1-4 0 2 2 0 0 1 4 0ZM1.49 15.326a.78.78 0 0 1-.358-.442 3 3 0 0 1 4.308-3.516 6.484 6.484 0 0 0-1.905 3.959c-.023.222-.014.442.025.654a4.97 4.97 0 0 1-2.07-.655ZM16.44 15.98a4.97 4.97 0 0 0 2.07-.654.78.78 0 0 0 .357-.442 3 3 0 0 0-4.308-3.517 6.484 6.484 0 0 1 1.907 3.96 2.32 2.32 0 0 1-.026.654ZM18 8a2 2 0 1 1-4 0 2 2 0 0 1 4 0ZM5.304 16.19a.844.844 0 0 1-.277-.71 5 5 0 0 1 9.947 0 .843.843 0 0 1-.277.71A6.975 6.975 0 0 1 10 18a6.974 6.974 0 0 1-4.696-1.81Z" />
      </svg>
    ),
    getData: () => getEmployees([]),
    match: (item, q) => item.name?.toLowerCase().includes(q) || item.specialty?.toLowerCase().includes(q),
    getTitle: (item) => item.name,
    getSub: (item) => item.specialty || '',
  },
  {
    key: 'usuarios',
    label: 'Usuarios',
    link: `${ROUTES.admin}/usuarios`,
    icon: (
      <svg viewBox="0 0 20 20" fill="currentColor" width="14" height="14" aria-hidden="true">
        <path fillRule="evenodd" d="M18 10a8 8 0 1 1-16 0 8 8 0 0 1 16 0Zm-5.5-2.5a2.5 2.5 0 1 1-5 0 2.5 2.5 0 0 1 5 0ZM10 12a5.99 5.99 0 0 0-4.793 2.39A6.483 6.483 0 0 0 10 16.5a6.483 6.483 0 0 0 4.793-2.11A5.99 5.99 0 0 0 10 12Z" clipRule="evenodd" />
      </svg>
    ),
    getData: () => getUsers([]),
    match: (item, q) => item.username?.toLowerCase().includes(q) || item.email?.toLowerCase().includes(q),
    getTitle: (item) => item.username,
    getSub: (item) => item.email || item.role || '',
  },
]

export function GlobalSearch() {
  const [query, setQuery] = useState('')
  const [open, setOpen] = useState(false)
  const wrapperRef = useRef(null)
  const inputRef = useRef(null)
  const navigate = useNavigate()

  const results = useMemo(() => {
    const q = query.toLowerCase().trim()
    if (q.length < 2) return []

    return CATEGORIES.flatMap((cat) => {
      const data = cat.getData()
      const matches = data.filter((item) => cat.match(item, q)).slice(0, 4)
      if (matches.length === 0) return []
      return [{ category: cat, items: matches }]
    })
  }, [query])

  useEffect(() => {
    function handleClick(e) {
      if (wrapperRef.current && !wrapperRef.current.contains(e.target)) {
        setOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [])

  function handleKeyDown(e) {
    if (e.key === 'Escape') {
      setOpen(false)
      inputRef.current?.blur()
    }
  }

  function handleNavigate(link) {
    navigate(link)
    setQuery('')
    setOpen(false)
  }

  return (
    <div className={styles.wrapper} ref={wrapperRef}>
      <div className={styles.inputWrapper}>
        <svg className={styles.searchIcon} viewBox="0 0 20 20" fill="currentColor" width="16" height="16" aria-hidden="true">
          <path fillRule="evenodd" d="M9 3.5a5.5 5.5 0 1 0 0 11 5.5 5.5 0 0 0 0-11ZM2 9a7 7 0 1 1 12.452 4.391l3.328 3.329a.75.75 0 1 1-1.06 1.06l-3.329-3.328A7 7 0 0 1 2 9Z" clipRule="evenodd" />
        </svg>
        <input
          ref={inputRef}
          className={styles.input}
          type="search"
          placeholder="Buscar clientes, motos, órdenes..."
          value={query}
          onChange={(e) => { setQuery(e.target.value); setOpen(true) }}
          onFocus={() => setOpen(true)}
          onKeyDown={handleKeyDown}
          aria-label="Búsqueda global"
          aria-expanded={open && results.length > 0}
          aria-haspopup="listbox"
        />
        {query ? (
          <button className={styles.clearBtn} type="button" onClick={() => { setQuery(''); setOpen(false); inputRef.current?.focus() }} aria-label="Limpiar búsqueda">
            <svg viewBox="0 0 20 20" fill="currentColor" width="14" height="14" aria-hidden="true">
              <path d="M6.28 5.22a.75.75 0 0 0-1.06 1.06L8.94 10l-3.72 3.72a.75.75 0 1 0 1.06 1.06L10 11.06l3.72 3.72a.75.75 0 1 0 1.06-1.06L11.06 10l3.72-3.72a.75.75 0 0 0-1.06-1.06L10 8.94 6.28 5.22Z" />
            </svg>
          </button>
        ) : null}
      </div>

      {open && query.length >= 2 ? (
        <div className={styles.dropdown} role="listbox" aria-label="Resultados de búsqueda">
          {results.length === 0 ? (
            <p className={styles.noResults}>Sin resultados para &ldquo;{query}&rdquo;</p>
          ) : (
            results.map(({ category: cat, items }) => (
              <div key={cat.key} className={styles.group}>
                <div className={styles.groupHeader}>
                  {cat.icon}
                  <span>{cat.label}</span>
                </div>
                {items.map((item) => (
                  <button
                    key={item.id}
                    className={styles.result}
                    type="button"
                    role="option"
                    onClick={() => handleNavigate(cat.link)}
                  >
                    <span className={styles.resultTitle}>{cat.getTitle(item)}</span>
                    {cat.getSub(item) ? (
                      <span className={styles.resultSub}>{cat.getSub(item)}</span>
                    ) : null}
                  </button>
                ))}
              </div>
            ))
          )}
        </div>
      ) : null}
    </div>
  )
}
