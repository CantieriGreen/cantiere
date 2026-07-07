import {
  createContext,
  useCallback,
  useContext,
  useState,
  type ReactNode,
} from 'react'
import { Icon } from './Icon'
import { cn } from '@/lib/utils'

type ToastTone = 'success' | 'error' | 'info'
type ToastItem = { id: number; tone: ToastTone; message: string }

type ToastApi = {
  success: (message: string) => void
  error: (message: string) => void
  info: (message: string) => void
}

const ToastContext = createContext<ToastApi | null>(null)

let seq = 1

export function ToastProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<ToastItem[]>([])

  const push = useCallback((tone: ToastTone, message: string) => {
    const id = seq++
    setItems((s) => [...s, { id, tone, message }])
    setTimeout(() => {
      setItems((s) => s.filter((t) => t.id !== id))
    }, 4000)
  }, [])

  const api: ToastApi = {
    success: (m) => push('success', m),
    error: (m) => push('error', m),
    info: (m) => push('info', m),
  }

  return (
    <ToastContext.Provider value={api}>
      {children}
      <div className="fixed bottom-5 right-5 z-[100] flex flex-col gap-2 w-[360px] max-w-[calc(100vw-2.5rem)]">
        {items.map((t) => (
          <div
            key={t.id}
            className={cn(
              'flex items-start gap-3 px-4 py-3 rounded-lg border shadow-card-lg bg-white animate-in',
              t.tone === 'success' && 'border-good/30',
              t.tone === 'error' && 'border-bad/30',
              t.tone === 'info' && 'border-navy-200'
            )}
          >
            <Icon
              name={
                t.tone === 'success'
                  ? 'circle-check'
                  : t.tone === 'error'
                  ? 'circle-alert'
                  : 'info'
              }
              size={18}
              className={cn(
                'mt-0.5 shrink-0',
                t.tone === 'success' && 'text-good-deep',
                t.tone === 'error' && 'text-bad-deep',
                t.tone === 'info' && 'text-navy-600'
              )}
            />
            <span className="text-sm text-ink">{t.message}</span>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  )
}

export function useToast() {
  const ctx = useContext(ToastContext)
  if (!ctx) throw new Error('useToast must be used within <ToastProvider>')
  return ctx
}
