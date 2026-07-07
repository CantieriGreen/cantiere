import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import type {
  Cantiere,
  CantiereInput,
  CantiereMargini,
} from '@/lib/types'

const KEY = ['cantieri'] as const

export type CantiereConMargini = Cantiere & {
  cliente?: { ragione_sociale: string } | null
  margini?: CantiereMargini
}

export function useCantieri() {
  return useQuery({
    queryKey: KEY,
    queryFn: async (): Promise<CantiereConMargini[]> => {
      const [cantRes, margRes] = await Promise.all([
        supabase
          .from('cantieri')
          .select('*, cliente:clienti(ragione_sociale)')
          .order('codice', { ascending: false }),
        supabase.from('v_cantiere_margini').select('*'),
      ])
      if (cantRes.error) throw cantRes.error
      if (margRes.error) throw margRes.error

      const margini = new Map<string, CantiereMargini>()
      ;(margRes.data ?? []).forEach((m) =>
        margini.set((m as CantiereMargini).cantiere_id, m as CantiereMargini)
      )
      return (cantRes.data ?? []).map((c) => ({
        ...(c as CantiereConMargini),
        margini: margini.get((c as Cantiere).id),
      }))
    },
  })
}

export function useCantiere(id: string | undefined) {
  return useQuery({
    queryKey: [...KEY, id],
    enabled: !!id,
    queryFn: async (): Promise<CantiereConMargini | null> => {
      const { data, error } = await supabase
        .from('cantieri')
        .select('*, cliente:clienti(ragione_sociale)')
        .eq('id', id!)
        .maybeSingle()
      if (error) throw error
      if (!data) return null
      const { data: marg } = await supabase
        .from('v_cantiere_margini')
        .select('*')
        .eq('cantiere_id', id!)
        .maybeSingle()
      return {
        ...(data as CantiereConMargini),
        margini: (marg as CantiereMargini) ?? undefined,
      }
    },
  })
}

export function useProssimoCodiceCantiere() {
  return useQuery({
    queryKey: [...KEY, 'prossimo-codice'],
    queryFn: async (): Promise<string> => {
      const anno = new Date().getFullYear()
      const prefix = `CANT-${anno}-`
      const { data, error } = await supabase
        .from('cantieri')
        .select('codice')
        .like('codice', `${prefix}%`)
        .order('codice', { ascending: false })
        .limit(1)
      if (error) throw error
      let next = 1
      if (data && data.length > 0) {
        const last = (data[0] as { codice: string }).codice
        const n = parseInt(last.slice(prefix.length), 10)
        if (Number.isFinite(n)) next = n + 1
      }
      return `${prefix}${String(next).padStart(3, '0')}`
    },
    staleTime: 0,
  })
}

export function useCreateCantiere() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (input: CantiereInput): Promise<Cantiere> => {
      const { data, error } = await supabase
        .from('cantieri')
        .insert(input)
        .select('*')
        .single()
      if (error) throw error
      return data as Cantiere
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: KEY }),
  })
}

export function useUpdateCantiere() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async ({
      id,
      input,
    }: {
      id: string
      input: Partial<CantiereInput>
    }): Promise<Cantiere> => {
      const { data, error } = await supabase
        .from('cantieri')
        .update(input)
        .eq('id', id)
        .select('*')
        .single()
      if (error) throw error
      return data as Cantiere
    },
    onSuccess: (_d, vars) => {
      qc.invalidateQueries({ queryKey: KEY })
      qc.invalidateQueries({ queryKey: [...KEY, vars.id] })
    },
  })
}

export function useDeleteCantiere() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (id: string): Promise<void> => {
      const { error } = await supabase.from('cantieri').delete().eq('id', id)
      if (error) throw error
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: KEY }),
  })
}

export type QuotaIndiretto = {
  id: string
  percentuale: number
  importo: number
  ripartizione: {
    periodo_inizio: string
    periodo_fine: string
    driver: string
    applicata_at: string | null
  } | null
}

export function useQuoteIndiretti(cantiereId: string | undefined) {
  return useQuery({
    queryKey: ['cantiere-indiretti', cantiereId],
    enabled: !!cantiereId,
    queryFn: async (): Promise<QuotaIndiretto[]> => {
      const { data, error } = await supabase
        .from('ripartizione_indiretto_righe')
        .select(
          'id, percentuale, importo, ripartizione:ripartizioni_indiretto(periodo_inizio, periodo_fine, driver, applicata_at)'
        )
        .eq('cantiere_id', cantiereId!)
      if (error) throw error
      return (data ?? []) as unknown as QuotaIndiretto[]
    },
  })
}

// Toggle rapido del flag manutenzione (usato dalla lista)
export function useToggleManutenzione() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async ({
      id,
      manutenzione,
    }: {
      id: string
      manutenzione: boolean
    }): Promise<void> => {
      const { error } = await supabase
        .from('cantieri')
        .update({ manutenzione })
        .eq('id', id)
      if (error) throw error
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: KEY }),
  })
}
