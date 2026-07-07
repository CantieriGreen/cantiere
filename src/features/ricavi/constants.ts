import type { StatoRicavo, TipoRicavo } from '@/lib/types'

export const STATO_RICAVO: Record<
  StatoRicavo,
  { label: string; tone: 'good' | 'warn' | 'bad'; icon: string }
> = {
  in_attesa: { label: 'In attesa', tone: 'warn', icon: 'clock' },
  pagato: { label: 'Pagato', tone: 'good', icon: 'circle-check' },
  scaduto: { label: 'Scaduto', tone: 'bad', icon: 'circle-alert' },
}

export const STATI_RICAVO_ORDER: StatoRicavo[] = [
  'in_attesa',
  'pagato',
  'scaduto',
]

export const TIPO_RICAVO_LABEL: Record<TipoRicavo, string> = {
  sal: 'SAL',
  fattura: 'Fattura',
}
