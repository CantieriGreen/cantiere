import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import type { Ruolo } from '@/lib/types'

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
