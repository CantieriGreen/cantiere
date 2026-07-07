import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import type { Fornitore, FornitoreInput } from '@/lib/types'

const KEY = ['fornitori'] as const

export function useFornitori() {
  return useQuery({
    queryKey: KEY,
    queryFn: async (): Promise<Fornitore[]> => {
      const { data, error } = await supabase
        .from('fornitori')
        .select('*')
        .order('ragione_sociale', { ascending: true })
      if (error) throw error
      return (data ?? []) as Fornitore[]
    },
  })
}

export function useFornitore(id: string | undefined) {
  return useQuery({
    queryKey: [...KEY, id],
    enabled: !!id,
    queryFn: async (): Promise<Fornitore | null> => {
      const { data, error } = await supabase
        .from('fornitori')
        .select('*')
        .eq('id', id!)
        .maybeSingle()
      if (error) throw error
      return data as Fornitore | null
    },
  })
}

export function useCreateFornitore() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (input: FornitoreInput): Promise<Fornitore> => {
      const { data, error } = await supabase
        .from('fornitori')
        .insert(input)
        .select('*')
        .single()
      if (error) throw error
      return data as Fornitore
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: KEY }),
  })
}

export function useUpdateFornitore() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async ({
      id,
      input,
    }: {
      id: string
      input: Partial<FornitoreInput>
    }): Promise<Fornitore> => {
      const { data, error } = await supabase
        .from('fornitori')
        .update(input)
        .eq('id', id)
        .select('*')
        .single()
      if (error) throw error
      return data as Fornitore
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: KEY }),
  })
}

export function useDeleteFornitore() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (id: string): Promise<void> => {
      const { error } = await supabase.from('fornitori').delete().eq('id', id)
      if (error) throw error
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: KEY }),
  })
}
