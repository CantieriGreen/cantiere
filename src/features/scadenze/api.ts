import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import type {
  DocumentoAltro,
  DocumentoAltroInput,
  DocumentoDipendente,
  DocumentoDipendenteInput,
  Formazione,
  FormazioneInput,
  Mezzo,
  MezzoInput,
  ScadenzaUnificata,
  TipoFormazione,
  VisitaMedica,
  VisitaMedicaInput,
} from '@/lib/types'
import { useCreateDipendente } from '@/features/dipendenti/api'
import { GIORNI_AVVISO } from './constants'
import type { Persona } from './persona'

// Tutte le chiavi sotto 'scadenze': ogni modifica invalida anche la vista
// unificata, cosi' la campanella degli avvisi si aggiorna subito.
const ROOT = ['scadenze'] as const
const MEZZI_KEY = [...ROOT, 'mezzi'] as const
const VISITE_KEY = [...ROOT, 'visite'] as const
const FORMAZIONE_KEY = [...ROOT, 'formazione'] as const
const TIPI_FORMAZIONE_KEY = [...ROOT, 'tipi-formazione'] as const
const DOCUMENTI_KEY = [...ROOT, 'documenti'] as const
const ALTRO_KEY = [...ROOT, 'altro'] as const
const AVVISI_KEY = [...ROOT, 'avvisi'] as const

/**
 * CRUD per le tabelle del calendario scadenze: stessa forma per tutte,
 * cambia solo tabella e ordinamento.
 */
function crud<T, I>(table: string, key: readonly string[], orderBy: string) {
  const useList = () =>
    useQuery({
      queryKey: key,
      queryFn: async (): Promise<T[]> => {
        const { data, error } = await supabase
          .from(table)
          .select('*')
          .order(orderBy, { ascending: true, nullsFirst: false })
        if (error) throw error
        return (data ?? []) as T[]
      },
    })

  const useCreate = () => {
    const qc = useQueryClient()
    return useMutation({
      mutationFn: async (input: I): Promise<T> => {
        const { data, error } = await supabase
          .from(table)
          .insert(input as object)
          .select('*')
          .single()
        if (error) throw error
        return data as T
      },
      onSuccess: () => qc.invalidateQueries({ queryKey: ROOT }),
    })
  }

  const useUpdate = () => {
    const qc = useQueryClient()
    return useMutation({
      mutationFn: async ({ id, input }: { id: string; input: Partial<I> }): Promise<T> => {
        const { data, error } = await supabase
          .from(table)
          .update(input as object)
          .eq('id', id)
          .select('*')
          .single()
        if (error) throw error
        return data as T
      },
      onSuccess: () => qc.invalidateQueries({ queryKey: ROOT }),
    })
  }

  const useDelete = () => {
    const qc = useQueryClient()
    return useMutation({
      mutationFn: async (id: string): Promise<void> => {
        const { error } = await supabase.from(table).delete().eq('id', id)
        if (error) throw error
      },
      onSuccess: () => qc.invalidateQueries({ queryKey: ROOT }),
    })
  }

  return { useList, useCreate, useUpdate, useDelete }
}

// ---- Mezzi ----
const mezzi = crud<Mezzo, MezzoInput>('mezzi', MEZZI_KEY, 'tipo_mezzo')
export const useMezzi = mezzi.useList
export const useCreateMezzo = mezzi.useCreate
export const useUpdateMezzo = mezzi.useUpdate
export const useDeleteMezzo = mezzi.useDelete

// ---- Visite mediche ----
const visite = crud<VisitaMedica, VisitaMedicaInput>(
  'scadenze_visite_mediche',
  VISITE_KEY,
  'scadenza_visita'
)
export const useVisiteMediche = visite.useList
export const useCreateVisita = visite.useCreate
export const useUpdateVisita = visite.useUpdate
export const useDeleteVisita = visite.useDelete

// ---- Formazione sicurezza ----
const formazione = crud<Formazione, FormazioneInput>(
  'scadenze_formazione',
  FORMAZIONE_KEY,
  'scadenza'
)
export const useFormazione = formazione.useList
export const useUpdateFormazione = formazione.useUpdate
export const useDeleteFormazione = formazione.useDelete

/** Inserisce in un colpo solo piu' corsi per la stessa persona. */
export function useCreateFormazioni() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (righe: FormazioneInput[]): Promise<number> => {
      const { data, error } = await supabase
        .from('scadenze_formazione')
        .insert(righe)
        .select('id')
      if (error) throw error
      return (data ?? []).length
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ROOT }),
  })
}

export function useTipiFormazione() {
  return useQuery({
    queryKey: TIPI_FORMAZIONE_KEY,
    queryFn: async (): Promise<TipoFormazione[]> => {
      const { data, error } = await supabase
        .from('tipi_formazione')
        .select('*')
        .eq('attivo', true)
        // prima i corsi predefiniti (nell'ordine di inserimento), poi quelli aggiunti
        .order('predefinito', { ascending: false })
        .order('created_at', { ascending: true })
      if (error) throw error
      return (data ?? []) as TipoFormazione[]
    },
  })
}

export function useCreateTipoFormazione() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (nome: string): Promise<TipoFormazione> => {
      const { data, error } = await supabase
        .from('tipi_formazione')
        .insert({ nome: nome.trim(), predefinito: false })
        .select('*')
        .single()
      if (error) throw error
      return data as TipoFormazione
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: TIPI_FORMAZIONE_KEY }),
  })
}

// ---- Patenti e permessi di soggiorno ----
const documenti = crud<DocumentoDipendente, DocumentoDipendenteInput>(
  'scadenze_documenti',
  DOCUMENTI_KEY,
  'cognome'
)
export const useDocumentiDipendenti = documenti.useList
export const useCreateDocumento = documenti.useCreate
export const useUpdateDocumento = documenti.useUpdate
export const useDeleteDocumento = documenti.useDelete

// ---- Altri documenti (DURC, ecc.) ----
const altro = crud<DocumentoAltro, DocumentoAltroInput>('scadenze_altro', ALTRO_KEY, 'scadenza')
export const useDocumentiAltro = altro.useList
export const useCreateDocumentoAltro = altro.useCreate
export const useUpdateDocumentoAltro = altro.useUpdate
export const useDeleteDocumentoAltro = altro.useDelete

// ---- Avvisi (vista unificata) ----

/** Scadenze gia' passate o entro GIORNI_AVVISO giorni, dalla piu' urgente. */
export function useAvvisiScadenze(enabled = true) {
  return useQuery({
    queryKey: AVVISI_KEY,
    enabled,
    // ricontrolla ogni 10 minuti: i giorni mancanti cambiano a mezzanotte
    refetchInterval: 10 * 60 * 1000,
    queryFn: async (): Promise<ScadenzaUnificata[]> => {
      const { data, error } = await supabase
        .from('v_scadenze')
        .select('*')
        .lte('giorni', GIORNI_AVVISO)
        .order('giorni', { ascending: true })
      if (error) throw error
      return (data ?? []) as ScadenzaUnificata[]
    },
  })
}

export type EsitoInvioAvvisi = {
  ok: boolean
  inviate: number
  destinatari?: number
  messaggio?: string
}

/** Lancia a mano l'invio email (stessa logica del cron giornaliero). */
export function useInviaAvvisiEmail() {
  return useMutation({
    mutationFn: async (): Promise<EsitoInvioAvvisi> => {
      const { data, error } = await supabase.functions.invoke('scadenze-notify', {
        body: {},
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
      return data as EsitoInvioAvvisi
    },
  })
}

/**
 * Restituisce il dipendente_id da salvare sulla scadenza. Se il nominativo
 * e' libero e l'utente ha chiesto di aggiungerlo all'anagrafica, crea prima
 * il dipendente (senza tariffa: va completata da Anagrafiche → Dipendenti).
 */
export function useDipendenteDaPersona() {
  const createDip = useCreateDipendente()
  const risolvi = async (p: Persona): Promise<string | null> => {
    if (p.dipendente_id) return p.dipendente_id
    if (!p.aggiungiAnagrafica) return null
    const d = await createDip.mutateAsync({
      nome: p.nome.trim(),
      cognome: p.cognome.trim(),
      telefono: p.telefono?.trim() || null,
      codice_fiscale: null,
      mansione: null,
      tipo: 'operaio',
      email: null,
      data_assunzione: null,
      attivo: true,
    })
    return d.id
  }
  return { risolvi, isPending: createDip.isPending }
}
