import { Button } from '@/components/ui/Button'
import { useToast } from '@/components/ui/toast'
import { useInviaAvvisiEmail } from './api'

/**
 * Esegue subito il controllo che il cron fa ogni mattina: invia l'email
 * per le scadenze a 14, 7, 3 o 1 giorno non ancora notificate.
 * Non manda doppioni: cio' che e' gia' stato notificato viene saltato.
 */
export function InviaAvvisiButton() {
  const toast = useToast()
  const inviaM = useInviaAvvisiEmail()

  const run = async () => {
    try {
      const r = await inviaM.mutateAsync()
      if (r.inviate === 0) {
        toast.info('Nessuna scadenza da notificare oggi (o già notificata).')
      } else {
        toast.success(
          `Email inviata: ${r.inviate} ${r.inviate === 1 ? 'scadenza' : 'scadenze'} a ${
            r.destinatari ?? 0
          } ${r.destinatari === 1 ? 'destinatario' : 'destinatari'}`
        )
      }
    } catch (e) {
      toast.error('Errore: ' + (e instanceof Error ? e.message : 'sconosciuto'))
    }
  }

  return (
    <Button
      variant="secondary"
      icon={inviaM.isPending ? 'loader-circle' : 'mail'}
      onClick={run}
      disabled={inviaM.isPending}
      title="Invia ora l'email con le scadenze a 14, 7, 3 e 1 giorno"
    >
      {inviaM.isPending ? 'Invio…' : 'Invia avvisi email'}
    </Button>
  )
}
