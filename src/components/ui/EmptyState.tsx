import { type ReactNode } from 'react'
import { Icon } from './Icon'

type Props = {
  icon?: string
  title: string
  description?: string
  action?: ReactNode
}

export function EmptyState({
  icon = 'inbox',
  title,
  description,
  action,
}: Props) {
  return (
    <div className="p-12 text-center">
      <div className="inline-flex items-center justify-center w-12 h-12 rounded-xl bg-line-soft text-ink-faint mb-3">
        <Icon name={icon} size={24} />
      </div>
      <h3 className="text-sm font-semibold text-ink">{title}</h3>
      {description && (
        <p className="text-sm text-ink-soft mt-1 max-w-sm mx-auto">
          {description}
        </p>
      )}
      {action && <div className="mt-4">{action}</div>}
    </div>
  )
}
