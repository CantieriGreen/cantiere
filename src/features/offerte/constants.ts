import type { StatoOfferta } from '@/lib/types'

export const STATO_OFFERTA: Record<
  StatoOfferta,
  { label: string; tone: 'warn' | 'good' | 'bad'; icon: string }
> = {
  inviata: { label: 'Trattativa inviata', tone: 'warn', icon: 'send' },
  ok: { label: 'OK · Accettata', tone: 'good', icon: 'circle-check' },
  ko: { label: 'KO · Rifiutata', tone: 'bad', icon: 'circle-x' },
}

export const STATI_OFFERTA_ORDER: StatoOfferta[] = ['inviata', 'ok', 'ko']
