import { type ReactNode } from 'react'
import { cn } from '@/lib/utils'

type ToggleProps = {
  checked: boolean
  onChange: (v: boolean) => void
  label?: ReactNode
  size?: 'md' | 'lg'
}

export function Toggle({
  checked,
  onChange,
  label,
  size = 'md',
}: ToggleProps) {
  const w = size === 'lg' ? 'w-12 h-7' : 'w-10 h-6'
  const dot = size === 'lg' ? 'h-6 w-6' : 'h-5 w-5'
  const tx = size === 'lg' ? 'translate-x-5' : 'translate-x-4'
  return (
    <button
      type="button"
      onClick={() => onChange(!checked)}
      className="inline-flex items-center gap-3"
    >
      <span
        className={cn(
          'relative rounded-full transition-colors',
          w,
          checked ? 'bg-navy-600' : 'bg-line-strong'
        )}
      >
        <span
          className={cn(
            'absolute top-0.5 left-0.5 rounded-full bg-white shadow-sm transition-transform',
            dot,
            checked && tx
          )}
        />
      </span>
      {label && <span className="text-sm text-ink">{label}</span>}
    </button>
  )
}

type RadioProps = {
  checked: boolean
  onChange: () => void
  label: ReactNode
  description?: ReactNode
}

export function Radio({ checked, onChange, label, description }: RadioProps) {
  return (
    <label
      className={cn(
        'flex items-start gap-3 p-3 border rounded-lg cursor-pointer transition',
        checked
          ? 'border-navy-500 bg-navy-50/40'
          : 'border-line bg-white hover:border-line-strong'
      )}
      onClick={() => onChange()}
    >
      <span
        className={cn(
          'mt-0.5 w-4 h-4 rounded-full border-2 flex items-center justify-center shrink-0',
          checked ? 'border-navy-600' : 'border-line-strong'
        )}
      >
        {checked && <span className="w-1.5 h-1.5 rounded-full bg-navy-600" />}
      </span>
      <span>
        <div className="text-sm font-medium text-ink">{label}</div>
        {description && (
          <div className="text-xs text-ink-soft mt-0.5">{description}</div>
        )}
      </span>
    </label>
  )
}
