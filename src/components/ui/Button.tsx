import { forwardRef, type ButtonHTMLAttributes, type ReactNode } from 'react'
import { Icon } from './Icon'
import { cn } from '@/lib/utils'

type Variant = 'primary' | 'secondary' | 'ghost' | 'danger' | 'soft'
type Size = 'sm' | 'md' | 'lg' | 'xl'

type Props = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: Variant
  size?: Size
  icon?: string
  iconRight?: string
  children?: ReactNode
}

const sizes: Record<Size, string> = {
  sm: 'h-8 px-3 text-[13px]',
  md: 'h-10 px-4 text-sm',
  lg: 'h-12 px-5 text-[15px]',
  xl: 'h-14 px-6 text-base',
}

const variants: Record<Variant, string> = {
  primary: 'bg-navy-600 text-white hover:bg-navy-700 active:bg-navy-800 shadow-sm',
  secondary: 'bg-white border border-line text-ink hover:bg-line-soft',
  ghost: 'text-ink-soft hover:text-ink hover:bg-line-soft',
  danger: 'bg-bad text-white hover:bg-bad-deep',
  soft: 'bg-navy-50 text-navy-700 hover:bg-navy-100',
}

export const Button = forwardRef<HTMLButtonElement, Props>(function Button(
  {
    variant = 'primary',
    size = 'md',
    icon,
    iconRight,
    className,
    children,
    ...rest
  },
  ref
) {
  const iconSize = size === 'lg' || size === 'xl' ? 18 : 16
  return (
    <button
      ref={ref}
      className={cn(
        'inline-flex items-center justify-center gap-2 rounded-lg font-medium transition-colors disabled:opacity-50 whitespace-nowrap shrink-0',
        sizes[size],
        variants[variant],
        className
      )}
      {...rest}
    >
      {icon && <Icon name={icon} size={iconSize} />}
      {children}
      {iconRight && <Icon name={iconRight} size={iconSize} />}
    </button>
  )
})
