import { type ReactNode } from 'react'
import { Icon } from './Icon'
import { cn } from '@/lib/utils'

type Tone = 'neutral' | 'good' | 'bad' | 'warn' | 'navy' | 'info'

type Props = {
  children: ReactNode
  tone?: Tone
  icon?: string
  className?: string
}

const tones: Record<Tone, string> = {
  neutral: 'bg-line-soft text-ink-soft border-line',
  good: 'bg-good-soft text-good-deep border-good/20',
  bad: 'bg-bad-soft text-bad-deep border-bad/20',
  warn: 'bg-warn-soft text-warn-deep border-warn/20',
  navy: 'bg-navy-50 text-navy-700 border-navy-100',
  info: 'bg-blue-50 text-blue-700 border-blue-100',
}

export function Badge({ children, tone = 'neutral', icon, className }: Props) {
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1 text-xs font-medium px-2 py-0.5 rounded-md border',
        tones[tone],
        className
      )}
    >
      {icon && <Icon name={icon} size={12} />}
      {children}
    </span>
  )
}
