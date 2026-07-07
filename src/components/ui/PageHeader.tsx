import { Fragment, type ReactNode } from 'react'
import { Icon } from './Icon'

type Props = {
  title: ReactNode
  subtitle?: ReactNode
  banner?: ReactNode
  actions?: ReactNode
  breadcrumb?: string[]
}

export function PageBanner({ children }: { children: ReactNode }) {
  return (
    <div className="flex items-start gap-2 text-[13px] text-ink-soft mb-5">
      <Icon name="info" size={14} className="text-navy-500 mt-[2px]" />
      <span>{children}</span>
    </div>
  )
}

export function PageHeader({
  title,
  subtitle,
  banner,
  actions,
  breadcrumb,
}: Props) {
  return (
    <div className="mb-6">
      {breadcrumb && (
        <div className="flex items-center gap-1.5 text-xs text-ink-soft mb-2">
          {breadcrumb.map((b, i) => (
            <Fragment key={i}>
              {i > 0 && <Icon name="chevron-right" size={12} />}
              <span className={i === breadcrumb.length - 1 ? 'text-ink' : ''}>
                {b}
              </span>
            </Fragment>
          ))}
        </div>
      )}
      <div className="flex items-end justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-[26px] font-semibold tracking-tight text-ink leading-tight">
            {title}
          </h1>
          {subtitle && <p className="text-sm text-ink-soft mt-1">{subtitle}</p>}
        </div>
        {actions && <div className="flex items-center gap-2">{actions}</div>}
      </div>
      {banner && (
        <div className="mt-3">
          <PageBanner>{banner}</PageBanner>
        </div>
      )}
    </div>
  )
}
