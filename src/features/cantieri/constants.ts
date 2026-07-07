import type { StatoCantiere } from '@/lib/types'

type StatoMeta = {
  label: string
  tone: 'good' | 'bad' | 'warn' | 'neutral'
  icon: string
}

export const STATO_CANTIERE: Record<StatoCantiere, StatoMeta> = {
  pianificato: { label: 'Pianificato', tone: 'warn', icon: 'clock' },
  in_corso: { label: 'In corso', tone: 'good', icon: 'circle-check' },
  sospeso: { label: 'Sospeso', tone: 'neutral', icon: 'pause' },
  in_ritardo: { label: 'In ritardo', tone: 'bad', icon: 'circle-alert' },
  chiuso: { label: 'Chiuso', tone: 'neutral', icon: 'flag' },
}

export const STATI_CANTIERE_ORDER: StatoCantiere[] = [
  'pianificato',
  'in_corso',
  'sospeso',
  'in_ritardo',
  'chiuso',
]
