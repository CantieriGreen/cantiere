import { Badge } from '@/components/ui/Badge'
import { cn } from '@/lib/utils'
import {
  STATO_SCADENZA,
  formatDate,
  giorniAllaScadenza,
  statoDaGiorni,
  testoGiorni,
} from './constants'

/** Data di scadenza con colore di stato e giorni mancanti. */
export function ScadenzaCell({ data }: { data: string | null }) {
  if (!data) return <span className="text-ink-faint">—</span>
  const giorni = giorniAllaScadenza(data)
  const stato = statoDaGiorni(giorni)
  const tone =
    stato === 'scaduta' || stato === 'urgente'
      ? 'text-bad-deep'
      : stato === 'in_scadenza'
      ? 'text-warn-deep'
      : 'text-ink'
  return (
    <div className="leading-tight">
      <div className={cn('num text-sm', tone, stato !== 'ok' && 'font-medium')}>
        {formatDate(data)}
      </div>
      {stato !== 'ok' && (
        <div className={cn('text-[11px]', tone)}>{testoGiorni(giorni)}</div>
      )}
    </div>
  )
}

export function StatoBadge({ stato }: { stato: keyof typeof STATO_SCADENZA }) {
  const s = STATO_SCADENZA[stato]
  return (
    <Badge tone={s.tone} icon={s.icon}>
      {s.label}
    </Badge>
  )
}
