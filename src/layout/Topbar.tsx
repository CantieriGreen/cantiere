import { Icon } from '@/components/ui/Icon'
import { GlobalSearch } from './GlobalSearch'
import { UserMenu } from './UserMenu'

const SUPPORT_MAIL = 'supporto@edilcontrol.it'

export function Topbar() {
  return (
    <header className="h-14 bg-white border-b border-line sticky top-0 z-30 flex items-center justify-between px-6">
      <GlobalSearch />
      <div className="flex items-center gap-1.5">
        <a
          href={`mailto:${SUPPORT_MAIL}?subject=Richiesta%20assistenza%20EdilControl`}
          className="h-9 w-9 inline-flex items-center justify-center text-ink-soft hover:text-ink rounded-md hover:bg-line-soft"
          title="Assistenza"
        >
          <Icon name="circle-question-mark" size={16} />
        </a>
        <div className="w-px h-6 bg-line mx-2" />
        <UserMenu />
      </div>
    </header>
  )
}
