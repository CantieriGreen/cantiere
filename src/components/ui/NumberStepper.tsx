import { Icon } from './Icon'
import { cn } from '@/lib/utils'

type Props = {
  value: number
  onChange: (v: number) => void
  suffix?: string
  step?: number
  min?: number
  size?: 'md' | 'lg'
}

export function NumberStepper({
  value,
  onChange,
  suffix,
  step = 1,
  min = 0,
  size = 'lg',
}: Props) {
  const sz = size === 'lg' ? 'h-12 text-[15px]' : 'h-10 text-sm'
  const dec = () => onChange(Math.max(min, round(value - step)))
  const inc = () => onChange(round(value + step))
  return (
    <div
      className={cn(
        'flex items-stretch bg-white border border-line rounded-lg overflow-hidden',
        sz
      )}
    >
      <button
        type="button"
        onClick={dec}
        className="px-3 text-ink-soft hover:bg-line-soft border-r border-line"
      >
        <Icon name="minus" size={16} />
      </button>
      <input
        type="number"
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className="flex-1 w-full text-center font-medium text-ink num min-w-0 focus:outline-none"
      />
      {suffix && (
        <span className="px-2 flex items-center text-ink-soft text-sm border-l border-line bg-line-soft">
          {suffix}
        </span>
      )}
      <button
        type="button"
        onClick={inc}
        className="px-3 text-ink-soft hover:bg-line-soft border-l border-line"
      >
        <Icon name="plus" size={16} />
      </button>
    </div>
  )
}

function round(n: number) {
  return Math.round(n * 100) / 100
}
