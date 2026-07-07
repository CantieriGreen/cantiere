import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import type { Cliente, ClienteInput } from '@/lib/types'

const KEY = ['clienti'] as const

export function useClienti() {
  return useQuery({
    queryKey: KEY,
    queryFn: async (): Promise<Cliente[]> => {
      const { data, error } = await supabase
        .from('clienti')
        .select('*')
        .order('ragione_sociale', { ascending: true })
      if (error) throw error
      return (data ?? []) as Cliente[]
    },
  })
}

export function useCliente(id: string | undefined) {
  return useQuery({
    queryKey: [...KEY, id],
    enabled: !!id,
    queryFn: async (): Promise<Cliente | null> => {
      const { data, error } = await supabase
        .from('clienti')
        .select('*')
        .eq('id', id!)
        .maybeSingle()
      if (error) throw error
      return data as Cliente | null
    },
  })
}

export function useCreateCliente() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (input: ClienteInput): Promise<Cliente> => {
      const { data, error } = await supabase
        .from('clienti')
        .insert(input)
        .select('*')
        .single()
      if (error) throw error
      return data as Cliente
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: KEY }),
  })
}

export function useUpdateCliente() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async ({
      id,
      input,
    }: {
      id: string
      input: Partial<ClienteInput>
    }): Promise<Cliente> => {
      const { data, error } = await supabase
        .from('clienti')
        .update(input)
        .eq('id', id)
        .select('*')
        .single()
      if (error) throw error
      return data as Cliente
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: KEY }),
  })
}

export function useDeleteCliente() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (id: string): Promise<void> => {
      const { error } = await supabase.from('clienti').delete().eq('id', id)
      if (error) throw error
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: KEY }),
  })
}
