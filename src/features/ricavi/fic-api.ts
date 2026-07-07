import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import type { FicFatturaImportata, FicFatturaPassiva } from '@/lib/types'

const KEY = ['fic-fatture'] as const

export type SyncBucket = { importate: number; aggiornate: number; totale: number }
export type SyncResult = {
  ok: boolean
  attive: SyncBucket
  passive: SyncBucket
}

/** Fatture importate in attesa di assegnazione (inbox). */
export function useFicInbox() {
  return useQuery({
    queryKey: [...KEY, 'inbox'],
    queryFn: async (): Promise<FicFatturaImportata[]> => {
      const { data, error } = await supabase
        .from('fic_fatture_importate')
        .select('*')
        .eq('stato_assegnazione', 'da_assegnare')
        .order('data', { ascending: false })
      if (error) throw error
      return (data ?? []) as FicFatturaImportata[]
    },
  })
}

/** Lancia la sincronizzazione via Edge Function (solo admin). */
export function useFicSync() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (): Promise<SyncResult> => {
      const { data, error } = await supabase.functions.invoke('fic-sync', {
        body: {},
      })
      // L'Edge Function ritorna errori applicativi nel corpo con status != 2xx:
      // supabase-js mette il messaggio in error.context
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
      return data as SyncResult
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: KEY })
      qc.invalidateQueries({ queryKey: ['ricavi'] })
      qc.invalidateQueries({ queryKey: ['materiali'] })
      qc.invalidateQueries({ queryKey: ['indiretti'] })
      qc.invalidateQueries({ queryKey: ['cantieri'] })
    },
  })
}

export type RigaRipartizione = { cantiere_id: string; importo: number }

/**
 * Ripartisce una fattura su uno o piu cantieri (per importo).
 * Una sola riga = assegnazione semplice; piu righe = quote separate.
 */
export function useAssegnaFattura() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async ({
      stagingId,
      righe,
    }: {
      stagingId: string
      righe: RigaRipartizione[]
    }): Promise<number> => {
      const { data, error } = await supabase.rpc('fic_ripartisci_fattura', {
        p_staging_id: stagingId,
        p_righe: righe,
      })
      if (error) throw error
      return data as number
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: KEY })
      qc.invalidateQueries({ queryKey: ['ricavi'] })
      qc.invalidateQueries({ queryKey: ['cantieri'] })
    },
  })
}

/** Riapre una fattura assegnata: elimina i ricavi generati e la rimette in inbox. */
export function useRiapriFattura() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (stagingId: string): Promise<void> => {
      const { error } = await supabase.rpc('fic_riapri_fattura', {
        p_staging_id: stagingId,
      })
      if (error) throw error
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: KEY })
      qc.invalidateQueries({ queryKey: ['ricavi'] })
      qc.invalidateQueries({ queryKey: ['cantieri'] })
    },
  })
}

/** Scarta una fattura importata (non pertinente ai cantieri). */
export function useIgnoraFattura() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (stagingId: string): Promise<void> => {
      const { error } = await supabase
        .from('fic_fatture_importate')
        .update({ stato_assegnazione: 'ignorata' })
        .eq('id', stagingId)
      if (error) throw error
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: KEY }),
  })
}

// ============================================================
// FATTURE PASSIVE (acquisti)
// ============================================================
const KEY_P = ['fic-passive'] as const

/** Fatture passive in attesa di assegnazione (inbox). */
export function useFicInboxPassive() {
  return useQuery({
    queryKey: [...KEY_P, 'inbox'],
    queryFn: async (): Promise<FicFatturaPassiva[]> => {
      const { data, error } = await supabase
        .from('fic_fatture_passive')
        .select('*')
        .eq('stato_assegnazione', 'da_assegnare')
        .order('data', { ascending: false })
      if (error) throw error
      return (data ?? []) as FicFatturaPassiva[]
    },
  })
}

/**
 * Assegna una fattura passiva:
 * - destinazione "materiale": una o piu righe {cantiere_id, importo} (split per cantiere)
 * - destinazione "indiretto": singolo costo indiretto (righe ignorate, categoria opzionale)
 */
export function useAssegnaPassiva() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (p: {
      stagingId: string
      destinazione: 'materiale' | 'indiretto'
      righe: RigaRipartizione[]
      categoriaId: string | null
    }): Promise<string> => {
      const { data, error } = await supabase.rpc('fic_assegna_passiva', {
        p_staging_id: p.stagingId,
        p_destinazione: p.destinazione,
        p_righe: p.righe,
        p_categoria_id: p.categoriaId,
      })
      if (error) throw error
      return data as string
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: KEY_P })
      qc.invalidateQueries({ queryKey: ['materiali'] })
      qc.invalidateQueries({ queryKey: ['indiretti'] })
      qc.invalidateQueries({ queryKey: ['fornitori'] })
      qc.invalidateQueries({ queryKey: ['cantieri'] })
    },
  })
}

/** Scarta una fattura passiva (non pertinente). */
export function useIgnoraPassiva() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (stagingId: string): Promise<void> => {
      const { error } = await supabase
        .from('fic_fatture_passive')
        .update({ stato_assegnazione: 'ignorata' })
        .eq('id', stagingId)
      if (error) throw error
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: KEY_P }),
  })
}
