import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/lib/auth'
import type { Materiale, MaterialeInput, TipoMateriale } from '@/lib/types'

const KEY = ['materiali'] as const

export type MaterialeConDettagli = Materiale & {
  cantiere?: { codice: string; nome: string } | null
  fornitore?: { ragione_sociale: string } | null
  tipo_materiale?: { nome: string } | null
}

type ListParams = { cantiereId?: string; fornitoreId?: string }

export function useMateriali(params: ListParams = {}) {
  return useQuery({
    queryKey: [...KEY, params],
    queryFn: async (): Promise<MaterialeConDettagli[]> => {
      let q = supabase
        .from('materiali')
        .select(
          '*, cantiere:cantieri(codice, nome), fornitore:fornitori(ragione_sociale), tipo_materiale:tipi_materiale(nome)'
        )
        .order('data', { ascending: false })
      if (params.cantiereId) q = q.eq('cantiere_id', params.cantiereId)
      if (params.fornitoreId) q = q.eq('fornitore_id', params.fornitoreId)
      const { data, error } = await q
      if (error) throw error
      return (data ?? []) as MaterialeConDettagli[]
    },
  })
}

export function useTipiMateriale() {
  return useQuery({
    queryKey: ['tipi-materiale'],
    queryFn: async (): Promise<TipoMateriale[]> => {
      const { data, error } = await supabase
        .from('tipi_materiale')
        .select('*')
        .eq('attivo', true)
        .order('nome', { ascending: true })
      if (error) throw error
      return (data ?? []) as TipoMateriale[]
    },
    staleTime: 5 * 60 * 1000,
  })
}

export function useCreateMateriale() {
  const qc = useQueryClient()
  const { user } = useAuth()
  return useMutation({
    mutationFn: async (input: MaterialeInput): Promise<Materiale> => {
      const { data, error } = await supabase
        .from('materiali')
        .insert({ ...input, created_by: user?.id ?? null })
        .select('*')
        .single()
      if (error) throw error
      return data as Materiale
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: KEY })
      qc.invalidateQueries({ queryKey: ['cantieri'] })
    },
  })
}

export function useUpdateMateriale() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async ({
      id,
      input,
    }: {
      id: string
      input: Partial<MaterialeInput>
    }): Promise<Materiale> => {
      const { data, error } = await supabase
        .from('materiali')
        .update(input)
        .eq('id', id)
        .select('*')
        .single()
      if (error) throw error
      return data as Materiale
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: KEY })
      qc.invalidateQueries({ queryKey: ['cantieri'] })
    },
  })
}

export function useDeleteMateriale() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (id: string): Promise<void> => {
      const { error } = await supabase.from('materiali').delete().eq('id', id)
      if (error) throw error
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: KEY })
      qc.invalidateQueries({ queryKey: ['cantieri'] })
    },
  })
}
