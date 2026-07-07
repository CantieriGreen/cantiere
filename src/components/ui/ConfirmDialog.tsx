import { type ReactNode } from 'react'
import { Icon } from './Icon'
import { Button } from './Button'

type Props = {
  open: boolean
  title: string
  message: ReactNode
  confirmLabel?: string
  cancelLabel?: string
  danger?: boolean
  loading?: boolean
  onConfirm: () => void
  onCancel: () => void
}

export function ConfirmDialog({
  open,
  title,
  message,
  confirmLabel = 'Conferma',
  cancelLabel = 'Annulla',
  danger = false,
  loading = false,
  onConfirm,
  onCancel,
}: Props) {
  if (!open) return null
  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center px-4">
      <div className="absolute inset-0 bg-ink/40" onClick={onCancel} />
      <div className="relative bg-white rounded-xl shadow-card-lg w-full max-w-md p-6">
        <div className="flex items-start gap-4">
          <div
            className={`w-11 h-11 rounded-lg flex items-center justify-center shrink-0 ${
              danger
                ? 'bg-bad-soft text-bad-deep'
                : 'bg-navy-50 text-navy-600'
            }`}
          >
            <Icon name={danger ? 'triangle-alert' : 'circle-question-mark'} size={22} />
          </div>
          <div className="min-w-0">
            <h2 className="text-[17px] font-semibold text-ink leading-tight">
              {title}
            </h2>
            <p className="text-sm text-ink-soft mt-1">{message}</p>
          </div>
        </div>
        <div className="flex items-center justify-end gap-3 mt-6">
          <Button variant="secondary" onClick={onCancel} disabled={loading}>
            {cancelLabel}
          </Button>
          <Button
            variant={danger ? 'danger' : 'primary'}
            onClick={onConfirm}
            disabled={loading}
            icon={loading ? 'loader-circle' : undefined}
          >
            {confirmLabel}
          </Button>
        </div>
      </div>
    </div>
  )
}
