import { type ReactNode } from 'react'
import { cn } from '@/lib/utils'

export type Column<T> = {
  key: string
  label: string
  width?: number | string
  align?: 'left' | 'right' | 'center'
  mono?: boolean
  render?: (row: T, idx: number) => ReactNode
  foot?: () => ReactNode
}

type Props<T> = {
  columns: Column<T>[]
  rows: T[]
  footer?: Record<string, ReactNode>
  dense?: boolean
  onRowClick?: (row: T) => void
}

export function Table<T extends Record<string, unknown>>({
  columns,
  rows,
  footer,
  dense = false,
  onRowClick,
}: Props<T>) {
  return (
    <div className="overflow-x-auto scroll-thin -mx-px">
      <table className="w-full text-sm">
        <thead>
          <tr className="bg-line-soft text-ink-soft text-[12px] uppercase tracking-wide">
            {columns.map((c, i) => (
              <th
                key={i}
                className={cn(
                  'font-semibold px-4 text-left',
                  dense ? 'py-2' : 'py-2.5',
                  c.align === 'right' && 'text-right',
                  c.align === 'center' && 'text-center'
                )}
                style={c.width ? { width: c.width } : undefined}
              >
                {c.label}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((r, ri) => (
            <tr
              key={ri}
              onClick={onRowClick ? () => onRowClick(r) : undefined}
              className={cn(
                'border-t border-line hover:bg-[#F9FAFB]',
                onRowClick && 'cursor-pointer'
              )}
            >
              {columns.map((c, ci) => (
                <td
                  key={ci}
                  className={cn(
                    'px-4',
                    dense ? 'py-2' : 'py-3',
                    c.align === 'right' && 'text-right num',
                    c.align === 'center' && 'text-center',
                    c.mono && 'font-mono text-[12.5px]'
                  )}
                >
                  {typeof c.render === 'function'
                    ? c.render(r, ri)
                    : (r[c.key] as ReactNode)}
                </td>
              ))}
            </tr>
          ))}
          {footer && (
            <tr className="border-t-2 border-line-strong bg-line-soft/60 font-semibold">
              {columns.map((c, ci) => (
                <td
                  key={ci}
                  className={cn(
                    'px-4 py-3',
                    c.align === 'right' && 'text-right num',
                    c.align === 'center' && 'text-center'
                  )}
                >
                  {footer[c.key] !== undefined
                    ? footer[c.key]
                    : typeof c.foot === 'function'
                    ? c.foot()
                    : ''}
                </td>
              ))}
            </tr>
          )}
        </tbody>
      </table>
    </div>
  )
}
