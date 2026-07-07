import { useEffect, useMemo, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Icon } from '@/components/ui/Icon'
import { useGlobalSearch, type SearchResult } from '@/features/search/api'

export function GlobalSearch() {
  const navigate = useNavigate()
  const [query, setQuery] = useState('')
  const [open, setOpen] = useState(false)
  const [highlight, setHighlight] = useState(0)
  const containerRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  const { data: results = [], isFetching } = useGlobalSearch(query)

  // ⌘K / Ctrl+K per focalizzare
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault()
        inputRef.current?.focus()
        setOpen(true)
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [])

  // chiudi su click esterno
  useEffect(() => {
    const onClick = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false)
      }
    }
    document.addEventListener('mousedown', onClick)
    return () => document.removeEventListener('mousedown', onClick)
  }, [])

  useEffect(() => setHighlight(0), [results])

  const grouped = useMemo(() => {
    const map = new Map<string, SearchResult[]>()
    results.forEach((r) => {
      if (!map.has(r.group)) map.set(r.group, [])
      map.get(r.group)!.push(r)
    })
    return Array.from(map.entries())
  }, [results])

  const go = (r: SearchResult) => {
    navigate(r.to)
    setQuery('')
    setOpen(false)
  }

  const onKeyDown = (e: React.KeyboardEvent) => {
    if (!open) return
    if (e.key === 'ArrowDown') {
      e.preventDefault()
      setHighlight((h) => Math.min(h + 1, results.length - 1))
    } else if (e.key === 'ArrowUp') {
      e.preventDefault()
      setHighlight((h) => Math.max(h - 1, 0))
    } else if (e.key === 'Enter' && results[highlight]) {
      e.preventDefault()
      go(results[highlight])
    } else if (e.key === 'Escape') {
      setOpen(false)
    }
  }

  const showDropdown = open && query.trim().length >= 2
  let flatIndex = -1

  return (
    <div className="relative" ref={containerRef}>
      <Icon
        name="search"
        size={15}
        className="absolute left-3 top-1/2 -translate-y-1/2 text-ink-faint pointer-events-none"
      />
      <input
        ref={inputRef}
        value={query}
        onChange={(e) => {
          setQuery(e.target.value)
          setOpen(true)
        }}
        onFocus={() => setOpen(true)}
        onKeyDown={onKeyDown}
        placeholder="Cerca cantiere, cliente, fornitore… (⌘K)"
        className="h-9 pl-9 pr-3 w-[420px] bg-canvas border border-line rounded-lg text-sm text-ink placeholder:text-ink-faint focus:outline-none focus:border-navy-500 focus:bg-white"
      />

      {showDropdown && (
        <div className="absolute top-11 left-0 w-[440px] bg-white border border-line rounded-lg shadow-card-lg z-50 max-h-[420px] overflow-y-auto scroll-thin">
          {isFetching && results.length === 0 ? (
            <div className="p-4 text-sm text-ink-soft flex items-center gap-2">
              <Icon name="loader-circle" size={15} className="animate-spin" />
              Ricerca in corso…
            </div>
          ) : results.length === 0 ? (
            <div className="p-4 text-sm text-ink-soft text-center">
              Nessun risultato per “{query}”
            </div>
          ) : (
            grouped.map(([group, items]) => (
              <div key={group} className="py-1">
                <div className="px-3 py-1.5 text-[11px] uppercase tracking-wide text-ink-faint font-semibold">
                  {group}
                </div>
                {items.map((r) => {
                  flatIndex += 1
                  const idx = flatIndex
                  return (
                    <button
                      key={r.to}
                      onMouseEnter={() => setHighlight(idx)}
                      onClick={() => go(r)}
                      className={`w-full flex items-center gap-3 px-3 py-2 text-left transition ${
                        highlight === idx ? 'bg-navy-50' : 'hover:bg-line-soft'
                      }`}
                    >
                      <div className="w-7 h-7 rounded-md bg-line-soft text-ink-soft flex items-center justify-center shrink-0">
                        <Icon name={r.icon} size={14} />
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="text-sm text-ink truncate">{r.label}</div>
                        <div className="text-xs text-ink-soft truncate">{r.sub}</div>
                      </div>
                    </button>
                  )
                })}
              </div>
            ))
          )}
        </div>
      )}
    </div>
  )
}
