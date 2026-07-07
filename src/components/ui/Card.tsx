import { type ReactNode } from 'react'
import { cn } from '@/lib/utils'

type Props = {
  children: ReactNode
  className?: string
  noPad?: boolean
}

export function Card({ children, className, noPad = false }: Props) {
  return (
    <div
      className={cn(
        'bg-white border border-line rounded-lg shadow-card',
        !noPad && 'p-5',
        className
      )}
    >
      {children}
    </div>
  )
}
