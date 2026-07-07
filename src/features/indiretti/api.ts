import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import type {
  AnteprimaRipartizione,
  CategoriaIndiretto,
  CostoIndiretto,
  CostoIndirettoInput,
  DriverRipartizione,
  RipartizionePeriodo,
} from '@/lib/types'

const KEY = ['indiretti'] as const

export type CostoIndirettoConCategoria = CostoIndiretto & {
  categoria?: { nome: string } | null
  fornitore?: { ragione_sociale: string } | null
}

export function useCategorieIndiretto() {
  return useQuery({
    queryKey: ['categorie-indiretto'],
    queryFn: async (): Promise<CategoriaIndiretto[]> => {
      const { data, error } = await supabase
        .from('categorie_indiretto')
        .select('*')
        .order('nome', { ascending: true })
      if (error) throw error
      return (data ?? []) as CategoriaIndiretto[]
    },
    staleTime: 5 * 60 * 1000,
  })
}

export function useCostiIndiretti(periodo: { inizio: string; fine: string }) {
  return useQuery({
    queryKey: [...KEY, 'costi', periodo],
    queryFn: async (): Promise<CostoIndirettoConCategoria[]> => {
      const { data, error } = await supabase
        .from('costi_indiretti')
        .select('*, categoria:categorie_indiretto(nome), fornitore:fornitori(ragione_sociale)')
        .gte('data', periodo.inizio)
        .lte('data', periodo.fine)
        .order('data', { ascending: false })
      if (error) throw error
      return (data ?? []) as CostoIndirettoConCategoria[]
    },
  })
}

export function useCreateCostoIndiretto() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (input: CostoIndirettoInput): Promise<CostoIndiretto> => {
      const { data, error } = await supabase
        .from('costi_indiretti')
        .insert(input)
        .select('*')
        .single()
      if (error) throw error
      return data as CostoIndiretto
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: [...KEY, 'costi'] }),
  })
}

export function useUpdateCostoIndiretto() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async ({
      id,
      input,
    }: {
      id: string
      input: Partial<CostoIndirettoInput>
    }): Promise<CostoIndiretto> => {
      const { data, error } = await supabase
        .from('costi_indiretti')
        .update(input)
        .eq('id', id)
        .select('*')
        .single()
      if (error) throw error
      return data as CostoIndiretto
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: [...KEY, 'costi'] }),
  })
}

export function useDeleteCostoIndiretto() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (id: string): Promise<void> => {
      const { error } = await supabase
        .from('costi_indiretti')
        .delete()
        .eq('id', id)
      if (error) throw error
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: [...KEY, 'costi'] }),
  })
}

// Crea un costo ammortizzato su N mesi (genera N rate mensili)
export function useCreaAmmortamento() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (p: {
      categoria_id: string | null
      fornitore_id: string | null
      descrizione: string
      importo_totale: number
      data_inizio: string
      mesi: number
      note: string | null
    }): Promise<string> => {
      const { data, error } = await supabase.rpc(
        'crea_costo_indiretto_ammortizzato',
        {
          p_categoria_id: p.categoria_id,
          p_fornitore_id: p.fornitore_id,
          p_descrizione: p.descrizione,
          p_importo_totale: p.importo_totale,
          p_data_inizio: p.data_inizio,
          p_mesi: p.mesi,
          p_note: p.note,
        }
      )
      if (error) throw error
      return data as string
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: [...KEY, 'costi'] }),
  })
}

// Elimina un intero piano di ammortamento (tutte le rate)
export function useEliminaAmmortamento() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (ammortamentoId: string): Promise<number> => {
      const { data, error } = await supabase.rpc('elimina_ammortamento', {
        p_ammortamento_id: ammortamentoId,
      })
      if (error) throw error
      return data as number
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: [...KEY, 'costi'] }),
  })
}

// Anteprima pesi ripartizione (driver) per il periodo
export function useAnteprimaRipartizione(
  periodo: { inizio: string; fine: string },
  driver: DriverRipartizione,
  enabled: boolean
) {
  return useQuery({
    queryKey: [...KEY, 'anteprima', periodo, driver],
    enabled: enabled && driver !== 'percentuale_manuale',
    queryFn: async (): Promise<AnteprimaRipartizione[]> => {
      const { data, error } = await supabase.rpc('anteprima_ripartizione', {
        p_inizio: periodo.inizio,
        p_fine: periodo.fine,
        p_driver: driver,
      })
      if (error) throw error
      return (data ?? []) as AnteprimaRipartizione[]
    },
  })
}

// Elenco cantieri (per modalità manuale) — riusa la RPC con un driver qualsiasi
export function useCantieriRipartibili(periodo: { inizio: string; fine: string }) {
  return useQuery({
    queryKey: [...KEY, 'cantieri-ripartibili', periodo],
    queryFn: async (): Promise<AnteprimaRipartizione[]> => {
      const { data, error } = await supabase.rpc('anteprima_ripartizione', {
        p_inizio: periodo.inizio,
        p_fine: periodo.fine,
        p_driver: 'ricavi',
      })
      if (error) throw error
      return (data ?? []) as AnteprimaRipartizione[]
    },
  })
}

export function useRipartizionePeriodo(periodo: {
  inizio: string
  fine: string
}) {
  return useQuery({
    queryKey: [...KEY, 'ripartizione', periodo],
    queryFn: async (): Promise<RipartizionePeriodo | null> => {
      const { data, error } = await supabase.rpc('ripartizione_periodo', {
        p_inizio: periodo.inizio,
        p_fine: periodo.fine,
      })
      if (error) throw error
      const row = Array.isArray(data) ? data[0] : data
      return (row as RipartizionePeriodo) ?? null
    },
  })
}

export function useApplicaRipartizione() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (params: {
      inizio: string
      fine: string
      driver: DriverRipartizione
      righe: { cantiere_id: string; percentuale: number; importo: number }[]
    }): Promise<string> => {
      const { data, error } = await supabase.rpc('applica_ripartizione', {
        p_inizio: params.inizio,
        p_fine: params.fine,
        p_driver: params.driver,
        p_righe: params.righe,
      })
      if (error) throw error
      return data as string
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: KEY })
      qc.invalidateQueries({ queryKey: ['cantieri'] })
    },
  })
}
