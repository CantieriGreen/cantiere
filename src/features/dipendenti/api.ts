import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import type {
  Dipendente,
  DipendenteInput,
  TariffaCorrente,
  TariffaOraria,
} from '@/lib/types'

const KEY = ['dipendenti'] as const
const TARIFFE_KEY = ['tariffe'] as const

export type DipendenteConTariffa = Dipendente & {
  tariffa?: TariffaCorrente
}

export function useDipendenti() {
  return useQuery({
    queryKey: KEY,
    queryFn: async (): Promise<DipendenteConTariffa[]> => {
      const [dipRes, tarRes] = await Promise.all([
        supabase
          .from('dipendenti')
          .select('*')
          .order('cognome', { ascending: true }),
        supabase.from('v_tariffa_corrente').select('*'),
      ])
      if (dipRes.error) throw dipRes.error
      if (tarRes.error) throw tarRes.error

      const tariffe = new Map<string, TariffaCorrente>()
      ;(tarRes.data ?? []).forEach((t) =>
        tariffe.set((t as TariffaCorrente).dipendente_id, t as TariffaCorrente)
      )
      return (dipRes.data ?? []).map((d) => ({
        ...(d as Dipendente),
        tariffa: tariffe.get((d as Dipendente).id),
      }))
    },
  })
}

export function useDipendente(id: string | undefined) {
  return useQuery({
    queryKey: [...KEY, id],
    enabled: !!id,
    queryFn: async (): Promise<Dipendente | null> => {
      const { data, error } = await supabase
        .from('dipendenti')
        .select('*')
        .eq('id', id!)
        .maybeSingle()
      if (error) throw error
      return data as Dipendente | null
    },
  })
}

export function useCreateDipendente() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (input: DipendenteInput): Promise<Dipendente> => {
      const { data, error } = await supabase
        .from('dipendenti')
        .insert(input)
        .select('*')
        .single()
      if (error) throw error
      return data as Dipendente
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: KEY }),
  })
}

export function useUpdateDipendente() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async ({
      id,
      input,
    }: {
      id: string
      input: Partial<DipendenteInput>
    }): Promise<Dipendente> => {
      const { data, error } = await supabase
        .from('dipendenti')
        .update(input)
        .eq('id', id)
        .select('*')
        .single()
      if (error) throw error
      return data as Dipendente
    },
    onSuccess: (_d, vars) => {
      qc.invalidateQueries({ queryKey: KEY })
      qc.invalidateQueries({ queryKey: [...KEY, vars.id] })
    },
  })
}

export function useDeleteDipendente() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (id: string): Promise<void> => {
      const { error } = await supabase.from('dipendenti').delete().eq('id', id)
      if (error) throw error
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: KEY }),
  })
}

// ---- Tariffe storicizzate ----

export function useTariffe(dipendenteId: string | undefined) {
  return useQuery({
    queryKey: [...TARIFFE_KEY, dipendenteId],
    enabled: !!dipendenteId,
    queryFn: async (): Promise<TariffaOraria[]> => {
      const { data, error } = await supabase
        .from('costo_orario_dipendente')
        .select('*')
        .eq('dipendente_id', dipendenteId!)
        .order('valido_da', { ascending: true })
      if (error) throw error
      return (data ?? []) as TariffaOraria[]
    },
  })
}

export function useAggiungiTariffa() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (params: {
      dipendente_id: string
      costo_ord: number
      costo_str: number
      valido_da: string
    }): Promise<void> => {
      const { error } = await supabase.rpc('aggiungi_tariffa', {
        p_dipendente_id: params.dipendente_id,
        p_costo_ord: params.costo_ord,
        p_costo_str: params.costo_str,
        p_valido_da: params.valido_da,
      })
      if (error) throw error
    },
    onSuccess: (_d, vars) => {
      qc.invalidateQueries({ queryKey: [...TARIFFE_KEY, vars.dipendente_id] })
      qc.invalidateQueries({ queryKey: KEY })
    },
  })
}

export function useDeleteTariffa() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (params: {
      id: string
      dipendente_id: string
    }): Promise<void> => {
      const { error } = await supabase
        .from('costo_orario_dipendente')
        .delete()
        .eq('id', params.id)
      if (error) throw error
    },
    onSuccess: (_d, vars) => {
      qc.invalidateQueries({ queryKey: [...TARIFFE_KEY, vars.dipendente_id] })
      qc.invalidateQueries({ queryKey: KEY })
    },
  })
}
