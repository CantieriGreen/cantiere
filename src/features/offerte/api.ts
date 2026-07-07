import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/lib/auth'
import type {
  Offerta,
  OffertaMateriale,
  OffertaPagamento,
  OffertaRevisione,
  StatoOfferta,
} from '@/lib/types'

const KEY = ['offerte'] as const

export type OffertaConCliente = Offerta & {
  cliente?: { ragione_sociale: string } | null
}

export type OffertaCompleta = Offerta & {
  cliente?: { ragione_sociale: string } | null
  materiali: OffertaMateriale[]
  pagamenti: OffertaPagamento[]
  revisioni: OffertaRevisione[]
}

export type OffertaFormData = {
  titolo: string
  data: string
  cliente_id: string | null
  cliente_nome: string | null
  localita: string | null
  cantiere_id: string | null
  tipo: string | null
  categoria: string | null
  superficie_mq: number | null
  piani: number | null
  struttura: string | null
  finiture: string | null
  garanzia: string | null
  durata_mesi: number | null
  importo: number
  oneri_sicurezza: number
  tempistiche: string | null
  esclusioni: string | null
  note: string | null
  materiali: OffertaMateriale[]
  pagamenti: OffertaPagamento[]
}

export function useOfferte() {
  return useQuery({
    queryKey: KEY,
    queryFn: async (): Promise<OffertaConCliente[]> => {
      const { data, error } = await supabase
        .from('offerte')
        .select('*, cliente:clienti(ragione_sociale)')
        .order('anno', { ascending: false })
        .order('progressivo', { ascending: false })
      if (error) throw error
      return (data ?? []) as OffertaConCliente[]
    },
  })
}

export function useOfferta(id: string | undefined) {
  return useQuery({
    queryKey: [...KEY, id],
    enabled: !!id && id !== 'new',
    queryFn: async (): Promise<OffertaCompleta | null> => {
      const { data, error } = await supabase
        .from('offerte')
        .select('*, cliente:clienti(ragione_sociale)')
        .eq('id', id!)
        .maybeSingle()
      if (error) throw error
      if (!data) return null

      const [matRes, pagRes, revRes] = await Promise.all([
        supabase.from('offerta_materiali').select('*').eq('offerta_id', id!).order('ord'),
        supabase.from('offerta_pagamenti').select('*').eq('offerta_id', id!).order('ord'),
        supabase.from('offerta_revisioni').select('*').eq('offerta_id', id!).order('revisione'),
      ])
      if (matRes.error) throw matRes.error
      if (pagRes.error) throw pagRes.error
      if (revRes.error) throw revRes.error

      return {
        ...(data as OffertaCompleta),
        materiali: (matRes.data ?? []) as OffertaMateriale[],
        pagamenti: (pagRes.data ?? []) as OffertaPagamento[],
        revisioni: (revRes.data ?? []) as OffertaRevisione[],
      }
    },
  })
}

async function replaceRighe(offertaId: string, form: OffertaFormData) {
  await supabase.from('offerta_materiali').delete().eq('offerta_id', offertaId)
  await supabase.from('offerta_pagamenti').delete().eq('offerta_id', offertaId)

  if (form.materiali.length) {
    const { error } = await supabase.from('offerta_materiali').insert(
      form.materiali.map((m, i) => ({
        offerta_id: offertaId,
        tipo: m.tipo,
        descrizione: m.descrizione,
        importo: m.importo,
        ricarico_pct: m.ricarico_pct,
        ord: i,
      }))
    )
    if (error) throw error
  }
  if (form.pagamenti.length) {
    const { error } = await supabase.from('offerta_pagamenti').insert(
      form.pagamenti.map((p, i) => ({
        offerta_id: offertaId,
        percentuale: p.percentuale,
        descrizione: p.descrizione,
        ord: i,
      }))
    )
    if (error) throw error
  }
}

function offertaFields(form: OffertaFormData) {
  return {
    titolo: form.titolo,
    data: form.data,
    cliente_id: form.cliente_id,
    cliente_nome: form.cliente_nome,
    localita: form.localita,
    cantiere_id: form.cantiere_id,
    tipo: form.tipo,
    categoria: form.categoria,
    superficie_mq: form.superficie_mq,
    piani: form.piani,
    struttura: form.struttura,
    finiture: form.finiture,
    garanzia: form.garanzia,
    durata_mesi: form.durata_mesi,
    importo: form.importo,
    oneri_sicurezza: form.oneri_sicurezza,
    tempistiche: form.tempistiche,
    esclusioni: form.esclusioni,
    note: form.note,
  }
}

export function useCreateOfferta() {
  const qc = useQueryClient()
  const { user, profile } = useAuth()
  return useMutation({
    mutationFn: async (form: OffertaFormData): Promise<Offerta> => {
      const anno = new Date().getFullYear()
      const { data: prog, error: progErr } = await supabase.rpc(
        'prossimo_progressivo_offerta',
        { p_anno: anno }
      )
      if (progErr) throw progErr

      const { data, error } = await supabase
        .from('offerte')
        .insert({
          ...offertaFields(form),
          anno,
          progressivo: prog as number,
          revisione: 1,
          stato: 'inviata',
          created_by: user?.id ?? null,
        })
        .select('*')
        .single()
      if (error) throw error
      const offerta = data as Offerta

      await supabase.from('offerta_revisioni').insert({
        offerta_id: offerta.id,
        revisione: 1,
        autore: profile?.nome ?? null,
        nota: 'Prima emissione',
      })
      await replaceRighe(offerta.id, form)
      return offerta
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: KEY }),
  })
}

export function useUpdateOfferta() {
  const qc = useQueryClient()
  const { profile } = useAuth()
  return useMutation({
    mutationFn: async (params: {
      id: string
      form: OffertaFormData
      nuovaRevisione?: boolean
      notaRevisione?: string
      revisioneCorrente: number
    }): Promise<void> => {
      const fields: Record<string, unknown> = offertaFields(params.form)

      if (params.nuovaRevisione) {
        const nuovaRev = params.revisioneCorrente + 1
        fields.revisione = nuovaRev
        const { error } = await supabase
          .from('offerte')
          .update(fields)
          .eq('id', params.id)
        if (error) throw error
        await supabase.from('offerta_revisioni').insert({
          offerta_id: params.id,
          revisione: nuovaRev,
          autore: profile?.nome ?? null,
          nota: params.notaRevisione || `Revisione ${nuovaRev}`,
        })
      } else {
        const { error } = await supabase
          .from('offerte')
          .update(fields)
          .eq('id', params.id)
        if (error) throw error
      }
      await replaceRighe(params.id, params.form)
    },
    onSuccess: (_d, vars) => {
      qc.invalidateQueries({ queryKey: KEY })
      qc.invalidateQueries({ queryKey: [...KEY, vars.id] })
    },
  })
}

export function useCambiaStatoOfferta() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async ({
      id,
      stato,
    }: {
      id: string
      stato: StatoOfferta
    }): Promise<void> => {
      const { error } = await supabase
        .from('offerte')
        .update({ stato })
        .eq('id', id)
      if (error) throw error
    },
    onSuccess: (_d, vars) => {
      qc.invalidateQueries({ queryKey: KEY })
      qc.invalidateQueries({ queryKey: [...KEY, vars.id] })
    },
  })
}

export function useDeleteOfferta() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (id: string): Promise<void> => {
      const { error } = await supabase.from('offerte').delete().eq('id', id)
      if (error) throw error
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: KEY }),
  })
}

// Converte un'offerta accettata in un cantiere commessa
export function useConvertiInCantiere() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (offerta: Offerta): Promise<string> => {
      const anno = new Date().getFullYear()
      const prefix = `CANT-${anno}-`
      const { data: last } = await supabase
        .from('cantieri')
        .select('codice')
        .like('codice', `${prefix}%`)
        .order('codice', { ascending: false })
        .limit(1)
      let next = 1
      if (last && last.length) {
        const n = parseInt((last[0] as { codice: string }).codice.slice(prefix.length), 10)
        if (Number.isFinite(n)) next = n + 1
      }
      const codice = `${prefix}${String(next).padStart(3, '0')}`

      const { data: cant, error } = await supabase
        .from('cantieri')
        .insert({
          codice,
          nome: offerta.titolo,
          cliente_id: offerta.cliente_id,
          citta: offerta.localita,
          stato: 'pianificato',
          valore_contratto: offerta.importo,
          manutenzione: false,
        })
        .select('id, codice')
        .single()
      if (error) throw error

      await supabase
        .from('offerte')
        .update({
          cantiere_id: (cant as { id: string }).id,
          commessa_creata: (cant as { codice: string }).codice,
        })
        .eq('id', offerta.id)

      return (cant as { codice: string }).codice
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: KEY })
      qc.invalidateQueries({ queryKey: ['cantieri'] })
    },
  })
}
