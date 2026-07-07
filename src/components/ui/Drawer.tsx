import { useEffect, type ReactNode } from 'react'
import { Icon } from './Icon'
import { cn } from '@/lib/utils'

type Props = {
  open: boolean
  onClose: () => void
  title: ReactNode
  subtitle?: ReactNode
  children: ReactNode
  footer?: ReactNode
  width?: number
}

export function Drawer({
  open,
  onClose,
  title,
  subtitle,
  children,
  footer,
  width = 560,
}: Props) {
  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open, onClose])

  return (
    <div
      className={cn(
        'fixed inset-0 z-50 transition',
        open ? 'pointer-events-auto' : 'pointer-events-none'
      )}
      aria-hidden={!open}
    >
      {/* Overlay */}
      <div
        onClick={onClose}
        className={cn(
          'absolute inset-0 bg-ink/30 transition-opacity duration-200',
          open ? 'opacity-100' : 'opacity-0'
        )}
      />
      {/* Panel */}
      <div
        role="dialog"
        aria-modal="true"
        className={cn(
          'absolute top-0 right-0 h-full bg-white shadow-card-lg flex flex-col transition-transform duration-200 ease-out',
          open ? 'translate-x-0' : 'translate-x-full'
        )}
        style={{ width: `min(${width}px, 100vw)` }}
      >
        <div className="flex items-start justify-between gap-4 px-6 py-4 border-b border-line shrink-0">
          <div className="min-w-0">
            <h2 className="text-[17px] font-semibold text-ink leading-tight truncate">
              {title}
            </h2>
            {subtitle && (
              <p className="text-sm text-ink-soft mt-0.5">{subtitle}</p>
            )}
          </div>
          <button
            onClick={onClose}
            className="w-9 h-9 inline-flex items-center justify-center rounded-md text-ink-soft hover:text-ink hover:bg-line-soft shrink-0"
          >
            <Icon name="x" size={18} />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto scroll-thin px-6 py-5">
          {children}
        </div>

        {footer && (
          <div className="px-6 py-4 border-t border-line bg-white shrink-0">
            {footer}
          </div>
        )}
      </div>
    </div>
  )
}
