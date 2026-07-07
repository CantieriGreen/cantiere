import { type ReactNode } from 'react'
import { Icon } from '@/components/ui/Icon'
import { useAddon } from '@/features/azienda/api'
import { AddonLocked } from '@/screens/AddonLocked'

type Props = {
  addon: 'offerte' | 'manutenzione'
  nome: string
  descrizione: string
  children: ReactNode
}

export function AddonGuard({ addon, nome, descrizione, children }: Props) {
  const flags = useAddon()

  if (flags.loading) {
    return (
      <div className="flex items-center justify-center py-24">
        <Icon name="loader-circle" size={26} className="animate-spin text-navy-600" />
      </div>
    )
  }

  const attivo = addon === 'offerte' ? flags.offerte : flags.manutenzione
  if (!attivo) {
    return <AddonLocked nome={nome} descrizione={descrizione} />
  }

  return <>{children}</>
}
