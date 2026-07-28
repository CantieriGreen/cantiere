import { useEffect, useRef, useState } from 'react'
import { Button } from '@/components/ui/Button'
import { Icon } from '@/components/ui/Icon'
import { useToast } from '@/components/ui/toast'
import { useFicSync } from './fic-api'

const PERIODI = [
  { mesi: 1, label: 'Ultimo mese' },
  { mesi: 6, label: 'Ultimi 6 mesi' },
  { mesi: 12, label: 'Ultimo anno' },
]

export function SyncFattureButton() {
  const toast = useToast()
  const syncM = useFicSync()
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const onClick = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', onClick)
    return () => document.removeEventListener('mousedown', onClick)
  }, [])

  const run = async (mesi: number, label: string) => {
    setOpen(false)
    try {
      const r = await syncM.mutateAsync(mesi)
      toast.success(
        `Sincronizzate (${label.toLowerCase()}) · ${r.attive.importate} attive e ${r.passive.importate} passive nuove`
      )
    } catch (e) {
      toast.error('Errore: ' + (e instanceof Error ? e.message : 'sconosciuto'))
    }
  }

  return (
    <div className="relative" ref={ref}>
      <Button
        variant="secondary"
        icon={syncM.isPending ? 'loader-circle' : 'refresh-cw'}
        onClick={() => setOpen((o) => !o)}
        disabled={syncM.isPending}
      >
        {syncM.isPending ? 'Sincronizzo…' : 'Sincronizza fatture'}
      </Button>

      {open && !syncM.isPending && (
        <div className="absolute top-11 right-0 w-56 bg-white border border-line rounded-lg shadow-card-lg z-50 overflow-hidden">
          <div className="px-3 py-2 text-[11px] uppercase tracking-wide text-ink-soft font-semibold border-b border-line">
            Importa fatture degli
          </div>
          {PERIODI.map((p) => (
            <button
              key={p.mesi}
              onClick={() => run(p.mesi, p.label)}
              className="w-full flex items-center gap-2.5 px-3 h-10 text-sm text-ink-soft hover:text-ink hover:bg-line-soft transition text-left"
            >
              <Icon name="calendar" size={15} />
              {p.label}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
