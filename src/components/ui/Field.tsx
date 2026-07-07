import {
  forwardRef,
  type InputHTMLAttributes,
  type ReactNode,
  type SelectHTMLAttributes,
  type TextareaHTMLAttributes,
} from 'react'
import { Icon } from './Icon'
import { cn } from '@/lib/utils'

type FieldProps = {
  label: string
  hint?: ReactNode
  error?: ReactNode
  required?: boolean
  children: ReactNode
  span?: number
  className?: string
}

export function Field({
  label,
  hint,
  error,
  required,
  children,
  span = 12,
  className,
}: FieldProps) {
  return (
    <div className={cn(`col-span-12 md:col-span-${span}`, className)}>
      <label className="block text-sm font-medium text-ink mb-1.5">
        {label}
        {required && <span className="text-bad ml-0.5">*</span>}
      </label>
      {children}
      {hint && !error && (
        <p className="text-xs text-ink-soft mt-1.5">{hint}</p>
      )}
      {error && <p className="text-xs text-bad mt-1.5">{error}</p>}
    </div>
  )
}

type InputSize = 'md' | 'lg'

type InputProps = Omit<InputHTMLAttributes<HTMLInputElement>, 'size'> & {
  size?: InputSize
  leftIcon?: string
  rightAddon?: ReactNode
  inputClassName?: string
}

export const Input = forwardRef<HTMLInputElement, InputProps>(function Input(
  { className, size = 'md', leftIcon, rightAddon, inputClassName, ...rest },
  ref
) {
  const sz = size === 'lg' ? 'h-12 text-[15px]' : 'h-10 text-sm'
  return (
    <div className={cn('relative flex items-stretch', className)}>
      {leftIcon && (
        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-ink-soft pointer-events-none">
          <Icon name={leftIcon} size={16} />
        </span>
      )}
      <input
        ref={ref}
        className={cn(
          'w-full bg-white border border-line rounded-lg px-3 text-ink placeholder:text-ink-faint focus:outline-none focus:border-navy-500 focus:shadow-ring transition',
          leftIcon && 'pl-9',
          rightAddon && 'rounded-r-none',
          sz,
          inputClassName
        )}
        {...rest}
      />
      {rightAddon && (
        <span
          className={cn(
            'inline-flex items-center px-3 bg-line-soft border border-l-0 border-line rounded-r-lg text-ink-soft text-sm',
            sz
          )}
        >
          {rightAddon}
        </span>
      )}
    </div>
  )
})

type SelectProps = Omit<SelectHTMLAttributes<HTMLSelectElement>, 'size'> & {
  size?: InputSize
  leftIcon?: string
  children: ReactNode
}

export function Select({
  size = 'md',
  leftIcon,
  className,
  children,
  ...rest
}: SelectProps) {
  const sz = size === 'lg' ? 'h-12 text-[15px]' : 'h-10 text-sm'
  return (
    <div className={cn('relative', className)}>
      {leftIcon && (
        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-ink-soft pointer-events-none">
          <Icon name={leftIcon} size={16} />
        </span>
      )}
      <select
        className={cn(
          'w-full bg-white border border-line rounded-lg px-3 pr-9 text-ink appearance-none focus:outline-none focus:border-navy-500 focus:shadow-ring',
          leftIcon && 'pl-9',
          sz
        )}
        {...rest}
      >
        {children}
      </select>
      <span className="absolute right-3 top-1/2 -translate-y-1/2 text-ink-soft pointer-events-none">
        <Icon name="chevron-down" size={16} />
      </span>
    </div>
  )
}

type TextareaProps = TextareaHTMLAttributes<HTMLTextAreaElement>

export const Textarea = forwardRef<HTMLTextAreaElement, TextareaProps>(
  function Textarea({ className, ...rest }, ref) {
    return (
      <textarea
        ref={ref}
        className={cn(
          'w-full bg-white border border-line rounded-lg px-3 py-2.5 text-sm text-ink placeholder:text-ink-faint focus:outline-none focus:border-navy-500 focus:shadow-ring',
          className
        )}
        {...rest}
      />
    )
  }
)
