import { useNavigate } from 'react-router-dom'
import { Card } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Icon } from '@/components/ui/Icon'

const SUPPORT_MAIL = 'support@greenconsulting.it'

type Props = {
  nome: string
  descrizione: string
}

export function AddonLocked({ nome, descrizione }: Props) {
  const navigate = useNavigate()
  return (
    <div className="max-w-xl mx-auto py-10">
      <Card className="text-center py-12">
        <div className="inline-flex items-center justify-center w-14 h-14 rounded-xl bg-navy-50 text-navy-600 mb-4">
          <Icon name="lock" size={28} />
        </div>
        <h1 className="text-xl font-semibold text-ink mb-1">
          {nome} — modulo non attivo
        </h1>
        <p className="text-sm text-ink-soft max-w-md mx-auto mb-6">
          {descrizione} È un modulo aggiuntivo opzionale. Per attivarlo contatta
          il fornitore dell'applicazione.
        </p>
        <div className="flex items-center justify-center gap-3">
          <Button variant="secondary" icon="arrow-left" onClick={() => navigate('/')}>
            Torna alla dashboard
          </Button>
          <a
            href={`mailto:${SUPPORT_MAIL}?subject=Attivazione%20modulo%20${encodeURIComponent(nome)}`}
            className="h-10 px-4 inline-flex items-center gap-2 rounded-lg bg-navy-600 text-white hover:bg-navy-700 text-sm font-medium"
          >
            <Icon name="mail" size={16} />
            Richiedi attivazione
          </a>
        </div>
      </Card>
    </div>
  )
}
