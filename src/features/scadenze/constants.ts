import type { TipoScadenza, TipologiaFormazione } from '@/lib/types'

/** Soglie (giorni) a cui parte l'email automatica. */
export const SOGLIE_EMAIL = [14, 7, 3, 1]

/** Finestra degli avvisi in-app: scadenze entro questi giorni (e gia' scadute). */
export const GIORNI_AVVISO = 30

export type StatoScadenza = 'scaduta' | 'urgente' | 'in_scadenza' | 'ok' | 'assente'

export const STATO_SCADENZA: Record<
  StatoScadenza,
  { label: string; tone: 'bad' | 'warn' | 'good' | 'neutral'; icon: string }
> = {
  scaduta: { label: 'Scaduta', tone: 'bad', icon: 'circle-x' },
  urgente: { label: 'Urgente', tone: 'bad', icon: 'triangle-alert' },
  in_scadenza: { label: 'In scadenza', tone: 'warn', icon: 'clock' },
  ok: { label: 'In regola', tone: 'good', icon: 'circle-check' },
  assente: { label: 'Non indicata', tone: 'neutral', icon: 'minus' },
}

/** Giorni mancanti fra oggi e la data ISO (negativo = gia' scaduta). */
export function giorniAllaScadenza(iso: string | null): number | null {
  if (!iso) return null
  const [y, m, d] = iso.split('-').map(Number)
  if (!y || !m || !d) return null
  const scad = Date.UTC(y, m - 1, d)
  const now = new Date()
  const oggi = Date.UTC(now.getFullYear(), now.getMonth(), now.getDate())
  return Math.round((scad - oggi) / 86_400_000)
}

export function statoDaGiorni(giorni: number | null): StatoScadenza {
  if (giorni === null) return 'assente'
  if (giorni < 0) return 'scaduta'
  if (giorni <= 7) return 'urgente'
  if (giorni <= GIORNI_AVVISO) return 'in_scadenza'
  return 'ok'
}

export function statoScadenza(iso: string | null): StatoScadenza {
  return statoDaGiorni(giorniAllaScadenza(iso))
}

/** Testo breve: "scaduta da 3 gg", "oggi", "domani", "tra 12 gg". */
export function testoGiorni(giorni: number | null): string {
  if (giorni === null) return ''
  if (giorni < -1) return `scaduta da ${-giorni} gg`
  if (giorni === -1) return 'scaduta ieri'
  if (giorni === 0) return 'scade oggi'
  if (giorni === 1) return 'domani'
  return `tra ${giorni} gg`
}

/** Priorita' per ordinare: le peggiori prima; le date assenti in fondo. */
export function prioritaStato(s: StatoScadenza): number {
  return { scaduta: 0, urgente: 1, in_scadenza: 2, ok: 3, assente: 4 }[s]
}

/** Stato peggiore fra piu' date (es. le tre scadenze di un mezzo). */
export function statoPeggiore(date: (string | null)[]): StatoScadenza {
  const stati = date.map(statoScadenza).filter((s) => s !== 'assente')
  if (stati.length === 0) return 'assente'
  return stati.sort((a, b) => prioritaStato(a) - prioritaStato(b))[0]
}

export function formatDate(iso: string | null) {
  if (!iso) return '—'
  const [y, m, d] = iso.split('-')
  return y && m && d ? `${d}/${m}/${y}` : iso
}

export const TIPOLOGIA_FORMAZIONE_LABEL: Record<TipologiaFormazione, string> = {
  corso: 'Corso',
  aggiornamento: 'Aggiornamento',
}

export const TIPO_SCADENZA_META: Record<
  TipoScadenza,
  { icon: string; to: string }
> = {
  mezzo_assicurazione: { icon: 'car', to: '/scadenze/mezzi' },
  mezzo_bollo: { icon: 'car', to: '/scadenze/mezzi' },
  mezzo_revisione: { icon: 'car', to: '/scadenze/mezzi' },
  visita_medica: { icon: 'stethoscope', to: '/scadenze/dipendenti?tab=visite' },
  formazione: { icon: 'shield-check', to: '/scadenze/dipendenti?tab=formazione' },
  patente: { icon: 'id-card', to: '/scadenze/dipendenti?tab=documenti' },
  permesso_soggiorno: { icon: 'id-card', to: '/scadenze/dipendenti?tab=documenti' },
  documento_altro: { icon: 'file-text', to: '/scadenze/altro' },
}
