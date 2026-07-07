import { useEffect, useRef, useState } from 'react'
import { Icon } from '@/components/ui/Icon'
import { Avatar } from '@/components/ui/Avatar'
import { useAuth } from '@/lib/auth'

const RUOLO_LABEL: Record<string, string> = {
  admin: 'Amministratore',
  capo_cantiere: 'Capo cantiere',
  direzione: 'Direzione',
}

export function UserMenu() {
  const { profile, user, signOut } = useAuth()
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const onClick = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', onClick)
    return () => document.removeEventListener('mousedown', onClick)
  }, [])

  const nome = profile?.nome ?? 'Utente'
  const ruolo = profile ? RUOLO_LABEL[profile.ruolo] ?? profile.ruolo : '—'

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => setOpen((o) => !o)}
        className="h-9 inline-flex items-center gap-2 pr-1 pl-2 rounded-md hover:bg-line-soft"
      >
        <Avatar name={nome} size={26} />
        <Icon name="chevron-down" size={14} className="text-ink-faint" />
      </button>

      {open && (
        <div className="absolute top-11 right-0 w-60 bg-white border border-line rounded-lg shadow-card-lg z-50 overflow-hidden">
          <div className="px-4 py-3 border-b border-line flex items-center gap-3">
            <Avatar name={nome} size={36} />
            <div className="min-w-0">
              <div className="text-sm font-medium text-ink truncate">{nome}</div>
              <div className="text-xs text-ink-soft truncate">{ruolo}</div>
              {user?.email && (
                <div className="text-[11px] text-ink-faint truncate mt-0.5">
                  {user.email}
                </div>
              )}
            </div>
          </div>
          <button
            onClick={() => signOut()}
            className="w-full flex items-center gap-2.5 px-4 h-10 text-sm text-ink-soft hover:text-bad hover:bg-bad-soft/40 transition text-left"
          >
            <Icon name="log-out" size={16} />
            Esci
          </button>
        </div>
      )}
    </div>
  )
}
