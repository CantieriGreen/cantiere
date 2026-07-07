import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'

export type Azienda = {
  id: boolean
  ragione_sociale: string
  forma_giuridica: string | null
  partita_iva: string | null
  codice_fiscale: string | null
  codice_sdi: string | null
  sede_legale: string | null
  citta: string | null
  provincia: string | null
  cap: string | null
  telefono: string | null
  email: string | null
  pec: string | null
  iban: string | null
  rea: string | null
  logo_url: string | null
  addon_offerte: boolean
  addon_manutenzione: boolean
  updated_at: string
}

export type AziendaInput = Partial<Omit<Azienda, 'id' | 'updated_at'>>

export function useAzienda() {
  return useQuery({
    queryKey: ['azienda'],
    queryFn: async (): Promise<Azienda | null> => {
      const { data, error } = await supabase
        .from('azienda')
        .select('*')
        .eq('id', true)
        .maybeSingle()
      if (error) throw error
      return data as Azienda | null
    },
    staleTime: 5 * 60 * 1000,
  })
}

// Flag addon (sezioni a pagamento)
export function useAddon() {
  const { data, isLoading } = useAzienda()
  return {
    loading: isLoading,
    offerte: data?.addon_offerte ?? false,
    manutenzione: data?.addon_manutenzione ?? false,
  }
}

export function useUpdateAzienda() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (input: AziendaInput): Promise<Azienda> => {
      const { data, error } = await supabase
        .from('azienda')
        .update(input)
        .eq('id', true)
        .select('*')
        .single()
      if (error) throw error
      return data as Azienda
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['azienda'] }),
  })
}
