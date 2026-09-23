import { useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Icon } from '@/components/ui/Icon'
import { useAuth } from '@/lib/auth'
import { cn } from '@/lib/utils'
import type { ScadenzaUnificata } from '@/lib/types'
import { useAvvisiScadenze } from './api'
import { GIORNI_AVVISO, TIPO_SCADENZA_META, formatDate, testoGiorni } from './constants'

const GRUPPI: { id: string; label: string; test: (g: number) => boolean; tone: string }[] = [
  { id: 'scadute', label: 'Scadute', test: (g) => g < 0, tone: 'text-bad-deep' },
  { id: 'settimana', label: 'Entro 7 giorni', test: (g) => g >= 0 && g <= 7, tone: 'text-bad-deep' },
  { id: 'mese', label: `Entro ${GIORNI_AVVISO} giorni`, test: (g) => g > 7, tone: 'text-warn-deep' },
]

/**
 * Avvisi in-app delle scadenze: campanella con contatore nella barra in alto.
 * Visibile ad amministratore e direzione (gli unici che vedono queste scadenze).
 */
export function ScadenzeBell() {
  const { profile } = useAuth()
  const abilitato = profile?.ruolo === 'admin' || profile?.ruolo === 'direzione'
  const { data: avvisi = [] } = useAvvisiScadenze(abilitato)
  const navigate = useNavigate()
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const onClick = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', onClick)
    return () => document.removeEventListener('mousedown', onClick)
  }, [])

  if (!abilitato) return null

  const critiche = avvisi.filter((a) => a.giorni <= 7).length
  const totale = avvisi.length

  const vai = (a: ScadenzaUnificata) => {
    setOpen(false)
    navigate(TIPO_SCADENZA_META[a.tipo].to)
  }

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => setOpen((o) => !o)}
        className={cn(
          'relative h-9 w-9 inline-flex items-center justify-center rounded-md hover:bg-line-soft',
          totale > 0 ? 'text-ink' : 'text-ink-soft hover:text-ink'
        )}
        title={totale > 0 ? `${totale} scadenze da gestire` : 'Nessuna scadenza imminente'}
      >
        <Icon name={critiche > 0 ? 'bell-ring' : 'bell'} size={17} />
        {totale > 0 && (
          <span
            className={cn(
              'absolute -top-0.5 -right-0.5 min-w-[18px] h-[18px] px-1 rounded-full text-[10px] font-semibold text-white flex items-center justify-center',
              critiche > 0 ? 'bg-bad' : 'bg-warn'
            )}
          >
            {totale > 99 ? '99+' : totale}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute top-11 right-0 w-[400px] bg-white border border-line rounded-lg shadow-card-lg z-50 overflow-hidden">
          <div className="px-4 py-3 border-b border-line flex items-center justify-between">
            <div>
              <div className="text-sm font-semibold text-ink">Scadenze</div>
              <div className="text-xs text-ink-soft">
                Scadute o entro {GIORNI_AVVISO} giorni
              </div>
            </div>
            {totale > 0 && (
              <span className="text-xs text-ink-soft">
                {totale} {totale === 1 ? 'voce' : 'voci'}
              </span>
            )}
          </div>

          {totale === 0 ? (
            <div className="p-6 text-center">
              <Icon name="circle-check" size={22} className="text-good-deep mx-auto mb-2" />
              <div className="text-sm text-ink">Tutto in regola</div>
              <div className="text-xs text-ink-soft mt-0.5">
                Nessuna scadenza nei prossimi {GIORNI_AVVISO} giorni.
              </div>
            </div>
          ) : (
            <div className="max-h-[420px] overflow-y-auto scroll-thin">
              {GRUPPI.map((gr) => {
                const voci = avvisi.filter((a) => gr.test(a.giorni))
                if (voci.length === 0) return null
                return (
                  <div key={gr.id} className="py-1">
                    <div className={cn('px-4 py-1.5 text-[11px] uppercase tracking-wide font-semibold', gr.tone)}>
                      {gr.label} · {voci.length}
                    </div>
                    {voci.map((a) => (
                      <button
                        key={`${a.tipo}-${a.record_id}`}
                        onClick={() => vai(a)}
                        className="w-full px-4 py-2 flex items-start gap-3 text-left hover:bg-line-soft transition"
                      >
                        <div className="w-7 h-7 rounded-md bg-navy-50 text-navy-600 flex items-center justify-center shrink-0 mt-0.5">
                          <Icon name={TIPO_SCADENZA_META[a.tipo].icon} size={14} />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="text-sm text-ink truncate">
                            <span className="font-medium">{a.titolo}</span>
                            <span className="text-ink-soft"> · {a.dettaglio}</span>
                          </div>
                          <div className="text-xs text-ink-soft">{formatDate(a.scadenza)}</div>
                        </div>
                        <span className={cn('text-xs font-medium whitespace-nowrap mt-0.5', gr.tone)}>
                          {testoGiorni(a.giorni)}
                        </span>
                      </button>
                    ))}
                  </div>
                )
              })}
            </div>
          )}

          <div className="border-t border-line grid grid-cols-2 divide-x divide-line">
            <button
              onClick={() => {
                setOpen(false)
                navigate('/scadenze/mezzi')
              }}
              className="h-10 text-sm text-navy-700 hover:bg-line-soft inline-flex items-center justify-center gap-1.5"
            >
              <Icon name="car" size={14} /> Mezzi
            </button>
            <button
              onClick={() => {
                setOpen(false)
                navigate('/scadenze/dipendenti')
              }}
              className="h-10 text-sm text-navy-700 hover:bg-line-soft inline-flex items-center justify-center gap-1.5"
            >
              <Icon name="users" size={14} /> Dipendenti
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
