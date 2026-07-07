import { useQuery } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'

export type SearchResult = {
  id: string
  label: string
  sub: string
  to: string
  group: 'Cantieri' | 'Clienti' | 'Fornitori' | 'Dipendenti' | 'Offerte'
  icon: string
}

export function useGlobalSearch(query: string) {
  const q = query.trim()
  return useQuery({
    queryKey: ['global-search', q],
    enabled: q.length >= 2,
    queryFn: async (): Promise<SearchResult[]> => {
      const like = `%${q}%`
      const [cant, cli, forn, dip, off] = await Promise.all([
        supabase
          .from('cantieri')
          .select('id, codice, nome')
          .or(`codice.ilike.${like},nome.ilike.${like}`)
          .limit(5),
        supabase
          .from('clienti')
          .select('id, ragione_sociale, citta')
          .ilike('ragione_sociale', like)
          .limit(5),
        supabase
          .from('fornitori')
          .select('id, ragione_sociale, categoria')
          .ilike('ragione_sociale', like)
          .limit(5),
        supabase
          .from('dipendenti')
          .select('id, nome, cognome, mansione')
          .or(`nome.ilike.${like},cognome.ilike.${like}`)
          .limit(5),
        supabase
          .from('offerte')
          .select('id, numero, titolo')
          .or(`numero.ilike.${like},titolo.ilike.${like}`)
          .limit(5),
      ])

      const results: SearchResult[] = []

      ;(cant.data ?? []).forEach((c) => {
        const r = c as { id: string; codice: string; nome: string }
        results.push({
          id: r.id,
          label: r.nome,
          sub: r.codice,
          to: `/cantieri/${r.id}`,
          group: 'Cantieri',
          icon: 'hard-hat',
        })
      })
      ;(cli.data ?? []).forEach((c) => {
        const r = c as { id: string; ragione_sociale: string; citta: string | null }
        results.push({
          id: r.id,
          label: r.ragione_sociale,
          sub: r.citta ?? 'Cliente',
          to: `/anagrafiche/clienti/${r.id}`,
          group: 'Clienti',
          icon: 'building',
        })
      })
      ;(forn.data ?? []).forEach((c) => {
        const r = c as { id: string; ragione_sociale: string; categoria: string | null }
        results.push({
          id: r.id,
          label: r.ragione_sociale,
          sub: r.categoria ?? 'Fornitore',
          to: `/anagrafiche/fornitori/${r.id}`,
          group: 'Fornitori',
          icon: 'truck',
        })
      })
      ;(dip.data ?? []).forEach((c) => {
        const r = c as { id: string; nome: string; cognome: string; mansione: string | null }
        results.push({
          id: r.id,
          label: `${r.nome} ${r.cognome}`,
          sub: r.mansione ?? 'Dipendente',
          to: `/anagrafiche/dipendenti/${r.id}`,
          group: 'Dipendenti',
          icon: 'user',
        })
      })
      ;(off.data ?? []).forEach((c) => {
        const r = c as { id: string; numero: string; titolo: string }
        results.push({
          id: r.id,
          label: r.titolo,
          sub: r.numero,
          to: `/offerte/${r.id}`,
          group: 'Offerte',
          icon: 'file-pen',
        })
      })

      return results
    },
    staleTime: 10_000,
  })
}
