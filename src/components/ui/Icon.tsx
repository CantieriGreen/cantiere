import { type LucideProps } from 'lucide-react'
import { iconMap } from './icon-map'
import { cn } from '@/lib/utils'

type Props = Omit<LucideProps, 'name'> & {
  name: string
  size?: number
  className?: string
  strokeWidth?: number
}

export function Icon({
  name,
  size = 18,
  className,
  strokeWidth = 1.75,
  ...rest
}: Props) {
  const Comp = iconMap[name]
  if (!Comp) {
    if (import.meta.env.DEV) {
      console.warn(`[Icon] icona "${name}" non presente in icon-map.ts`)
    }
    return null
  }
  return (
    <Comp
      size={size}
      strokeWidth={strokeWidth}
      className={cn('inline-block shrink-0', className)}
      {...rest}
    />
  )
}
