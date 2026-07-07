import { Icon } from '@/components/ui/Icon'
import type { StatoOfferta } from '@/lib/types'

const TONES: Record<StatoOfferta, string> = {
  inviata: 'bg-warn-soft text-warn-deep border-warn/30',
  ok: 'bg-good-soft text-good-deep border-good/30',
  ko: 'bg-bad-soft text-bad-deep border-bad/30',
}

type Props = {
  value: StatoOfferta
  onChange: (s: StatoOfferta) => void
}

export function StatoOffertaSelect({ value, onChange }: Props) {
  return (
    <div className="relative inline-block" onClick={(e) => e.stopPropagation()}>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value as StatoOfferta)}
        className={`appearance-none cursor-pointer text-xs font-medium pl-2.5 pr-7 py-1.5 rounded-md border ${TONES[value]} focus:outline-none`}
      >
        <option value="inviata">Trattativa inviata</option>
        <option value="ok">OK · Accettata</option>
        <option value="ko">KO · Rifiutata</option>
      </select>
      <Icon
        name="chevron-down"
        size={13}
        className="absolute right-2 top-1/2 -translate-y-1/2 pointer-events-none opacity-70"
      />
    </div>
  )
}
