import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import type { Ricavo, RicavoInput } from '@/lib/types'

const KEY = ['ricavi'] as const

export type RicavoConDettagli = Ricavo & {
  cantiere?: {
    codice: string
    nome: string
    cliente?: { ragione_sociale: string } | null
  } | null
}

type ListParams = { cantiereId?: string }

export function useRicavi(params: ListParams = {}) {
  return useQuery({
    queryKey: [...KEY, params],
    queryFn: async (): Promise<RicavoConDettagli[]> => {
      let q = supabase
        .from('ricavi')
        .select(
          '*, cantiere:cantieri(codice, nome, cliente:clienti(ragione_sociale))'
        )
        .order('data', { ascending: false })
      if (params.cantiereId) q = q.eq('cantiere_id', params.cantiereId)
      const { data, error } = await q
      if (error) throw error
      return (data ?? []) as RicavoConDettagli[]
    },
  })
}

export function useCreateRicavo() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (input: RicavoInput): Promise<Ricavo> => {
      const { data, error } = await supabase
        .from('ricavi')
        .insert(input)
        .select('*')
        .single()
      if (error) throw error
      return data as Ricavo
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: KEY })
      qc.invalidateQueries({ queryKey: ['cantieri'] })
    },
  })
}

export function useUpdateRicavo() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async ({
      id,
      input,
    }: {
      id: string
      input: Partial<RicavoInput>
    }): Promise<Ricavo> => {
      const { data, error } = await supabase
        .from('ricavi')
        .update(input)
        .eq('id', id)
        .select('*')
        .single()
      if (error) throw error
      return data as Ricavo
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: KEY })
      qc.invalidateQueries({ queryKey: ['cantieri'] })
    },
  })
}

export function useDeleteRicavo() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (id: string): Promise<void> => {
      const { error } = await supabase.from('ricavi').delete().eq('id', id)
      if (error) throw error
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: KEY })
      qc.invalidateQueries({ queryKey: ['cantieri'] })
    },
  })
}
