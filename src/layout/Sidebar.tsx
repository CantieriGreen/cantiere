import { useState } from 'react'
import { NavLink, useLocation } from 'react-router-dom'
import { Icon } from '@/components/ui/Icon'
import { Avatar } from '@/components/ui/Avatar'
import { useAuth } from '@/lib/auth'
import { useAddon } from '@/features/azienda/api'
import { cn } from '@/lib/utils'

type NavChild = { id: string; label: string; to: string }
type NavItem = {
  id: string
  label: string
  icon: string
  to?: string
  count?: number
  children?: NavChild[]
}

const NAV: NavItem[] = [
  { id: 'dashboard', label: 'Dashboard', icon: 'layout-dashboard', to: '/' },
  { id: 'cantieri', label: 'Cantieri commessa', icon: 'hard-hat', to: '/cantieri' },
  { id: 'manutenzione', label: 'Cantieri manutenzione', icon: 'wrench', to: '/manutenzione' },
  { id: 'offerte', label: 'Offerte', icon: 'file-pen', to: '/offerte' },
  { id: 'rapportini', label: 'Rapportini ore', icon: 'clipboard-list', to: '/rapportini' },
  { id: 'materiali', label: 'Materiali', icon: 'package', to: '/materiali' },
  { id: 'ricavi', label: 'Ricavi', icon: 'receipt', to: '/ricavi' },
  { id: 'indiretti', label: 'Costi indiretti', icon: 'building-2', to: '/indiretti' },
  {
    id: 'anagrafiche',
    label: 'Anagrafiche',
    icon: 'users',
    children: [
      { id: 'clienti', label: 'Clienti', to: '/anagrafiche/clienti' },
      { id: 'fornitori', label: 'Fornitori', to: '/anagrafiche/fornitori' },
      { id: 'dipendenti', label: 'Dipendenti', to: '/anagrafiche/dipendenti' },
    ],
  },
  { id: 'report', label: 'Report', icon: 'chart-column', to: '/report' },
  { id: 'impostazioni', label: 'Impostazioni', icon: 'settings', to: '/impostazioni' },
]

const SUPPORT_MAIL = 'supporto@edilcontrol.it'

const RUOLO_LABEL: Record<string, string> = {
  admin: 'Amministratore',
  capo_cantiere: 'Capo cantiere',
  direzione: 'Direzione',
}

export function Sidebar() {
  const location = useLocation()
  const { profile, signOut } = useAuth()
  const addon = useAddon()
  const [openGroups, setOpenGroups] = useState<Record<string, boolean>>({
    anagrafiche: location.pathname.startsWith('/anagrafiche'),
  })

  const toggle = (id: string) =>
    setOpenGroups((s) => ({ ...s, [id]: !s[id] }))

  const nome = profile?.nome ?? 'Utente'
  const ruoloLabel = profile ? RUOLO_LABEL[profile.ruolo] ?? profile.ruolo : '—'

  // Le voci addon restano sempre visibili; se non attive mostrano un lucchetto
  // e cliccandole si apre la pagina "modulo non attivo".
  const isLocked = (id: string) =>
    (id === 'offerte' && !addon.offerte) ||
    (id === 'manutenzione' && !addon.manutenzione)

  return (
    <aside className="w-[240px] shrink-0 bg-white border-r border-line flex flex-col sticky top-0 h-screen">
      {/* Logo */}
      <div className="px-5 pt-5 pb-4 border-b border-line">
        <div className="flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-lg bg-navy-600 text-white flex items-center justify-center shadow-sm">
            <Icon name="hard-hat" size={18} />
          </div>
          <div>
            <div className="font-semibold text-ink leading-none tracking-tight">
              Tecnoimpianti
            </div>
            <div className="text-[11px] text-ink-soft mt-1">
              Gestionale cantieri
            </div>
          </div>
        </div>
      </div>

      {/* User box */}
      <div className="px-3 pt-3 pb-2">
        <button className="w-full flex items-center gap-2.5 p-2 rounded-lg hover:bg-line-soft text-left">
          <Avatar name={nome} size={32} />
          <div className="flex-1 min-w-0">
            <div className="text-sm font-medium text-ink truncate">{nome}</div>
            <div className="text-[11px] text-ink-soft truncate">{ruoloLabel}</div>
          </div>
          <Icon name="chevron-down" size={14} className="text-ink-faint" />
        </button>
      </div>

      {/* Nav */}
      <nav className="flex-1 overflow-y-auto scroll-thin px-2.5 py-2 space-y-0.5">
        {NAV.map((item) => {
          const hasKids = !!item.children
          const expanded = !!openGroups[item.id]
          const groupActive = hasKids
            ? location.pathname.startsWith('/' + item.id)
            : false

          if (hasKids) {
            return (
              <div key={item.id}>
                <button
                  onClick={() => toggle(item.id)}
                  className={cn(
                    'w-full flex items-center gap-2.5 px-2.5 h-9 rounded-md text-[13.5px] font-medium transition',
                    'text-ink-soft hover:text-ink hover:bg-line-soft'
                  )}
                >
                  <Icon name={item.icon} size={16} />
                  <span className="flex-1 text-left">{item.label}</span>
                  <Icon
                    name={
                      expanded || groupActive ? 'chevron-down' : 'chevron-right'
                    }
                    size={13}
                  />
                </button>
                {(expanded || groupActive) && (
                  <div className="ml-7 mt-0.5 mb-1 border-l border-line pl-2 space-y-0.5">
                    {item.children!.map((child) => (
                      <NavLink
                        key={child.id}
                        to={child.to}
                        className={({ isActive }) =>
                          cn(
                            'w-full text-left px-2.5 h-8 rounded-md text-[13px] flex items-center transition',
                            isActive
                              ? 'bg-navy-50 text-navy-700 font-medium'
                              : 'text-ink-soft hover:text-ink hover:bg-line-soft'
                          )
                        }
                      >
                        {child.label}
                      </NavLink>
                    ))}
                  </div>
                )}
              </div>
            )
          }

          return (
            <NavLink
              key={item.id}
              to={item.to!}
              end={item.to === '/'}
              className={({ isActive }) =>
                cn(
                  'w-full flex items-center gap-2.5 px-2.5 h-9 rounded-md text-[13.5px] font-medium transition',
                  isActive
                    ? 'bg-navy-50 text-navy-700'
                    : 'text-ink-soft hover:text-ink hover:bg-line-soft'
                )
              }
            >
              {({ isActive }) => (
                <>
                  <Icon
                    name={item.icon}
                    size={16}
                    className={isActive ? 'text-navy-600' : undefined}
                  />
                  <span className="flex-1 text-left">{item.label}</span>
                  {isLocked(item.id) ? (
                    <Icon
                      name="lock"
                      size={13}
                      className="text-ink-faint"
                    />
                  ) : (
                    item.count !== undefined && (
                      <span
                        className={cn(
                          'text-[10.5px] px-1.5 py-0.5 rounded',
                          isActive
                            ? 'bg-navy-100 text-navy-700'
                            : 'bg-line-soft text-ink-soft'
                        )}
                      >
                        {item.count}
                      </span>
                    )
                  )}
                </>
              )}
            </NavLink>
          )
        })}
      </nav>

      {/* Bottom */}
      <div className="border-t border-line p-3 space-y-1">
        <a
          href={`mailto:${SUPPORT_MAIL}?subject=Richiesta%20assistenza%20EdilControl`}
          className="w-full flex items-center gap-2.5 px-2.5 h-9 rounded-md text-[13.5px] text-ink-soft hover:text-ink hover:bg-line-soft"
        >
          <Icon name="life-buoy" size={16} />
          Centro assistenza
        </a>
        <button
          onClick={() => signOut()}
          className="w-full flex items-center gap-2.5 px-2.5 h-9 rounded-md text-[13.5px] text-ink-soft hover:text-bad hover:bg-bad-soft/40"
        >
          <Icon name="log-out" size={16} />
          Esci
        </button>
      </div>
    </aside>
  )
}
