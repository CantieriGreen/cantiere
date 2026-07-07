import type { TipoCliente } from '@/lib/types'

type TipoMeta = {
  label: string
  tone: 'warn' | 'info' | 'good'
  icon: string
  desc: string
  activeCls: string
}

export const TIPO_CLIENTE: Record<TipoCliente, TipoMeta> = {
  lead: {
    label: 'Lead',
    tone: 'warn',
    icon: 'sparkles',
    desc: 'Ha manifestato interesse, nessuna offerta inviata',
    activeCls: 'bg-warn text-white',
  },
  prospect: {
    label: 'Prospect',
    tone: 'info',
    icon: 'send',
    desc: 'Offerta inviata, in attesa di esito',
    activeCls: 'bg-navy-600 text-white',
  },
  cliente: {
    label: 'Cliente',
    tone: 'good',
    icon: 'circle-check',
    desc: 'Cliente acquisito con cantieri o storico',
    activeCls: 'bg-good text-white',
  },
}

export const TIPI_CLIENTE_ORDER: TipoCliente[] = ['lead', 'prospect', 'cliente']
