import { eu, pct as fmtPct } from '@/lib/utils'
import { cn } from '@/lib/utils'

type MoneyProps = {
  value: number
  signed?: boolean
  decimals?: number
  bold?: boolean
}

export function Money({
  value,
  signed = false,
  decimals = 0,
  bold = false,
}: MoneyProps) {
  const cls = !signed
    ? 'text-ink'
    : value > 0
    ? 'text-good-deep'
    : value < 0
    ? 'text-bad-deep'
    : 'text-ink'
  return (
    <span className={cn('num', bold && 'font-semibold', cls)}>
      {eu(value, { decimals })}
    </span>
  )
}

type PctProps = {
  value: number
  signed?: boolean
  decimals?: number
}

export function Pct({ value, signed = true, decimals = 1 }: PctProps) {
  const cls = !signed
    ? 'text-ink'
    : value > 0
    ? 'text-good-deep'
    : value < 0
    ? 'text-bad-deep'
    : 'text-ink'
  return <span className={cn('num', cls)}>{fmtPct(value, decimals)}</span>
}
