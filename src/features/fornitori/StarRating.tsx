import { Icon } from '@/components/ui/Icon'
import { cn } from '@/lib/utils'

type Props = {
  value: number | null
  onChange?: (v: number) => void
  size?: number
}

export function StarRating({ value, onChange, size = 16 }: Props) {
  const v = value ?? 0
  return (
    <div className="inline-flex items-center gap-0.5">
      {[1, 2, 3, 4, 5].map((i) => {
        const filled = i <= v
        const star = (
          <Icon
            name="star"
            size={size}
            className={cn(filled ? 'text-warn fill-warn' : 'text-line-strong')}
          />
        )
        if (!onChange) return <span key={i}>{star}</span>
        return (
          <button
            key={i}
            type="button"
            onClick={() => onChange(i === v ? 0 : i)}
            className="hover:scale-110 transition"
            title={`${i}/5`}
          >
            {star}
          </button>
        )
      })}
    </div>
  )
}
