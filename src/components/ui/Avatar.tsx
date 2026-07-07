import { cn } from '@/lib/utils'

type Props = {
  name: string
  size?: number
  tone?: 'navy' | 'soft'
}

const palette = {
  navy: 'bg-navy-100 text-navy-700',
  soft: 'bg-line-soft text-ink-soft',
}

export function Avatar({ name, size = 36, tone = 'navy' }: Props) {
  const initials = name
    .split(' ')
    .map((s) => s[0])
    .filter(Boolean)
    .slice(0, 2)
    .join('')
    .toUpperCase()
  return (
    <span
      className={cn(
        'inline-flex items-center justify-center font-semibold rounded-full',
        palette[tone]
      )}
      style={{ width: size, height: size, fontSize: size * 0.36 }}
    >
      {initials}
    </span>
  )
}
