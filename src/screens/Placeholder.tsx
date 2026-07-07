import { PageHeader } from '@/components/ui/PageHeader'
import { Card } from '@/components/ui/Card'
import { Icon } from '@/components/ui/Icon'

type Props = {
  title: string
  description?: string
  icon?: string
}

export function Placeholder({
  title,
  description = 'Schermata in costruzione — verrà implementata nei prossimi giorni del piano di sviluppo.',
  icon = 'construction',
}: Props) {
  return (
    <div>
      <PageHeader title={title} banner={description} />
      <Card className="text-center py-16">
        <div className="inline-flex items-center justify-center w-14 h-14 rounded-xl bg-navy-50 text-navy-600 mb-4">
          <Icon name={icon} size={28} />
        </div>
        <h2 className="text-lg font-semibold text-ink mb-1">{title}</h2>
        <p className="text-sm text-ink-soft max-w-md mx-auto">{description}</p>
      </Card>
    </div>
  )
}
