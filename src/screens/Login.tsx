import { useState, type FormEvent } from 'react'
import { Navigate, useLocation } from 'react-router-dom'
import { Icon } from '@/components/ui/Icon'
import { Button } from '@/components/ui/Button'
import { Field, Input } from '@/components/ui/Field'
import { useAuth } from '@/lib/auth'

export function Login() {
  const { session, loading, signIn } = useAuth()
  const location = useLocation()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  if (loading) return <FullScreenSpinner />
  if (session) {
    const to = (location.state as { from?: string } | null)?.from ?? '/'
    return <Navigate to={to} replace />
  }

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault()
    setError(null)
    setSubmitting(true)
    const { error: err } = await signIn(email, password)
    setSubmitting(false)
    if (err) setError(traduciErroreSupabase(err))
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-canvas px-4">
      <div className="w-full max-w-[400px]">
        {/* Brand */}
        <div className="flex items-center justify-center gap-3 mb-8">
          <div className="w-11 h-11 rounded-xl bg-navy-600 text-white flex items-center justify-center shadow-sm">
            <Icon name="hard-hat" size={22} />
          </div>
          <div>
            <div className="text-[20px] font-semibold text-ink tracking-tight leading-none">
              Tecnoimpianti
            </div>
            <div className="text-xs text-ink-soft mt-1">Gestionale cantieri</div>
          </div>
        </div>

        <div className="bg-white border border-line rounded-xl shadow-card-lg p-8">
          <h1 className="text-[22px] font-semibold tracking-tight text-ink leading-tight mb-1">
            Accedi
          </h1>
          <p className="text-sm text-ink-soft mb-6">
            Usa le credenziali del tuo account aziendale.
          </p>

          <form onSubmit={onSubmit} className="grid grid-cols-12 gap-4">
            <Field label="Email" required>
              <Input
                size="lg"
                type="email"
                autoComplete="email"
                leftIcon="mail"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="tu@azienda.it"
                required
              />
            </Field>
            <Field label="Password" required>
              <Input
                size="lg"
                type="password"
                autoComplete="current-password"
                leftIcon="lock"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                required
              />
            </Field>

            {error && (
              <div className="col-span-12 flex items-start gap-2 p-3 bg-bad-soft/60 border border-bad/20 rounded-lg text-sm text-bad-deep">
                <Icon name="circle-alert" size={16} className="mt-0.5 shrink-0" />
                <span>{error}</span>
              </div>
            )}

            <div className="col-span-12 mt-2">
              <Button
                type="submit"
                size="lg"
                className="w-full"
                disabled={submitting}
                icon={submitting ? 'loader-circle' : 'log-in'}
              >
                {submitting ? 'Accesso in corso…' : 'Accedi'}
              </Button>
            </div>
          </form>

          <div className="mt-6 pt-5 border-t border-line text-center">
            <p className="text-xs text-ink-soft">
              Problemi ad accedere?{' '}
              <a
                href="mailto:support@greenconsulting.it?subject=Problema%20accesso%20Tecnoimpianti"
                className="text-navy-700 font-medium hover:underline"
              >
                Contatta il supporto
              </a>
            </p>
          </div>
        </div>

        <p className="text-center text-xs text-ink-faint mt-6">
          © {new Date().getFullYear()} Tecnoimpianti
        </p>
      </div>
    </div>
  )
}

function FullScreenSpinner() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-canvas">
      <Icon name="loader-circle" size={28} className="animate-spin text-navy-600" />
    </div>
  )
}

function traduciErroreSupabase(msg: string) {
  const m = msg.toLowerCase()
  if (m.includes('invalid login credentials'))
    return 'Email o password non corretti.'
  if (m.includes('email not confirmed'))
    return 'Email non confermata. Controlla la tua casella di posta.'
  if (m.includes('rate limit') || m.includes('too many'))
    return 'Troppi tentativi. Attendi qualche minuto e riprova.'
  return 'Errore di accesso: ' + msg
}
