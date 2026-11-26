import { type ReactNode } from 'react'
import { Navigate } from 'react-router-dom'
import { useAuth } from '@/lib/auth'
import type { Ruolo } from '@/lib/types'

type Props = {
  /** Ruoli ammessi alla pagina. */
  ruoli: Ruolo[]
  children: ReactNode
}

/**
 * Protegge una pagina in base al ruolo: chi non e' ammesso torna alla
 * dashboard. Il menu nasconde gia' le voci, ma senza questa guardia la
 * pagina si aprirebbe comunque scrivendo l'indirizzo a mano.
 * (I dati restano comunque protetti dalle RLS del database.)
 */
export function RoleGuard({ ruoli, children }: Props) {
  const { profile } = useAuth()
  if (!profile || !ruoli.includes(profile.ruolo)) {
    return <Navigate to="/" replace />
  }
  return <>{children}</>
}
