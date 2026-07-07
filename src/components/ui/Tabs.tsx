import { Icon } from './Icon'
import { cn } from '@/lib/utils'

export type TabDef = {
  id: string
  label: string
  icon?: string
  count?: number
}

type Props = {
  tabs: TabDef[]
  active: string
  onChange: (id: string) => void
}

export function Tabs({ tabs, active, onChange }: Props) {
  return (
    <div className="border-b border-line">
      <div className="flex items-center gap-1 -mb-px">
        {tabs.map((t) => {
          const isActive = active === t.id
          return (
            <button
              key={t.id}
              onClick={() => onChange(t.id)}
              className={cn(
                'px-4 h-11 text-sm font-medium border-b-2 transition flex items-center gap-2',
                isActive
                  ? 'border-navy-600 text-navy-700'
                  : 'border-transparent text-ink-soft hover:text-ink'
              )}
            >
              {t.icon && <Icon name={t.icon} size={15} />}
              {t.label}
              {t.count !== undefined && (
                <span
                  className={cn(
                    'text-[11px] px-1.5 py-0.5 rounded-md',
                    isActive
                      ? 'bg-navy-100 text-navy-700'
                      : 'bg-line-soft text-ink-soft'
                  )}
                >
                  {t.count}
                </span>
              )}
            </button>
          )
        })}
      </div>
    </div>
  )
}
