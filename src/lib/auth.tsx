import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react'
import type { Session, User } from '@supabase/supabase-js'
import { supabase } from './supabase'

export type Ruolo = 'admin' | 'capo_cantiere' | 'direzione'

export type Profile = {
  id: string
  nome: string
  ruolo: Ruolo
  attivo: boolean
}

type AuthState = {
  loading: boolean
  session: Session | null
  user: User | null
  profile: Profile | null
  signIn: (
    email: string,
    password: string
  ) => Promise<{ error: string | null }>
  signOut: () => Promise<void>
}

const AuthContext = createContext<AuthState | null>(null)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [loading, setLoading] = useState(true)
  const [session, setSession] = useState<Session | null>(null)
  const [profile, setProfile] = useState<Profile | null>(null)

  const loadProfile = useCallback(async (userId: string) => {
    const { data, error } = await supabase
      .from('profiles')
      .select('id, nome, ruolo, attivo')
      .eq('id', userId)
      .maybeSingle()
    if (error) {
      console.error('[auth] errore profile:', error.message)
      setProfile(null)
      return
    }
    setProfile(data as Profile | null)
  }, [])

  useEffect(() => {
    let mounted = true

    // Prima lettura della sessione: sblocca subito l'app, il profilo si carica
    // in background (non blocchiamo il loading sulla query del profilo).
    supabase.auth.getSession().then(({ data }) => {
      if (!mounted) return
      setSession(data.session)
      if (data.session?.user) void loadProfile(data.session.user.id)
      setLoading(false)
    })

    // IMPORTANTE: il callback di onAuthStateChange deve restare sincrono e NON
    // deve attendere altre chiamate Supabase al suo interno (rischio di deadlock
    // sul lock interno di gotrue). Il profilo viene caricato fuori dal callback.
    const { data: sub } = supabase.auth.onAuthStateChange((_event, newSession) => {
      if (!mounted) return
      setSession(newSession)
      if (newSession?.user) {
        setTimeout(() => {
          if (mounted) void loadProfile(newSession.user.id)
        }, 0)
      } else {
        setProfile(null)
      }
      setLoading(false)
    })

    return () => {
      mounted = false
      sub.subscription.unsubscribe()
    }
  }, [loadProfile])

  const signIn = useCallback(
    async (email: string, password: string) => {
      const { error } = await supabase.auth.signInWithPassword({
        email,
        password,
      })
      if (error) return { error: error.message }
      return { error: null }
    },
    []
  )

  const signOut = useCallback(async () => {
    await supabase.auth.signOut()
  }, [])

  const value = useMemo<AuthState>(
    () => ({
      loading,
      session,
      user: session?.user ?? null,
      profile,
      signIn,
      signOut,
    }),
    [loading, session, profile, signIn, signOut]
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used within <AuthProvider>')
  return ctx
}
