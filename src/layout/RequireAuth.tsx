import { Navigate, Outlet, useLocation } from 'react-router-dom'
import { useAuth } from '@/lib/auth'
import { Icon } from '@/components/ui/Icon'

export function RequireAuth() {
  const { loading, session, profile } = useAuth()
  const location = useLocation()

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-canvas">
        <Icon name="loader-circle" size={28} className="animate-spin text-navy-600" />
      </div>
    )
  }

  if (!session) {
    return (
      <Navigate
        to="/login"
        replace
        state={{ from: location.pathname + location.search }}
      />
    )
  }

  if (profile && !profile.attivo) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-canvas px-4">
        <div className="max-w-md text-center bg-white border border-line rounded-xl shadow-card-lg p-8">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-xl bg-bad-soft text-bad-deep mb-4">
            <Icon name="lock" size={28} />
          </div>
          <h1 className="text-lg font-semibold text-ink mb-1">
            Account disattivato
          </h1>
          <p className="text-sm text-ink-soft">
            Il tuo account è stato disattivato. Contatta l'amministratore per
            riattivarlo.
          </p>
        </div>
      </div>
    )
  }

  return <Outlet />
}
