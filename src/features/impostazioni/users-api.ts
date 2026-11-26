import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import type { Ruolo, StatoCantiere } from '@/lib/types'

export type ProfiloUtente = {
  id: string
  nome: string
  ruolo: Ruolo
  attivo: boolean
  created_at: string
}

export function useProfili() {
  return useQuery({
    queryKey: ['profili'],
    queryFn: async (): Promise<ProfiloUtente[]> => {
      const { data, error } = await supabase
        .from('profiles')
        .select('id, nome, ruolo, attivo, created_at')
        .order('nome', { ascending: true })
      if (error) throw error
      return (data ?? []) as ProfiloUtente[]
    },
  })
}

export function useUpdateProfilo() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async ({
      id,
      input,
    }: {
      id: string
      input: Partial<Pick<ProfiloUtente, 'nome' | 'ruolo' | 'attivo'>>
    }): Promise<void> => {
      const { error } = await supabase
        .from('profiles')
        .update(input)
        .eq('id', id)
      if (error) throw error
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['profili'] }),
  })
}

export type NuovoUtenteInput = {
  nome: string
  email: string
  password: string
  ruolo: Ruolo
}

/** Crea un utente tramite la Edge Function utenti-crea (solo admin). */
export function useCreaUtente() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (input: NuovoUtenteInput): Promise<void> => {
      const { error } = await supabase.functions.invoke('utenti-crea', {
        body: input,
      })
      if (error) {
        let dettaglio = error.message
        try {
          const ctx = await (error as { context?: Response }).context?.json()
          if (ctx?.error) dettaglio = ctx.error + (ctx.dettaglio ? ` — ${ctx.dettaglio}` : '')
        } catch {
          /* noop */
        }
        throw new Error(dettaglio)
      }
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['profili'] }),
  })
}

// ------------------------------------------------------------
// Assegnazione cantieri ai capi cantiere
// ------------------------------------------------------------

export type Assegnazione = { profile_id: string; cantiere_id: string }

export type CantiereBreve = {
  id: string
  codice: string
  nome: string
  stato: StatoCantiere
  manutenzione: boolean
}

/** Tutte le assegnazioni capo cantiere ↔ cantiere (l'admin le vede tutte). */
export function useAssegnazioni() {
  return useQuery({
    queryKey: ['assegnazioni-capi'],
    queryFn: async (): Promise<Assegnazione[]> => {
      const { data, error } = await supabase
        .from('capo_cantiere_assegnazione')
        .select('profile_id, cantiere_id')
      if (error) throw error
      return (data ?? []) as Assegnazione[]
    },
  })
}

/** Elenco leggero dei cantieri (commessa e manutenzione) per le assegnazioni. */
export function useCantieriBrevi() {
  return useQuery({
    queryKey: ['cantieri-brevi'],
    queryFn: async (): Promise<CantiereBreve[]> => {
      const { data, error } = await supabase
        .from('cantieri')
        .select('id, codice, nome, stato, manutenzione')
        .order('codice', { ascending: false })
      if (error) throw error
      return (data ?? []) as CantiereBreve[]
    },
  })
}

/** Imposta l'elenco completo dei cantieri assegnati a un capo cantiere. */
export function useSalvaAssegnazioni() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async ({
      profileId,
      prima,
      dopo,
    }: {
      profileId: string
      prima: string[]
      dopo: string[]
    }): Promise<void> => {
      const daTogliere = prima.filter((id) => !dopo.includes(id))
      const daAggiungere = dopo.filter((id) => !prima.includes(id))
      if (daAggiungere.length > 0) {
        const { error } = await supabase
          .from('capo_cantiere_assegnazione')
          .upsert(
            daAggiungere.map((cantiere_id) => ({ profile_id: profileId, cantiere_id })),
            { onConflict: 'profile_id,cantiere_id', ignoreDuplicates: true }
          )
        if (error) throw error
      }
      if (daTogliere.length > 0) {
        const { error } = await supabase
          .from('capo_cantiere_assegnazione')
          .delete()
          .eq('profile_id', profileId)
          .in('cantiere_id', daTogliere)
        if (error) throw error
      }
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['assegnazioni-capi'] }),
  })
}
