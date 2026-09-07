import { useEffect, useMemo, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { searchApi } from '../../api/searchApi'
import { useAuth } from '../../hooks/useAuth'
import { ROUTES } from '../../utils/routes'
import styles from './GlobalSearch.module.css'

const ADMIN_CATEGORIES = {
  clients: { label: 'Clientes', link: ROUTES.adminClientes },
  motorcycles: { label: 'Motocicletas', link: `${ROUTES.admin}/motocicletas` },
  orders: { label: 'Órdenes', link: ROUTES.adminOrdenes },
  inventory: { label: 'Inventario', link: ROUTES.adminInventario },
  employees: { label: 'Empleados', link: ROUTES.adminEmpleados },
  users: { label: 'Usuarios', link: ROUTES.adminUsuarios },
}

function groupsFrom(data, role) {
  const categories = role === 'Técnico'
    ? {
        motorcycles: { label: 'Motos asignadas', link: ROUTES.tecnicoMotos },
        orders: { label: 'Órdenes asignadas', link: ROUTES.tecnicoOrdenes },
      }
    : ADMIN_CATEGORIES

  return Object.entries(data ?? {})
    .filter(([key, items]) => categories[key] && Array.isArray(items) && items.length > 0)
    .map(([key, items]) => ({ key, ...categories[key], items }))
}

export function GlobalSearch() {
  const [query, setQuery] = useState('')
  const [result, setResult] = useState({ query: '', groups: {} })
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState({ query: '', message: '' })
  const [activeIndex, setActiveIndex] = useState(-1)
  const wrapperRef = useRef(null)
  const inputRef = useRef(null)
  const navigate = useNavigate()
  const { user } = useAuth()
  const normalizedQuery = query.trim()
  const groups = useMemo(
    () => result.query === normalizedQuery ? groupsFrom(result.groups, user?.role) : [],
    [result, normalizedQuery, user?.role]
  )
  const flatResults = useMemo(
    () => groups.flatMap((group) => group.items.map((item) => ({ ...item, category: group }))),
    [groups]
  )

  useEffect(() => {
    if (normalizedQuery.length < 2) {
      return undefined
    }

    const controller = new AbortController()
    const timer = window.setTimeout(async () => {
      setLoading(true)
      setError({ query: '', message: '' })
      try {
        const groups = await searchApi.search(normalizedQuery, controller.signal)
        setResult({ query: normalizedQuery, groups })
        setActiveIndex(-1)
      } catch (requestError) {
        if (requestError.code !== 'ERR_CANCELED') {
          setResult({ query: normalizedQuery, groups: {} })
          setError({ query: normalizedQuery, message: 'No fue posible realizar la búsqueda. Intenta de nuevo.' })
        }
      } finally {
        if (!controller.signal.aborted) setLoading(false)
      }
    }, 250)

    return () => {
      window.clearTimeout(timer)
      controller.abort()
    }
  }, [normalizedQuery])

  useEffect(() => {
    function handlePointerDown(event) {
      if (wrapperRef.current && !wrapperRef.current.contains(event.target)) setOpen(false)
    }
    document.addEventListener('pointerdown', handlePointerDown)
    return () => document.removeEventListener('pointerdown', handlePointerDown)
  }, [])

  function clearSearch() {
    setQuery('')
    setOpen(false)
    setActiveIndex(-1)
    inputRef.current?.focus()
  }

  function handleNavigate(result) {
    navigate(result.category.link)
    setQuery('')
    setResult({ query: '', groups: {} })
    setOpen(false)
    setActiveIndex(-1)
  }

  function handleKeyDown(event) {
    if (event.key === 'Escape') {
      setOpen(false)
      setActiveIndex(-1)
      inputRef.current?.blur()
      return
    }
    if (!flatResults.length) return

    if (event.key === 'ArrowDown') {
      event.preventDefault()
      setOpen(true)
      setActiveIndex((index) => (index + 1) % flatResults.length)
    } else if (event.key === 'ArrowUp') {
      event.preventDefault()
      setOpen(true)
      setActiveIndex((index) => (index <= 0 ? flatResults.length - 1 : index - 1))
    } else if (event.key === 'Enter' && activeIndex >= 0) {
      event.preventDefault()
      handleNavigate(flatResults[activeIndex])
    }
  }

  const showDropdown = open && normalizedQuery.length >= 2
  const errorMessage = error.query === normalizedQuery ? error.message : ''
  const waiting = normalizedQuery.length >= 2 && result.query !== normalizedQuery && !errorMessage
  const empty = !loading && !waiting && !errorMessage && groups.length === 0

  return (
    <div className={styles.wrapper} ref={wrapperRef}>
      <div className={styles.inputWrapper}>
        <svg className={styles.searchIcon} viewBox="0 0 20 20" fill="currentColor" width="16" height="16" aria-hidden="true">
          <path fillRule="evenodd" d="M9 3.5a5.5 5.5 0 1 0 0 11.5A5.5 5.5 0 0 0 9 3.5ZM2 9a7 7 0 1 1 12.452 4.391l3.328 3.329a.75.75 0 1 1-1.06 1.06l-3.329-3.328A7 7 0 0 1 2 9Z" clipRule="evenodd" />
        </svg>
        <input
          ref={inputRef}
          className={styles.input}
          type="search"
          placeholder="Buscar clientes, motos, órdenes..."
          value={query}
          onChange={(event) => { setQuery(event.target.value); setOpen(true) }}
          onFocus={() => setOpen(true)}
          onKeyDown={handleKeyDown}
          aria-label="Búsqueda global"
          aria-autocomplete="list"
          aria-expanded={showDropdown}
          aria-controls="global-search-results"
          aria-activedescendant={activeIndex >= 0 ? `global-search-result-${activeIndex}` : undefined}
        />
        {query ? (
          <button className={styles.clearBtn} type="button" onClick={clearSearch} aria-label="Limpiar búsqueda">
            <svg viewBox="0 0 20 20" fill="currentColor" width="14" height="14" aria-hidden="true">
              <path d="M6.28 5.22a.75.75 0 0 0-1.06 1.06L8.94 10l-3.72 3.72a.75.75 0 1 0 1.06 1.06L10 11.06l3.72 3.72a.75.75 0 1 0 1.06-1.06L11.06 10l3.72-3.72a.75.75 0 0 0-1.06-1.06L10 8.94 6.28 5.22Z" />
            </svg>
          </button>
        ) : null}
      </div>

      {showDropdown ? (
        <div id="global-search-results" className={styles.dropdown} role="listbox" aria-label="Resultados de búsqueda">
          {loading || waiting ? <p className={styles.status}>Buscando…</p> : null}
          {!loading && !waiting && errorMessage ? <p className={styles.status} role="alert">{errorMessage}</p> : null}
          {empty ? <p className={styles.status}>Sin resultados para &ldquo;{normalizedQuery}&rdquo;</p> : null}
          {!loading && !waiting && !errorMessage ? groups.map((group) => (
            <div key={group.key} className={styles.group}>
              <div className={styles.groupHeader}>{group.label}</div>
              {group.items.map((item) => {
                const resultIndex = flatResults.findIndex((result) => result.category.key === group.key && result.id === item.id)
                return (
                  <button
                    key={item.id}
                    id={`global-search-result-${resultIndex}`}
                    className={`${styles.result} ${activeIndex === resultIndex ? styles.resultActive : ''}`}
                    type="button"
                    role="option"
                    aria-selected={activeIndex === resultIndex}
                    onMouseMove={() => setActiveIndex(resultIndex)}
                    onClick={() => handleNavigate({ ...item, category: group })}
                  >
                    <span className={styles.resultTitle}>{item.title}</span>
                    {item.subtitle ? <span className={styles.resultSub}>{item.subtitle}</span> : null}
                  </button>
                )
              })}
            </div>
          )) : null}
        </div>
      ) : null}
    </div>
  )
}
