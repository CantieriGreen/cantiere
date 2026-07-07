import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/lib/auth'
import type { RapportinoInput, RapportinoOre } from '@/lib/types'

const KEY = ['rapportini'] as const

export type RapportinoConDettagli = RapportinoOre & {
  cantiere?: { codice: string; nome: string } | null
  dipendente?: { nome: string; cognome: string; mansione: string | null } | null
  costo_ore?: number
  costo_totale?: number
}

type ListParams = { cantiereId?: string }

export function useRapportini(params: ListParams = {}) {
  return useQuery({
    queryKey: [...KEY, params],
    queryFn: async (): Promise<RapportinoConDettagli[]> => {
      let q = supabase
        .from('rapportini_ore')
        .select(
          '*, cantiere:cantieri(codice, nome), dipendente:dipendenti(nome, cognome, mansione)'
        )
        .order('data', { ascending: false })
      if (params.cantiereId) q = q.eq('cantiere_id', params.cantiereId)

      const [rapRes, costRes] = await Promise.all([
        q,
        supabase
          .from('v_rapportino_costo')
          .select('id, costo_ore, costo_totale'),
      ])
      if (rapRes.error) throw rapRes.error
      if (costRes.error) throw costRes.error

      const costi = new Map<string, { costo_ore: number; costo_totale: number }>()
      ;(costRes.data ?? []).forEach((c) => {
        const row = c as { id: string; costo_ore: number; costo_totale: number }
        costi.set(row.id, { costo_ore: row.costo_ore, costo_totale: row.costo_totale })
      })

      return (rapRes.data ?? []).map((r) => {
        const row = r as RapportinoConDettagli
        const c = costi.get(row.id)
        return { ...row, costo_ore: c?.costo_ore, costo_totale: c?.costo_totale }
      })
    },
  })
}

export function useRapportino(id: string | undefined) {
  return useQuery({
    queryKey: [...KEY, 'one', id],
    enabled: !!id,
    queryFn: async (): Promise<RapportinoOre | null> => {
      const { data, error } = await supabase
        .from('rapportini_ore')
        .select('*')
        .eq('id', id!)
        .maybeSingle()
      if (error) throw error
      return data as RapportinoOre | null
    },
  })
}

// Tariffa valida per un dipendente a una certa data (per il calcolo costo live)
export function useTariffaAllaData(
  dipendenteId: string | undefined,
  data: string | undefined
) {
  return useQuery({
    queryKey: ['tariffa-alla-data', dipendenteId, data],
    enabled: !!dipendenteId && !!data,
    queryFn: async (): Promise<{ costo_ord: number; costo_str: number } | null> => {
      const { data: rows, error } = await supabase.rpc(
        'tariffa_oraria_valida',
        { p_dipendente_id: dipendenteId!, p_data: data! }
      )
      if (error) throw error
      const row = Array.isArray(rows) ? rows[0] : rows
      return row ? { costo_ord: row.costo_ord, costo_str: row.costo_str } : null
    },
  })
}

export function useCreateRapportino() {
  const qc = useQueryClient()
  const { user } = useAuth()
  return useMutation({
    mutationFn: async (input: RapportinoInput): Promise<RapportinoOre> => {
      const { data, error } = await supabase
        .from('rapportini_ore')
        .insert({ ...input, created_by: user?.id ?? null })
        .select('*')
        .single()
      if (error) throw error
      return data as RapportinoOre
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: KEY })
      qc.invalidateQueries({ queryKey: ['cantieri'] })
    },
  })
}

export function useUpdateRapportino() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async ({
      id,
      input,
    }: {
      id: string
      input: Partial<RapportinoInput>
    }): Promise<RapportinoOre> => {
      const { data, error } = await supabase
        .from('rapportini_ore')
        .update(input)
        .eq('id', id)
        .select('*')
        .single()
      if (error) throw error
      return data as RapportinoOre
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: KEY })
      qc.invalidateQueries({ queryKey: ['cantieri'] })
    },
  })
}

export function useDeleteRapportino() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (id: string): Promise<void> => {
      const { error } = await supabase
        .from('rapportini_ore')
        .delete()
        .eq('id', id)
      if (error) throw error
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: KEY })
      qc.invalidateQueries({ queryKey: ['cantieri'] })
    },
  })
}
