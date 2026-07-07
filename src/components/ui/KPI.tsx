import { Card } from './Card'
import { Icon } from './Icon'
import { cn } from '@/lib/utils'

type Tone = 'neutral' | 'good' | 'bad' | 'warn'

type Props = {
  label: string
  value: string
  delta?: string
  tone?: Tone
  icon?: string
  hint?: string
}

const valueTones: Record<Tone, string> = {
  neutral: 'text-ink',
  good: 'text-good-deep',
  bad: 'text-bad-deep',
  warn: 'text-warn-deep',
}

export function KPI({ label, value, delta, tone = 'neutral', icon, hint }: Props) {
  return (
    <Card className="relative">
      <div className="flex items-start justify-between">
        <div className="text-[13px] text-ink-soft font-medium">{label}</div>
        {icon && (
          <div className="w-8 h-8 rounded-md bg-navy-50 text-navy-600 flex items-center justify-center">
            <Icon name={icon} size={16} />
          </div>
        )}
      </div>
      <div
        className={cn(
          'mt-3 num text-[28px] font-semibold leading-none tracking-tight',
          valueTones[tone]
        )}
      >
        {value}
      </div>
      <div className="mt-2 flex items-center gap-2">
        {delta && (
          <span
            className={cn(
              'text-xs font-medium inline-flex items-center gap-0.5',
              tone === 'bad'
                ? 'text-bad'
                : tone === 'good'
                ? 'text-good-deep'
                : 'text-ink-soft'
            )}
          >
            {tone === 'good' && <Icon name="trending-up" size={12} />}
            {tone === 'bad' && <Icon name="trending-down" size={12} />}
            {delta}
          </span>
        )}
        {hint && <span className="text-xs text-ink-soft">{hint}</span>}
      </div>
    </Card>
  )
}
